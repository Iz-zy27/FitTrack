import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { PersonalRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FriendPage({ params }: { params: { ownerId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const myEmail = (user!.email ?? "").toLowerCase();

  // Confirm this owner actually shared with me (RLS also enforces this on every query below)
  const { data: share } = await supabase
    .from("friend_shares")
    .select("*")
    .eq("owner_id", params.ownerId)
    .eq("friend_email", myEmail)
    .eq("status", "accepted")
    .maybeSingle();

  if (!share) notFound();

  const { data: owner } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", params.ownerId)
    .maybeSingle();

  const [{ data: workouts }, { data: records }] = await Promise.all([
    share.can_view_workouts
      ? supabase
          .from("workouts")
          .select("id, title, workout_date, sets(count)")
          .eq("user_id", params.ownerId)
          .order("workout_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    share.can_view_records
      ? supabase
          .from("personal_records")
          .select("*")
          .eq("user_id", params.ownerId)
          .order("best_weight", { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  const name = owner?.display_name || owner?.email || "Friend";

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Shared with you</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{name}’s training</h1>
        <p className="text-dust text-sm mt-1">Read-only. {name} controls what you can see.</p>
      </header>

      {share.can_view_records && (records as PersonalRecord[])?.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Personal records</h2>
          <ul className="space-y-2">
            {(records as PersonalRecord[]).map((r) => (
              <li key={r.exercise_id} className="card flex items-center justify-between gap-4">
                <p className="font-semibold truncate">{r.exercise_name}</p>
                <p className="stat-num text-2xl text-gold shrink-0">
                  {Number(r.best_weight)}
                  <span className="text-xs font-sans font-normal text-dust ml-1">lb × {r.reps_at_best}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {share.can_view_workouts && (
        <section>
          <h2 className="eyebrow mb-2">Recent workouts</h2>
          {!workouts?.length ? (
            <div className="card text-dust text-sm">No workouts logged yet.</div>
          ) : (
            <ul className="space-y-2">
              {workouts.map((w) => (
                <li key={w.id}>
                  <Link href={`/workouts/${w.id}`}
                    className="card flex items-center justify-between hover:border-dust transition-colors">
                    <div>
                      <p className="font-semibold">{w.title}</p>
                      <p className="text-dust text-sm">{formatDate(w.workout_date)}</p>
                    </div>
                    <span className="stat-num text-2xl text-dust">
                      {(w.sets as unknown as { count: number }[])?.[0]?.count ?? 0}
                      <span className="text-xs font-sans font-normal ml-1">sets</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
