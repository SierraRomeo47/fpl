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

        const { transfersIn, transfersOut, event } = await req.json();

        if (!transfersIn || !transfersOut || transfersIn.length !== transfersOut.length) {
            return NextResponse.json(
                { success: false, error: "Invalid transfer data" },
                { status: 400 }
            );
        }

        const client = new FPLClient({ cookies: session.fpl_cookie });

        // Build transfers array
        const transfers = transfersIn.map((playerIn: any, index: number) => ({
            element_in: playerIn.id,
            element_out: transfersOut[index].id,
            purchase_price: playerIn.now_cost,
            selling_price: transfersOut[index].selling_price,
        }));

        // Make transfer request
        const result = await client.makeTransfer(session.entryId!, {
            chip: null,
            entry: session.entryId,
            event: event,
            transfers: transfers,
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error("[Transfer Error]:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to make transfer" },
            { status: 500 }
        );
    }
}
