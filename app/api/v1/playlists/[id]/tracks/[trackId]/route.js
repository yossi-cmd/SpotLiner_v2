import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const { id, trackId } = params;
    const r = await query(
      "DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2 AND playlist_id IN (SELECT id FROM playlists WHERE user_id = $3) RETURNING 1",
      [id, trackId, userId]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: "Track not in playlist or playlist not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to remove track" },
      { status: 500 }
    );
  }
}
