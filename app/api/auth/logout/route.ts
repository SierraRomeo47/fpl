import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("fpl_session_id")?.value;

        // Clear the HTTP-only cookie
        const response = NextResponse.json({ success: true, message: "Logged out successfully" });
        
        response.cookies.set("fpl_session_id", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0, // Expire immediately
        });

        // Also clear the simple session store (for the /api/session/create route)
        // This is in-memory, so it will clear on server restart anyway
        // But we could add a clear method if needed

        return response;
    } catch (error) {
        console.error("Logout route error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to logout" },
            { status: 500 }
        );
    }
}

