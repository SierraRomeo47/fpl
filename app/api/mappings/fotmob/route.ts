import { NextRequest, NextResponse } from "next/server";
import { readFotmobMapping, upsertFotmobMapping } from "@/lib/external/mappings";

export async function GET() {
  const map = await readFotmobMapping();
  return NextResponse.json({ mapping: map });
}

export async function POST(req: NextRequest) {
  // Hard stop in production unless you explicitly open this up later.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const fplId = Number(body?.fplId);
    const fotmobId = Number(body?.fotmobId);

    if (!Number.isFinite(fplId) || !Number.isFinite(fotmobId)) {
      return NextResponse.json({ error: "fplId and fotmobId must be numbers" }, { status: 400 });
    }

    const mapping = await upsertFotmobMapping(fplId, fotmobId);
    return NextResponse.json({ success: true, mapping });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update mapping" },
      { status: 500 }
    );
  }
}

