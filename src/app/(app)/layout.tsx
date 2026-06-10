import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh pb-24 md:pb-8 md:pt-20">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 pt-4">{children}</main>
    </div>
  );
}
