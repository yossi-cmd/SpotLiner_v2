import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const { userId } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 100);
    const r = await query(
      `SELECT id, track_id, artist_id, artist_name, track_title, uploader_name, recipient_name, sent_at
       FROM push_notification_log WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2`,
      [userId, limit]
    );
    return NextResponse.json({ notifications: r.rows });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
