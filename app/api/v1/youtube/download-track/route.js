import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function POST(request) {
  try {
    await requireRole(request, ["admin", "uploader"]);
    const body = await request.json();
    const { videoId, title } = body;
    if (!videoId || !title) {
      return NextResponse.json(
        { error: "videoId and title required" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "YouTube download: implement with ytdl or similar" },
      { status: 501 }
    );
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
