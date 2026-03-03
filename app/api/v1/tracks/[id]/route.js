import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { optionalAuth, requireAuth } from "@/lib/auth";
import { getTracksListSelect } from "@/lib/tracks";
import path from "path";
import fs from "fs";
import { del } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_PATH || "./uploads/audio";

export async function GET(request, { params }) {
  try {
    optionalAuth(request);
    const id = params.id;
    const result = await query(
      `${getTracksListSelect()} WHERE t.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId, userRole } = await requireAuth(request);
    const id = params.id;
    const trackRes = await query(
      "SELECT id, title, artist_id, album_id, uploaded_by FROM tracks WHERE id = $1",
      [id]
    );
    if (!trackRes.rows.length) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    const track = trackRes.rows[0];
    const canEdit = userRole === "admin" || track.uploaded_by === userId;
    if (!canEdit) {
      return NextResponse.json(
        { error: "Cannot edit this track" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, artist_id, album_id, image_path, featured_artist_ids, lyrics_text } = body;
    let artistId = track.artist_id;
    let albumId = track.album_id;

    if (artist_id != null) {
      const a = await query("SELECT id FROM artists WHERE id = $1", [
        artist_id,
      ]);
      if (!a.rows.length) {
        return NextResponse.json({ error: "Artist not found" }, { status: 400 });
      }
      artistId = artist_id;
    }
    if (album_id != null) {
      const al = await query(
        "SELECT id, artist_id FROM albums WHERE id = $1",
        [album_id]
      );
      if (!al.rows.length) {
        return NextResponse.json({ error: "Album not found" }, { status: 400 });
      }
      albumId = album_id;
    }

    const newTitle =
      title != null && title !== undefined ? String(title).trim() : track.title;
    if (!newTitle) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    const lyricsValue =
      lyrics_text !== undefined
        ? (lyrics_text == null || lyrics_text === "" ? null : String(lyrics_text).trim())
        : undefined;
    await query(
      lyricsValue !== undefined
        ? "UPDATE tracks SET title = $1, artist_id = $2, album_id = $3, image_path = $4, lyrics_text = $5 WHERE id = $6"
        : "UPDATE tracks SET title = $1, artist_id = $2, album_id = $3, image_path = $4 WHERE id = $5",
      lyricsValue !== undefined
        ? [newTitle, artistId, albumId, image_path ?? null, lyricsValue || null, id]
        : [newTitle, artistId, albumId, image_path ?? null, id]
    );

    await query("DELETE FROM track_featured_artists WHERE track_id = $1", [
      id,
    ]);
    const featuredIds = Array.isArray(featured_artist_ids)
      ? featured_artist_ids
          .map((id) => parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const uniqueFeatured = [...new Set(featuredIds)].filter((id) => id !== artistId);
    for (let i = 0; i < uniqueFeatured.length; i++) {
      const aid = uniqueFeatured[i];
      const a = await query("SELECT id FROM artists WHERE id = $1", [aid]);
      if (a.rows.length) {
        await query(
          "INSERT INTO track_featured_artists (track_id, artist_id, position) VALUES ($1, $2, $3)",
          [id, aid, i]
        );
      }
    }

    const r = await query(
      `${getTracksListSelect()} WHERE t.id = $1`,
      [id]
    );
    return NextResponse.json(r.rows[0]);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update track" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId, userRole } = await requireAuth(request);
    const id = params.id;
    const trackRes = await query(
      "SELECT id, file_path, uploaded_by FROM tracks WHERE id = $1",
      [id]
    );
    if (!trackRes.rows.length) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    const track = trackRes.rows[0];
    const canDelete = userRole === "admin" || track.uploaded_by === userId;
    if (!canDelete) {
      return NextResponse.json(
        { error: "Cannot delete this track" },
        { status: 403 }
      );
    }
    await query("DELETE FROM tracks WHERE id = $1", [id]);
    const fp = track.file_path;
    if (fp.startsWith("http://") || fp.startsWith("https://")) {
      try {
        await del(fp);
      } catch (e) {
        console.warn("Could not delete blob:", fp, e.message);
      }
    } else {
      const filePath = path.join(
        process.cwd(),
        UPLOAD_DIR,
        path.basename(fp)
      );
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("Could not delete track file:", filePath, e.message);
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete track" },
      { status: 500 }
    );
  }
}
