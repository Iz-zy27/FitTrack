import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import StartWorkoutButton from "@/components/StartWorkoutButton";
import SignOutButtonMobile from "@/components/SignOutButtonMobile";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: recent }, { count: weekCount }, { count: setCount }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user!.id).single(),
      supabase
        .from("workouts")
        .select("id, title, workout_date, sets(count)")
        .eq("user_id", user!.id)
        .order("workout_date", { ascending: false })
        .limit(5),
      supabase
        .from("workouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("workout_date", isoDaysAgo(7)),
      supabase
        .from("sets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())
    ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {profile?.display_name ?? "Athlete"}
          </h1>
        </div>
        <SignOutButtonMobile />
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="eyebrow">Workouts · 7 days</p>
          <p className="stat-num text-5xl text-signal mt-1">{weekCount ?? 0}</p>
        </div>
        <div className="card">
          <p className="eyebrow">Sets logged · 7 days</p>
          <p className="stat-num text-5xl mt-1">{setCount ?? 0}</p>
        </div>
      </section>

      <StartWorkoutButton />

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow">Recent workouts</h2>
          <Link href="/history" className="text-sm text-signal hover:underline">View all</Link>
        </div>
        {!recent?.length ? (
          <div className="card text-center py-10">
            <p className="font-display text-xl font-semibold">No workouts yet</p>
            <p className="text-dust text-sm mt-1">Start your first session above — it takes one tap.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((w) => (
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
    </div>
  );
}

function isoDaysAgo(n: number) {
  const d = new Date(Date.now() - n * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
