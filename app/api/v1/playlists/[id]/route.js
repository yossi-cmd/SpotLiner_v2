import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const FEATURED_SUB = `(SELECT COALESCE(json_agg(json_build_object('id', fa.id, 'name', fa.name) ORDER BY tfa.position), '[]'::json) FROM track_featured_artists tfa JOIN artists fa ON fa.id = tfa.artist_id WHERE tfa.track_id = t.id)`;

export async function GET(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const id = params.id;
    const pl = await query(
      "SELECT id, user_id, name, is_public, created_at FROM playlists WHERE id = $1",
      [id]
    );
    if (!pl.rows.length) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }
    const p = pl.rows[0];
    if (p.user_id !== userId && !p.is_public) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tracks = await query(
      `SELECT t.id,
              t.title,
              a.name AS artist,
              al.name AS album,
              t.duration_seconds,
              t.artist_id,
              t.album_id,
              t.image_path,
              pt.position,
              COALESCE(t.image_path, al.image_path, a.image_path) AS cover_image_path,
              ${FEATURED_SUB} AS featured_artists
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       LEFT JOIN albums al ON t.album_id = al.id
       LEFT JOIN artists a ON t.artist_id = a.id
       WHERE pt.playlist_id = $1
       ORDER BY pt.position, pt.track_id`,
      [id]
    );
    return NextResponse.json({ ...p, tracks: tracks.rows });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const id = params.id;
    const body = await request.json();
    const name = body.name?.trim();
    const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : undefined;
    const r = await query(
      "UPDATE playlists SET name = COALESCE($2, name), is_public = COALESCE($3, is_public) WHERE id = $1 AND user_id = $4 RETURNING id, name, is_public",
      [id, name, isPublic, userId]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(r.rows[0]);
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update playlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const id = params.id;
    const r = await query(
      "DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (!r.rows.length) {
      return NextResponse.json(
        { error: "Playlist not found" },
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
      { error: "Failed to delete playlist" },
      { status: 500 }
    );
  }
}
