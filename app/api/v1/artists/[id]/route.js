import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getTracksListSelect } from "@/lib/tracks";

export async function GET(request, { params }) {
  try {
    const id = params.id;
    const artist = await query(
      "SELECT id, name, image_path, created_by, created_at FROM artists WHERE id = $1",
      [id]
    );
    if (!artist.rows.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    const tracks = await query(
      `${getTracksListSelect()} WHERE t.artist_id = $1 ORDER BY t.title`,
      [id]
    );
    const albums = await query(
      "SELECT id, name, image_path FROM albums WHERE artist_id = $1 ORDER BY name",
      [id]
    );
    return NextResponse.json({
      ...artist.rows[0],
      tracks: tracks.rows,
      albums: albums.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    const id = params.id;
    const body = await request.json();
    const name = body.name?.trim();
    const hasImagePath = Object.prototype.hasOwnProperty.call(body, "image_path");
    const imagePathClause = hasImagePath ? ", image_path = $3" : "";
    const paramsArr = hasImagePath ? [id, name, body.image_path] : [id, name];
    const r = await query(
      `UPDATE artists SET name = COALESCE($2, name)${imagePathClause} WHERE id = $1 RETURNING id, name, image_path`,
      paramsArr
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    return NextResponse.json(r.rows[0]);
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update artist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    const id = params.id;
    const r = await query("DELETE FROM artists WHERE id = $1 RETURNING id", [id]);
    if (!r.rows.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete artist" },
      { status: 500 }
    );
  }
}
