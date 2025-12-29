import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session-store";
import { FPLClient } from "@/lib/fpl-client";

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("fpl_session_id")?.value;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        const session = await getSession(sessionId);
        if (!session) {
            return NextResponse.json(
                { success: false, error: "Session not found" },
                { status: 401 }
            );
        }

        const { captainId, viceCaptainId } = await req.json();

        if (!captainId) {
            return NextResponse.json(
                { success: false, error: "Captain ID is required" },
                { status: 400 }
            );
        }

        // Get current team data
        const client = new FPLClient({ cookies: session.fpl_cookie });
        const myTeam = await client.getMyTeam(session.entryId!);

        // Update picks with new captain
        const updatedPicks = myTeam.picks.map((pick: any) => ({
            ...pick,
            is_captain: pick.element === captainId,
            is_vice_captain: viceCaptainId ? pick.element === viceCaptainId : pick.is_vice_captain,
        }));

        // Send update to FPL API
        const result = await client.updateSquad(session.entryId!, {
            picks: updatedPicks,
            chip: null,
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error("[Captain Change Error]:", error);
        
        // Determine appropriate status code
        const statusCode = error?.status || 
                          error?.message?.includes('401') ? 401 :
                          error?.message?.includes('403') ? 403 :
                          error?.message?.includes('400') ? 400 : 500;
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || "Failed to update captain",
                details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: statusCode }
        );
    }
}
