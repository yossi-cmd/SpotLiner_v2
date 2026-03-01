import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const FEATURED_SUB = `(SELECT COALESCE(json_agg(json_build_object('id', fa.id, 'name', fa.name) ORDER BY tfa.position), '[]'::json) FROM track_featured_artists tfa JOIN artists fa ON fa.id = tfa.artist_id WHERE tfa.track_id = t.id)`;

export async function GET(request) {
  try {
    const { userId } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 100);
    const r = await query(
      `SELECT t.id, t.title, t.artist, t.album, t.duration_seconds, t.artist_id, t.album_id, t.image_path, h.played_at,
       COALESCE(t.image_path, al.image_path, a.image_path) AS cover_image_path, ${FEATURED_SUB} AS featured_artists
       FROM play_history h JOIN tracks t ON t.id = h.track_id
       LEFT JOIN albums al ON t.album_id = al.id LEFT JOIN artists a ON t.artist_id = a.id
       WHERE h.user_id = $1 ORDER BY h.played_at DESC LIMIT $2`,
      [userId, limit]
    );
    return NextResponse.json({ tracks: r.rows });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const trackId = body.trackId;
    if (!trackId) {
      return NextResponse.json(
        { error: "trackId required" },
        { status: 400 }
      );
    }
    await query(
      "INSERT INTO play_history (user_id, track_id) VALUES ($1, $2)",
      [userId, trackId]
    );
    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to record history" },
      { status: 500 }
    );
  }
}
