import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { optionalAuth, requireRole } from "@/lib/auth";
import { getTracksListSelect } from "@/lib/tracks";
import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_PATH || "./uploads/audio";

export async function GET(request) {
  try {
    optionalAuth(request);
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 100);
    const offset = parseInt(searchParams.get("offset"), 10) || 0;

    const baseSelect = getTracksListSelect();
    let result;
    if (q) {
      result = await query(
        `${baseSelect}
         WHERE t.title ILIKE $1
           OR a.name ILIKE $1
           OR al.name ILIKE $1
         ORDER BY t.created_at DESC
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, limit, offset]
      );
    } else {
      result = await query(
        `${baseSelect} ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }
    return NextResponse.json({ tracks: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await requireRole(request, ["admin", "uploader"]);
    const formData = await request.formData();
    const file = formData.get("audio");
    const title = (formData.get("title") || "").trim();
    const artistIdParam = formData.get("artist_id");
    const albumIdParam = formData.get("album_id");
    const duration = parseInt(formData.get("duration_seconds"), 10) || 0;
    const trackImagePath = formData.get("image_path");

    if (!file || !title) {
      return NextResponse.json(
        { error: "No audio file uploaded or title required" },
        { status: 400 }
      );
    }

    let artistId = artistIdParam ? parseInt(artistIdParam, 10) : null;
    let albumId = null;

    if (artistId) {
      const a = await query("SELECT id FROM artists WHERE id = $1", [
        artistId,
      ]);
      if (!a.rows.length) {
        return NextResponse.json({ error: "Artist not found" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Artist required (select or enter)" },
        { status: 400 }
      );
    }

    if (albumIdParam) {
      const al = await query(
        "SELECT id, artist_id FROM albums WHERE id = $1",
        [parseInt(albumIdParam, 10)]
      );
      if (al.rows.length && al.rows[0].artist_id === artistId) {
        albumId = al.rows[0].id;
      }
    }

    let filePathForDb;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const ext =
        path.extname(file.name) ||
        (file.type?.startsWith("audio/") ? ".mp3" : ".mp3");
      const pathname = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: true,
        multipart: true,
      });
      filePathForDb = blob.url;
    } else {
      const dir = path.join(process.cwd(), UPLOAD_DIR);
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {}
      const ext =
        path.extname(file.name) ||
        (file.type?.startsWith("audio/") ? ".mp3" : ".mp3");
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(dir, filename);
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(bytes));
      filePathForDb = filename;
    }

    const insertRes = await query(
      `INSERT INTO tracks (title, artist_id, album_id, duration_seconds, file_path, uploaded_by, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        title,
        artistId,
        albumId,
        duration,
        filePathForDb,
        userId,
        trackImagePath || null,
      ]
    );
    const newId = insertRes.rows[0].id;
    const result = await query(
      `${getTracksListSelect()} WHERE t.id = $1`,
      [newId]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
