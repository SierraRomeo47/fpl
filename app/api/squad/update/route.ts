import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { FPLClient } from "@/lib/fpl-client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { picks } = body;

        if (!picks || !Array.isArray(picks)) {
            return NextResponse.json({ success: false, error: "Invalid picks format" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const sessionId = cookieStore.get("fpl_session")?.value;
        if (!sessionId) {
            return NextResponse.json({ success: false, error: "No active session" }, { status: 401 });
        }

        const authData = await getSession(sessionId);
        if (!authData) {
            return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
        }
        if (!authData.fpl_cookie) {
            return NextResponse.json({ success: false, error: "Write-access is restricted. Please log in using your FPL Email and Password instead of Read-Only Mode." }, { status: 403 });
        }

        const fpl = new FPLClient({ cookies: authData.fpl_cookie });
        const me = await fpl.getMe();
        if (!me || !me.player || !me.player.entry) {
            return NextResponse.json({ success: false, error: "Failed to get FPL entry ID" }, { status: 500 });
        }

        const entryId = me.player.entry;

        // FPL API requires updating the squad by sending the entire picks array
        // structured exactly as it comes down but with the reordered positions.
        const response = await fpl.updateSquad(entryId, { picks });
        
        return NextResponse.json({ success: true, message: "Formation updated successfully" });
    } catch (error: any) {
        console.error("[Squad Update API Error]", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update formation" },
            { status: 500 }
        );
    }
}
