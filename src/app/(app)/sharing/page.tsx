import { createClient } from "@/lib/supabase/server";
import SharingManager from "@/components/SharingManager";
import type { FriendShare } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const myEmail = (user!.email ?? "").toLowerCase();

  const [{ data: sent }, { data: received }, { data: links }] = await Promise.all([
    supabase.from("friend_shares").select("*").eq("owner_id", user!.id).order("created_at"),
    supabase.from("friend_shares").select("*").eq("friend_email", myEmail).order("created_at"),
    supabase
      .from("share_links")
      .select("id, token, label, can_view_workouts, can_view_records, expires_at, created_at")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false })
  ]);

  // Names of owners who shared with me (profiles policy allows this read)
  const ownerIds = (received ?? []).map((r) => r.owner_id);
  const { data: ownerProfiles } = ownerIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", ownerIds)
    : { data: [] as { id: string; display_name: string | null; email: string }[] };

  return (
    <SharingManager
      sent={(sent ?? []) as FriendShare[]}
      received={(received ?? []) as FriendShare[]}
      ownerProfiles={ownerProfiles ?? []}
      links={links ?? []}
    />
  );
}
