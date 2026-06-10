"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/dashboard", label: "Train", icon: "M6.5 6.5h2v11h-2zm9 0h2v11h-2zM3 10h2v4H3zm16 0h2v4h-2zm-10.5 1h7v2h-7z" },
  { href: "/history", label: "History", icon: "M12 8v5l3.5 2 .75-1.23-2.75-1.62V8zM12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7z" },
  { href: "/records", label: "Records", icon: "M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z" },
  { href: "/sharing", label: "Friends", icon: "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 1c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4zM8 14c-.4 0-.8 0-1.2.1C5.1 14.7 2 15.9 2 17.5V19h4v-2c0-1.2.8-2.2 2-3z" }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-20 bg-ink/90 backdrop-blur border-b border-edge">
        <div className="mx-auto max-w-2xl w-full px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-xl font-bold tracking-tight">
            FIT<span className="text-signal">TRACK</span>
          </Link>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(t.href) ? "bg-steel text-signal" : "text-dust hover:text-chalk"
                }`}>
                {t.label}
              </Link>
            ))}
            <button onClick={signOut} className="px-3 py-1.5 text-sm text-dust hover:text-chalk">
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-ink/95 backdrop-blur border-t border-edge pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-signal" : "text-dust"
                }`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
