import { cookies } from "next/headers";
import { getSession } from "@/lib/session-store";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("fpl_session_id")?.value;

        if (!sessionId) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        const session = await getSession(sessionId);

        if (!session) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        return NextResponse.json({
            entryId: session.entryId,
            hasSession: true
        });
    } catch (error) {
        console.error('[Session API] Error:', error);
        return NextResponse.json({ error: "Session check failed" }, { status: 401 });
    }
}
