"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is enabled in Supabase, there's no session yet.
    if (!data.session) {
      setNeedsConfirm(true);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirm) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="card max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Check your inbox</h1>
          <p className="text-dust text-sm">
            We sent a confirmation link to <span className="text-chalk">{email}</span>.
            Confirm your email, then sign in.
          </p>
          <Link href="/login" className="btn-primary w-full mt-4">Go to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-4xl font-bold tracking-tight">
            FIT<span className="text-signal">TRACK</span>
          </div>
          <p className="text-dust mt-2 text-sm">Create your private training log</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="name" className="eyebrow mb-1.5 block">Display name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Alex" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email" className="eyebrow mb-1.5 block">Email</label>
            <input id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="eyebrow mb-1.5 block">Password</label>
            <input id="password" type="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" />
          </div>
          {error && <p className="text-ember text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-dust mt-4">
          Already training with us?{" "}
          <Link href="/login" className="text-signal hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
