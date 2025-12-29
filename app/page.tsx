
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session-store";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("fpl_session_id")?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
