import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const id = params.id;
    const body = await request.json();
    const trackId = body.trackId;
    if (!trackId) {
      return NextResponse.json(
        { error: "trackId required" },
        { status: 400 }
      );
    }
    const pl = await query(
      "SELECT id FROM playlists WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (!pl.rows.length) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }
    const maxPos = await query(
      "SELECT COALESCE(MAX(position), 0) + 1 AS p FROM playlist_tracks WHERE playlist_id = $1",
      [id]
    );
    const pos =
      typeof body.position === "number"
        ? body.position
        : maxPos.rows[0].p;
    await query(
      "INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1, $2, $3) ON CONFLICT (playlist_id, track_id) DO NOTHING",
      [id, trackId, pos]
    );
    return NextResponse.json({ added: true }, { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to add track" },
      { status: 500 }
    );
  }
}
