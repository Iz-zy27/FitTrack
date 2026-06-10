"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Full body", "Cardio"];

type Props = {
  workout: Workout;
  initialSets: WorkoutSet[];
  initialExercises: Exercise[];
  prMap: Record<string, number>; // exercise_id -> best weight before edits
  readOnly?: boolean;
};

export default function WorkoutLogger({ workout, initialSets, initialExercises, prMap, readOnly }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(workout.title);
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exerciseById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  // Group sets by exercise, preserving the order exercises were first logged
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, WorkoutSet[]> = {};
    for (const s of sets) {
      if (!map[s.exercise_id]) {
        map[s.exercise_id] = [];
        order.push(s.exercise_id);
      }
      map[s.exercise_id].push(s);
    }
    return order.map((id) => ({ exerciseId: id, sets: map[id] }));
  }, [sets]);

  async function saveTitle() {
    if (readOnly || title === workout.title) return;
    await supabase.from("workouts").update({ title }).eq("id", workout.id);
  }

  async function deleteWorkout() {
    if (!confirm("Delete this workout and all its sets?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", workout.id);
    if (error) return setError(error.message);
    router.push("/history");
    router.refresh();
  }

  function addExerciseToWorkout(exerciseId: string) {
    setPickerOpen(false);
    // Opens a logging block for this exercise; it persists once the first set is saved.
    setActiveExerciseId(exerciseId);
  }

  async function logSet(exerciseId: string, weight: number, reps: number) {
    setError(null);
    const setNumber = sets.filter((s) => s.exercise_id === exerciseId).length + 1;
    const { data, error } = await supabase
      .from("sets")
      .insert({
        workout_id: workout.id,
        exercise_id: exerciseId,
        user_id: workout.user_id,
        set_number: setNumber,
        weight,
        reps
      })
      .select("*")
      .single();
    if (error || !data) return setError(error?.message ?? "Could not save set");
    setSets((prev) => [...prev, data as WorkoutSet]);
  }

  async function deleteSet(id: string) {
    const { error } = await supabase.from("sets").delete().eq("id", id);
    if (error) return setError(error.message);
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  async function createExercise(name: string, muscleGroup: string) {
    const { data, error } = await supabase
      .from("exercises")
      .insert({ user_id: workout.user_id, name: name.trim(), muscle_group: muscleGroup || null })
      .select("*")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Could not create exercise");
      return null;
    }
    setExercises((prev) => [...prev, data as Exercise].sort((a, b) => a.name.localeCompare(b.name)));
    return data as Exercise;
  }

  // Exercises shown as blocks: those with sets, plus the one being actively logged
  const blocks = useMemo(() => {
    const ids = grouped.map((g) => g.exerciseId);
    if (activeExerciseId && !ids.includes(activeExerciseId)) {
      return [...grouped, { exerciseId: activeExerciseId, sets: [] as WorkoutSet[] }];
    }
    return grouped;
  }, [grouped, activeExerciseId]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">{formatDate(workout.workout_date)}</p>
        {readOnly ? (
          <h1 className="font-display text-3xl font-bold">{title}</h1>
        ) : (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            aria-label="Workout title"
            className="font-display text-3xl font-bold !bg-transparent !border-0 !px-0 !py-0 !rounded-none focus:!ring-0 border-b !border-b-transparent focus:!border-b-edge"
          />
        )}
      </header>

      {error && <p className="text-ember text-sm">{error}</p>}

      {blocks.length === 0 && (
        <div className="card text-center py-10">
          <p className="font-display text-xl font-semibold">Empty session</p>
          <p className="text-dust text-sm mt-1">Add an exercise to start logging sets.</p>
        </div>
      )}

      {blocks.map(({ exerciseId, sets: exSets }) => {
        const ex = exerciseById[exerciseId];
        const prBefore = prMap[exerciseId] ?? 0;
        return (
          <section key={exerciseId} className="card">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="font-semibold text-lg">{ex?.name ?? "Exercise"}</h2>
                {ex?.muscle_group && <p className="text-dust text-xs">{ex.muscle_group}</p>}
              </div>
              <span className="eyebrow">{exSets.length} {exSets.length === 1 ? "set" : "sets"}</span>
            </div>

            {exSets.length > 0 && (
              <ul className="divide-y divide-edge/60 mb-3">
                {exSets.map((s, i) => {
                  const isPR = Number(s.weight) > prBefore;
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2">
                      <span className="w-7 h-7 shrink-0 grid place-items-center rounded-full bg-ink border border-edge text-xs font-semibold text-dust">
                        {i + 1}
                      </span>
                      <span className="stat-num text-2xl">
                        {Number(s.weight)}
                        <span className="text-xs font-sans font-normal text-dust ml-1">lb</span>
                      </span>
                      <span className="text-dust">×</span>
                      <span className="stat-num text-2xl">
                        {s.reps}
                        <span className="text-xs font-sans font-normal text-dust ml-1">reps</span>
                      </span>
                      {isPR && (
                        <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gold border border-gold/40 rounded-full px-2 py-0.5">
                          PR
                        </span>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => deleteSet(s.id)}
                          aria-label={`Delete set ${i + 1}`}
                          className="ml-auto text-dust hover:text-ember text-sm px-2"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {!readOnly && (
              <LogSetForm
                lastSet={exSets[exSets.length - 1]}
                onLog={(w, r) => logSet(exerciseId, w, r)}
              />
            )}
          </section>
        );
      })}

      {!readOnly && (
        <>
          <button onClick={() => setPickerOpen(true)} className="btn-ghost w-full py-3.5">
            + Add exercise
          </button>
          <button onClick={deleteWorkout} className="btn-danger w-full">
            Delete workout
          </button>
        </>
      )}

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onPick={addExerciseToWorkout}
          onCreate={async (name, group) => {
            const ex = await createExercise(name, group);
            if (ex) addExerciseToWorkout(ex.id);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- Set logging form: big numerals + plate steppers ---------- */

function LogSetForm({ lastSet, onLog }: { lastSet?: WorkoutSet; onLog: (w: number, r: number) => void }) {
  const [weight, setWeight] = useState<number>(lastSet ? Number(lastSet.weight) : 45);
  const [reps, setReps] = useState<number>(lastSet ? lastSet.reps : 8);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (reps < 1 || weight < 0) return;
    setBusy(true);
    await onLog(weight, reps);
    setBusy(false);
  }

  return (
    <div className="rounded-xl bg-ink border border-edge p-3">
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Weight (lb)" value={weight} step={5} min={0}
          onChange={setWeight} format={(v) => String(v)} />
        <Stepper label="Reps" value={reps} step={1} min={1}
          onChange={setReps} format={(v) => String(v)} />
      </div>
      <button onClick={submit} disabled={busy} className="btn-primary w-full mt-3">
        {busy ? "Saving…" : "Log set"}
      </button>
    </div>
  );
}

function Stepper({ label, value, step, min, onChange, format }: {
  label: string; value: number; step: number; min: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5 text-center">{label}</p>
      <div className="flex items-center justify-between gap-1">
        <button type="button" aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 shrink-0 rounded-full border border-edge text-dust hover:text-chalk hover:border-dust text-lg leading-none">
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={format(value)}
          min={min}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
          aria-label={label}
          className="stat-num !text-3xl text-center !bg-transparent !border-0 !p-0 focus:!ring-0 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="w-10 h-10 shrink-0 rounded-full border border-edge text-dust hover:text-chalk hover:border-dust text-lg leading-none">
          +
        </button>
      </div>
    </div>
  );
}

/* ---------- Exercise picker / creator ---------- */

function ExercisePicker({ exercises, onPick, onCreate, onClose }: {
  exercises: Exercise[];
  onPick: (id: string) => void;
  onCreate: (name: string, muscleGroup: string) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [group, setGroup] = useState("");
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-30 bg-ink/80 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Choose exercise">
      <div className="bg-steel border border-edge rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-edge">
          <input autoFocus placeholder="Search or name a new exercise…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="overflow-y-auto p-2 flex-1">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => onPick(e.id)}
              className="w-full text-left px-3 py-3 rounded-lg hover:bg-ink flex items-center justify-between">
              <span className="font-medium">{e.name}</span>
              <span className="text-dust text-xs">{e.muscle_group}</span>
            </button>
          ))}
          {query.trim() && !filtered.some((e) => e.name.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="px-3 py-3 space-y-2">
              <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Muscle group">
                <option value="">Muscle group (optional)</option>
                {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <button
                disabled={creating}
                onClick={async () => {
                  setCreating(true);
                  await onCreate(query.trim(), group);
                  setCreating(false);
                }}
                className="btn-primary w-full">
                {creating ? "Creating…" : `Create “${query.trim()}”`}
              </button>
            </div>
          )}
          {!filtered.length && !query.trim() && (
            <p className="text-dust text-sm text-center py-6">Type to search or create an exercise.</p>
          )}
        </div>
        <div className="p-3 border-t border-edge">
          <button onClick={onClose} className="btn-ghost w-full">Cancel</button>
        </div>
      </div>
    </div>
  );
}
