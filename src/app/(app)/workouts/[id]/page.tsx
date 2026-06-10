import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkoutLogger from "@/components/WorkoutLogger";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: workout }, { data: sets }, { data: exercises }, { data: prs }] =
    await Promise.all([
      supabase.from("workouts").select("*").eq("id", params.id).single(),
      supabase
        .from("sets")
        .select("*")
        .eq("workout_id", params.id)
        .order("created_at", { ascending: true }),
      supabase.from("exercises").select("*").eq("user_id", user!.id).order("name"),
      supabase.from("personal_records").select("exercise_id, best_weight").eq("user_id", user!.id)
    ]);

  if (!workout) notFound();

  const prMap: Record<string, number> = {};
  for (const pr of prs ?? []) prMap[pr.exercise_id] = Number(pr.best_weight);

  return (
    <WorkoutLogger
      workout={workout as Workout}
      initialSets={(sets ?? []) as WorkoutSet[]}
      initialExercises={(exercises ?? []) as Exercise[]}
      prMap={prMap}
      readOnly={workout.user_id !== user!.id}
    />
  );
}
