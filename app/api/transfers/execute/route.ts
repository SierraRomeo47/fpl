import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { FPLClient } from "@/lib/fpl-client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transfers, event, chip = null } = body;

        if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
            return NextResponse.json({ success: false, error: "No transfers provided" }, { status: 400 });
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

        const payload = {
            entry: me.player.entry,
            event: event,
            chip: chip,
            transfers: transfers,
        };

        const response = await fpl.makeTransfer(payload);
        
        return NextResponse.json({ success: true, message: "Transfers executed safely", data: response });
    } catch (error: any) {
        console.error("[Transfers Execute API Error]", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to execute transfers on FPL servers." },
            { status: 500 }
        );
    }
}
