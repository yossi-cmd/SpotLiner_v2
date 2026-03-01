import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getTracksListSelect } from "@/lib/tracks";

export async function GET(request, { params }) {
  try {
    const id = params.id;
    const album = await query(
      `SELECT al.id, al.name, al.artist_id, al.image_path, a.name AS artist_name
       FROM albums al JOIN artists a ON a.id = al.artist_id WHERE al.id = $1`,
      [id]
    );
    if (!album.rows.length) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    const tracks = await query(
      `${getTracksListSelect()} WHERE t.album_id = $1 ORDER BY t.title`,
      [id]
    );
    return NextResponse.json({
      ...album.rows[0],
      tracks: tracks.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch album" },
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
    const artist_id = body.artist_id;
    const image_path = body.image_path !== undefined ? body.image_path : undefined;
    const r = await query(
      "UPDATE albums SET name = COALESCE($2, name), artist_id = COALESCE($3, artist_id), image_path = COALESCE($4, image_path) WHERE id = $1 RETURNING id, name, artist_id, image_path",
      [id, name, artist_id, image_path]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(r.rows[0]);
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update album" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    const id = params.id;
    const r = await query("DELETE FROM albums WHERE id = $1 RETURNING id", [id]);
    if (!r.rows.length) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
