import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, title, workout_date, notes, sets(count)")
    .eq("user_id", user!.id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Group by month
  const months: { label: string; items: NonNullable<typeof workouts> }[] = [];
  for (const w of workouts ?? []) {
    const label = monthLabel(w.workout_date);
    const bucket = months.find((m) => m.label === label);
    if (bucket) bucket.items.push(w);
    else months.push({ label, items: [w] });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">History</h1>

      {!months.length && (
        <div className="card text-center py-12">
          <p className="font-display text-xl font-semibold">Nothing logged yet</p>
          <p className="text-dust text-sm mt-1">Your finished sessions will appear here by date.</p>
          <Link href="/dashboard" className="btn-primary mt-4">Start a workout</Link>
        </div>
      )}

      {months.map((m) => (
        <section key={m.label}>
          <h2 className="eyebrow mb-2">{m.label}</h2>
          <ul className="space-y-2">
            {m.items.map((w) => (
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
        </section>
      ))}
    </div>
  );
}
