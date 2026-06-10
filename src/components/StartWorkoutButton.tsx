"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";

export default function StartWorkoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: user!.id, title: "Workout", workout_date: todayISO() })
      .select("id")
      .single();
    if (error || !data) {
      setLoading(false);
      alert(error?.message ?? "Could not start workout");
      return;
    }
    router.push(`/workouts/${data.id}`);
  }

  return (
    <button onClick={start} disabled={loading}
      className="btn-primary w-full py-4 text-base font-display text-lg tracking-wide">
      {loading ? "Starting…" : "+ Start workout"}
    </button>
  );
}
