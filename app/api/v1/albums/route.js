import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 100);
    const offset = parseInt(searchParams.get("offset"), 10) || 0;
    const artistId = searchParams.get("artist_id");
    let r;
    if (artistId) {
      r = await query(
        `SELECT al.id, al.name, al.artist_id, al.image_path, a.name AS artist_name
         FROM albums al JOIN artists a ON a.id = al.artist_id
         WHERE al.artist_id = $1 ORDER BY al.name LIMIT $2 OFFSET $3`,
        [artistId, limit, offset]
      );
    } else {
      r = await query(
        `SELECT al.id, al.name, al.artist_id, al.image_path, a.name AS artist_name
         FROM albums al JOIN artists a ON a.id = al.artist_id
         ORDER BY al.name LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }
    return NextResponse.json({ albums: r.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const name = (body.name || "").trim();
    const artist_id = body.artist_id;
    const image_path = body.image_path || null;
    if (!name || !artist_id) {
      return NextResponse.json(
        { error: "Name and artist_id required" },
        { status: 400 }
      );
    }
    const r = await query(
      "INSERT INTO albums (name, artist_id, image_path) VALUES ($1, $2, $3) RETURNING id, name, artist_id, image_path, created_at",
      [name, artist_id, image_path]
    );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
