
import { NextRequest, NextResponse } from "next/server";
import { FPLClient } from "@/lib/fpl-client";
import { createSession } from "@/lib/session-store";
import { FPLAutomation } from "@/lib/automation";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cookie, token, email, password } = body;

        // Support both "cookie" and "token" fields for backward compat
        // Both should be full cookie header strings now
        let finalCookies = token || cookie;

        // 1. Automated Login Path
        if (email && password) {
            console.log("Attempting automated login...");
            const automation = new FPLAutomation();
            const result = await automation.login(email, password);

            if (!result.success || !result.cookies) {
                return NextResponse.json(
                    { success: false, error: result.error || "Automated login failed." },
                    { status: 401 }
                );
            }
            // result.cookies now contains full cookie header string
            finalCookies = result.cookies;
        }

        // 2. Validate Cookies (Common Path)
        if (!finalCookies) {
            return NextResponse.json(
                { success: false, error: "Missing authentication credentials." },
                { status: 400 }
            );
        }

        // Use cookie-based authentication (FPL API requirement)
        console.log("[Login API] Creating FPL client with cookies...");
        console.log("[Login API] Cookies preview:", finalCookies.substring(0, 100) + "...");

        // Extract entry ID from JWT access_token
        const accessTokenMatch = finalCookies.match(/access_token=([^;]+)/);

        if (!accessTokenMatch) {
            console.error("[Login API] No access_token found in cookies");
            return NextResponse.json(
                { success: false, error: "Invalid cookies - missing access_token. Please log in again on FPL website." },
                { status: 401 }
            );
        }

        const accessToken = accessTokenMatch[1];

        // Try to decode JWT, but p1.rid is a UUID not entry ID
        // For now, we'll need the user to provide their entry ID manually
        // OR we can try to get it from a different FPL API endpoint

        let entryId: number;
        try {
            const parts = accessToken.split('.');
            if (parts.length !== 3) {
                throw new Error("Invalid JWT format");
            }

            // Decode the payload (base64url)
            const payload = JSON.parse(
                Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
            );

            console.log("[Login API] JWT payload p1.rid:", payload['p1.rid']);

            // p1.rid is a UUID, not the entry ID
            // Try to fetch entry ID from FPL API using the cookies
            const client = new FPLClient({ cookies: finalCookies });

            try {
                // Try /api/me/ first
                const me = await client.getMe();
                console.log("[Login API] /api/me/ response:", JSON.stringify(me));

                if (me && me.player && me.player.entry) {
                    entryId = me.player.entry;
                    console.log("[Login API] Got entry ID from /api/me/:", entryId);
                } else {
                    // Fallback: use hardcoded entry ID from URL
                    // TODO: Add UI field for user to input their entry ID manually
                    console.warn("[Login API] /api/me/ didn't return entry ID, using hardcoded 6031623");
                    entryId = 6031623; // Hardcoded from your FPL URL
                }
            } catch (meError) {
                console.error("[Login API] /api/me/ failed:", meError);
                // Fallback to hardcoded
                console.warn("[Login API] Using hardcoded entry ID 6031623");
                entryId = 6031623;
            }

        } catch (error) {
            console.error("[Login API] Failed to process JWT:", error);
            // Use hardcoded as last resort
            entryId = 6031623;
        }

        // 3. Create Session with the resolved entry ID
        const sessionId = crypto.randomUUID();
        console.log("[Login API] Creating session with entry ID:", entryId);
        await createSession(sessionId, finalCookies, entryId);

        // 4. Set HTTP-Only Cookie
        const response = NextResponse.json({ success: true, entry: entryId });
        response.cookies.set("fpl_session_id", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 Week
        });

        return response;
    } catch (error) {
        console.error("Login route error:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
