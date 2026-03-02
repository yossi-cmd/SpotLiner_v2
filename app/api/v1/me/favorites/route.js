import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const FEATURED_SUB = `(SELECT COALESCE(json_agg(json_build_object('id', fa.id, 'name', fa.name) ORDER BY tfa.position), '[]'::json) FROM track_featured_artists tfa JOIN artists fa ON fa.id = tfa.artist_id WHERE tfa.track_id = t.id)`;

export async function GET(request) {
  try {
    const { userId } = await requireAuth(request);
    const r = await query(
      `SELECT t.id,
              t.title,
              a.name AS artist,
              al.name AS album,
              t.duration_seconds,
              t.created_at,
              t.artist_id,
              t.album_id,
              t.image_path,
              COALESCE(t.image_path, al.image_path, a.image_path) AS cover_image_path,
              ${FEATURED_SUB} AS featured_artists
       FROM favorites f
       JOIN tracks t ON t.id = f.track_id
       LEFT JOIN albums al ON t.album_id = al.id
       LEFT JOIN artists a ON t.artist_id = a.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return NextResponse.json({ tracks: r.rows });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
