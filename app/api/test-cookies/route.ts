import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { cookies } = await req.json();

        if (!cookies) {
            return NextResponse.json({ error: "No cookies" });
        }

        // Extract access_token from cookies
        const accessTokenMatch = cookies.match(/access_token=([^;]+)/);

        if (!accessTokenMatch) {
            return NextResponse.json({ error: "No access_token found in cookies" });
        }

        const accessToken = accessTokenMatch[1];

        // Decode JWT (it's split into 3 parts: header.payload.signature)
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
            return NextResponse.json({ error: "Invalid JWT format" });
        }

        // Decode the payload (base64url)
        const payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        );

        // Extract entry ID from p1.rid field
        const entryId = payload['p1.rid'];

        return NextResponse.json({
            success: true,
            payload,
            entryId,
            hasEntryId: !!entryId,
            method: "decoded from JWT access_token"
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
