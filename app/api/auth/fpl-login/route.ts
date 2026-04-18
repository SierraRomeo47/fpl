import { NextRequest, NextResponse } from "next/server";
import { request } from "undici";
import { createSession, encodeSessionCookie } from "@/lib/session-store";
import { cookies } from "next/headers";
import { FPLClient } from "@/lib/fpl-client";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { rawCookies } = body;

        if (!rawCookies) {
            return NextResponse.json({ success: false, error: "Raw session cookies are required" }, { status: 400 });
        }

        // Check if pl_profile exists (which confirms authentication success)
        if (!rawCookies.includes("pl_profile")) {
            return NextResponse.json({ success: false, error: "Invalid Cookie. Must contain 'pl_profile'." }, { status: 401 });
        }

        // 1. Fetch User Profile mapping to get entryId using the provided cookie
        let entryId = 0;
        let teamName = "My Team";
        let playerName = "Manager";

        const fpl = new FPLClient({ cookies: rawCookies });
        try {
            const me = await fpl.getMe();
            if (me && me.player) {
                entryId = me.player.entry;
                playerName = `${me.player.first_name || ""} ${me.player.last_name || ""}`.trim();
                teamName = me.player.entry_name || teamName;
            } else {
                throw new Error("Missing player data from /me/");
            }
        } catch (meError) {
            console.error("[FPL Auth] Failed to fetch /me/ data:", meError);
            return NextResponse.json({ success: false, error: "Authenticated successfully but failed to map active team ID. Have you set up your squad on the FPL site yet?" }, { status: 500 });
        }

        // 2. Persist the Session Locally 
        const sessionId = crypto.randomUUID();
        const session = await createSession(sessionId, rawCookies, entryId);
        const cookieValue = encodeSessionCookie(session);

        // 3. Set Next.js HTTP-Only Cookie linking to this Session ID
        const response = NextResponse.json({ 
            success: true, 
            message: "FPL Login Successful",
            data: { entryId, teamName, playerName }
        });

        const cookieOptions: any = {
            httpOnly: true,
            secure: false, // development compatible
            sameSite: "lax", 
            path: "/",
            maxAge: 60 * 60 * 24 * 7, 
        };

        response.cookies.set("fpl_session", cookieValue, cookieOptions);
        
        // Note: For backwards compatibility with the simplified mode fallback check
        response.cookies.set("fpl_session_id", cookieValue, cookieOptions);

        return response;

    } catch (error: any) {
        console.error("[AUTH ENDPOINT ERROR]", error);
        return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
    }
}
