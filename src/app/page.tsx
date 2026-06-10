import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login"); // middleware sends signed-in users to /dashboard
}
