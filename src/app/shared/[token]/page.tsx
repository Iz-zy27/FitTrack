"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Snapshot = {
  owner_name: string | null;
  label: string;
  workouts?: {
    id: string; title: string; workout_date: string; notes: string | null;
    sets: { exercise: string; set_number: number; weight: number; reps: number }[];
  }[];
  records?: { exercise: string; best_weight: number; est_one_rm: number }[];
};

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_shared_snapshot", {
      p_token: token,
      p_password: password
    });
    setLoading(false);
    if (error) {
      setError("That link or password didn’t work. Check both and try again.");
      return;
    }
    setSnapshot(data as Snapshot);
  }

  if (!snapshot) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="font-display text-3xl font-bold tracking-tight">
              FIT<span className="text-signal">TRACK</span>
            </div>
            <p className="text-dust mt-2 text-sm">Someone shared their training with you.</p>
          </div>
          <form onSubmit={unlock} className="card space-y-4">
            <div>
              <label htmlFor="pw" className="eyebrow mb-1.5 block">Viewing password</label>
              <input id="pw" type="password" required autoFocus
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the password you were given" />
            </div>
            {error && <p className="text-ember text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Unlocking…" : "View training"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="eyebrow">{snapshot.label}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {snapshot.owner_name ?? "Shared"}’s training
        </h1>
        <p className="text-dust text-sm mt-1">Read-only view shared via FitTrack.</p>
      </header>

      {snapshot.records && snapshot.records.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Personal records</h2>
          <ul className="space-y-2">
            {snapshot.records.map((r) => (
              <li key={r.exercise} className="card flex items-center justify-between gap-4">
                <p className="font-semibold truncate">{r.exercise}</p>
                <p className="stat-num text-2xl text-gold shrink-0">
                  {Number(r.best_weight)}
                  <span className="text-xs font-sans font-normal text-dust ml-1">
                    lb · est 1RM {Number(r.est_one_rm)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snapshot.workouts && snapshot.workouts.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Workouts</h2>
          <ul className="space-y-3">
            {snapshot.workouts.map((w) => (
              <li key={w.id} className="card">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-semibold">{w.title}</p>
                  <p className="text-dust text-xs">
                    {new Date(w.workout_date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </p>
                </div>
                <ul className="text-sm divide-y divide-edge/60">
                  {w.sets.map((s, i) => (
                    <li key={i} className="py-1.5 flex items-center justify-between">
                      <span className="text-dust">{s.exercise}</span>
                      <span className="stat-num text-lg">
                        {Number(s.weight)}
                        <span className="text-xs font-sans font-normal text-dust"> lb × </span>
                        {s.reps}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-dust text-xs pt-4">
        Want a log like this? <a href="/signup" className="text-signal hover:underline">Create your own on FitTrack</a>.
      </footer>
    </main>
  );
}
