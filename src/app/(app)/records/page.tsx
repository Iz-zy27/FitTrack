import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { PersonalRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("personal_records")
    .select("*")
    .eq("user_id", user!.id)
    .order("best_weight", { ascending: false });

  const records = (data ?? []) as PersonalRecord[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Personal records</h1>
        <p className="text-dust text-sm mt-1">Heaviest set per exercise, with estimated one-rep max.</p>
      </header>

      {!records.length ? (
        <div className="card text-center py-12">
          <p className="font-display text-xl font-semibold">No records yet</p>
          <p className="text-dust text-sm mt-1">Log a set and it becomes your first PR.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.exercise_id} className="card flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{r.exercise_name}</p>
                <p className="text-dust text-xs">
                  {r.muscle_group ? `${r.muscle_group} · ` : ""}{formatDate(r.achieved_on)}
                </p>
              </div>
              <div className="text-right">
                <p className="stat-num text-3xl text-gold leading-none">
                  {Number(r.best_weight)}
                  <span className="text-xs font-sans font-normal text-dust ml-1">lb × {r.reps_at_best}</span>
                </p>
                <p className="text-dust text-xs mt-1">est. 1RM {Number(r.est_one_rm)} lb</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
