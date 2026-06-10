"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { FriendShare } from "@/lib/types";

type OwnerProfile = { id: string; display_name: string | null; email: string };
type ShareLink = {
  id: string; token: string; label: string;
  can_view_workouts: boolean; can_view_records: boolean;
  expires_at: string | null; created_at: string;
};

export default function SharingManager({ sent, received, ownerProfiles, links }: {
  sent: FriendShare[];
  received: FriendShare[];
  ownerProfiles: OwnerProfile[];
  links: ShareLink[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  // --- Invite a friend by email ---
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkouts, setInviteWorkouts] = useState(true);
  const [inviteRecords, setInviteRecords] = useState(true);
  const [inviting, setInviting] = useState(false);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inviteWorkouts && !inviteRecords) {
      setError("Choose at least one thing to share.");
      return;
    }
    setInviting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("friend_shares").insert({
      owner_id: user!.id,
      friend_email: inviteEmail.trim().toLowerCase(),
      can_view_workouts: inviteWorkouts,
      can_view_records: inviteRecords
    });
    setInviting(false);
    if (error) {
      setError(error.code === "23505" ? "You already invited that email." : error.message);
      return;
    }
    setInviteEmail("");
    router.refresh();
  }

  async function updateShare(id: string, patch: Partial<FriendShare>) {
    const { error } = await supabase.from("friend_shares").update(patch).eq("id", id);
    if (error) setError(error.message);
    router.refresh();
  }

  async function removeShare(id: string) {
    const { error } = await supabase.from("friend_shares").delete().eq("id", id);
    if (error) setError(error.message);
    router.refresh();
  }

  async function respond(inviteId: string, accept: boolean) {
    const { error } = await supabase.rpc("respond_to_invite", { invite_id: inviteId, accept });
    if (error) setError(error.message);
    router.refresh();
  }

  // --- Password-protected links ---
  const [linkLabel, setLinkLabel] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linkWorkouts, setLinkWorkouts] = useState(true);
  const [linkRecords, setLinkRecords] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!linkWorkouts && !linkRecords) {
      setError("Choose at least one thing to share.");
      return;
    }
    setCreatingLink(true);
    const { data, error } = await supabase.rpc("create_share_link", {
      p_label: linkLabel,
      p_password: linkPassword,
      p_can_view_workouts: linkWorkouts,
      p_can_view_records: linkRecords
    });
    setCreatingLink(false);
    if (error) return setError(error.message);
    const token = Array.isArray(data) ? data[0]?.token : (data as { token: string })?.token;
    if (token) {
      setNewLinkUrl(`${window.location.origin}/shared/${token}`);
      setLinkLabel("");
      setLinkPassword("");
      router.refresh();
    }
  }

  async function revokeLink(id: string) {
    if (!confirm("Revoke this link? Anyone using it will lose access.")) return;
    const { error } = await supabase.from("share_links").delete().eq("id", id);
    if (error) setError(error.message);
    router.refresh();
  }

  const acceptedFromMe = sent.filter((s) => s.status === "accepted");
  const pendingFromMe = sent.filter((s) => s.status === "pending");
  const pendingForMe = received.filter((s) => s.status === "pending");
  const acceptedForMe = received.filter((s) => s.status === "accepted");
  const ownerName = (id: string) => {
    const p = ownerProfiles.find((o) => o.id === id);
    return p?.display_name || p?.email || "A friend";
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Friends &amp; sharing</h1>
        <p className="text-dust text-sm mt-1">
          Your data is private by default. Share exactly what you choose, and take it back any time.
        </p>
      </header>

      {error && <p className="text-ember text-sm">{error}</p>}

      {/* Invites addressed to me */}
      {pendingForMe.length > 0 && (
        <section className="card border-signal/40">
          <h2 className="eyebrow mb-3 text-signal">Invitations for you</h2>
          <ul className="space-y-3">
            {pendingForMe.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{ownerName(inv.owner_id)} wants to share their training</p>
                  <p className="text-dust text-xs">
                    {[inv.can_view_workouts && "workouts", inv.can_view_records && "records"]
                      .filter(Boolean).join(" + ")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => respond(inv.id, true)} className="btn-primary !px-3 !py-1.5">Accept</button>
                  <button onClick={() => respond(inv.id, false)} className="btn-ghost !px-3 !py-1.5">Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends sharing with me */}
      <section>
        <h2 className="eyebrow mb-2">Shared with you</h2>
        {!acceptedForMe.length ? (
          <div className="card text-dust text-sm">
            When a friend shares their training with you, it shows up here.
          </div>
        ) : (
          <ul className="space-y-2">
            {acceptedForMe.map((s) => (
              <li key={s.id}>
                <Link href={`/friends/${s.owner_id}`}
                  className="card flex items-center justify-between hover:border-dust transition-colors">
                  <div>
                    <p className="font-semibold">{ownerName(s.owner_id)}</p>
                    <p className="text-dust text-xs">
                      You can view their {[s.can_view_workouts && "workouts", s.can_view_records && "records"]
                        .filter(Boolean).join(" and ")}
                    </p>
                  </div>
                  <span className="text-signal text-sm">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite a friend */}
      <section className="card">
        <h2 className="eyebrow mb-3">Invite a friend by email</h2>
        <form onSubmit={sendInvite} className="space-y-3">
          <input type="email" required placeholder="friend@example.com"
            value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            aria-label="Friend's email" />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="!w-4 !h-4 accent-[#FFB454]"
                checked={inviteWorkouts} onChange={(e) => setInviteWorkouts(e.target.checked)} />
              Workouts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="!w-4 !h-4 accent-[#FFB454]"
                checked={inviteRecords} onChange={(e) => setInviteRecords(e.target.checked)} />
              Records
            </label>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={inviting}>
            {inviting ? "Sending…" : "Send invite"}
          </button>
          <p className="text-dust text-xs">
            Your friend sees the invite under Friends when they sign in with this email.
          </p>
        </form>

        {(pendingFromMe.length > 0 || acceptedFromMe.length > 0) && (
          <ul className="mt-4 divide-y divide-edge/60">
            {[...acceptedFromMe, ...pendingFromMe].map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.friend_email}</p>
                  <p className="text-dust text-xs">
                    {s.status === "pending" ? "Invite pending" : "Viewing"} ·{" "}
                    {[s.can_view_workouts && "workouts", s.can_view_records && "records"]
                      .filter(Boolean).join(" + ")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {s.status === "accepted" && (
                    <>
                      <Toggle on={s.can_view_workouts} label="Workouts"
                        onChange={(v) => updateShare(s.id, { can_view_workouts: v })} />
                      <Toggle on={s.can_view_records} label="Records"
                        onChange={(v) => updateShare(s.id, { can_view_records: v })} />
                    </>
                  )}
                  <button onClick={() => removeShare(s.id)} className="btn-danger !px-3 !py-1.5 text-xs">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Password-protected links */}
      <section className="card">
        <h2 className="eyebrow mb-1">Password-protected link</h2>
        <p className="text-dust text-xs mb-3">
          Anyone with the link and the password can view what you allow — no account needed.
        </p>
        <form onSubmit={createLink} className="space-y-3">
          <input placeholder="Label, e.g. “For my coach”" value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)} aria-label="Link label" />
          <input type="password" required minLength={6} placeholder="Viewing password (min 6 chars)"
            value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)}
            aria-label="Viewing password" autoComplete="new-password" />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="!w-4 !h-4 accent-[#FFB454]"
                checked={linkWorkouts} onChange={(e) => setLinkWorkouts(e.target.checked)} />
              Workouts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="!w-4 !h-4 accent-[#FFB454]"
                checked={linkRecords} onChange={(e) => setLinkRecords(e.target.checked)} />
              Records
            </label>
          </div>
          <button type="submit" className="btn-ghost w-full" disabled={creatingLink}>
            {creatingLink ? "Creating…" : "Create link"}
          </button>
        </form>

        {newLinkUrl && (
          <div className="mt-3 rounded-xl bg-ink border border-signal/40 p-3">
            <p className="eyebrow text-signal mb-1">Link created — copy it now</p>
            <p className="text-sm break-all">{newLinkUrl}</p>
            <button className="btn-primary w-full mt-2"
              onClick={() => navigator.clipboard.writeText(newLinkUrl)}>
              Copy link
            </button>
            <p className="text-dust text-xs mt-2">
              Share the password separately — it isn’t stored anywhere readable.
            </p>
          </div>
        )}

        {links.length > 0 && (
          <ul className="mt-4 divide-y divide-edge/60">
            {links.map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{l.label}</p>
                  <p className="text-dust text-xs break-all">
                    /shared/{l.token} ·{" "}
                    {[l.can_view_workouts && "workouts", l.can_view_records && "records"]
                      .filter(Boolean).join(" + ")}
                  </p>
                </div>
                <button onClick={() => revokeLink(l.id)} className="btn-danger !px-3 !py-1.5 text-xs shrink-0">
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-colors ${
        on ? "border-signal/50 text-signal" : "border-edge text-dust"
      }`}>
      {label}
    </button>
  );
}
