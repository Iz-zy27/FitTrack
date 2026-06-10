"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-4xl font-bold tracking-tight">
            FIT<span className="text-signal">TRACK</span>
          </div>
          <p className="text-dust mt-2 text-sm">Your training log. Your data.</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="eyebrow mb-1.5 block">Email</label>
            <input id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="eyebrow mb-1.5 block">Password</label>
            <input id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-ember text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-dust mt-4">
          New here?{" "}
          <Link href="/signup" className="text-signal hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
