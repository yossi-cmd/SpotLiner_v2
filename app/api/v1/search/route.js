import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTracksListSelect } from "@/lib/tracks";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return NextResponse.json({
        tracks: [],
        artists: [],
        albums: [],
      });
    }
    const pattern = `%${q}%`;
    const [tracksRes, artistsRes, albumsRes] = await Promise.all([
      query(
        `${getTracksListSelect()}
         WHERE t.title ILIKE $1
           OR a.name ILIKE $1
           OR al.name ILIKE $1
           OR t.lyrics_text ILIKE $1
         ORDER BY
           CASE
             WHEN t.title ILIKE $1 THEN 0
             WHEN a.name ILIKE $1 OR al.name ILIKE $1 THEN 1
             WHEN t.lyrics_text ILIKE $1 THEN 2
             ELSE 3
           END,
           t.created_at DESC
         LIMIT 20`,
        [pattern]
      ),
      query(
        "SELECT id, name, image_path FROM artists WHERE name ILIKE $1 ORDER BY name LIMIT 20",
        [pattern]
      ),
      query(
        `SELECT al.id, al.name, al.artist_id, al.image_path, a.name AS artist_name
         FROM albums al JOIN artists a ON a.id = al.artist_id
         WHERE al.name ILIKE $1 OR a.name ILIKE $1 ORDER BY al.name LIMIT 20`,
        [pattern]
      ),
    ]);
    return NextResponse.json({
      tracks: tracksRes.rows,
      artists: artistsRes.rows,
      albums: albumsRes.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
