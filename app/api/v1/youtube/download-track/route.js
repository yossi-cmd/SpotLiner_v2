import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import { put } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_PATH || "./uploads/audio";
const EXTERNAL_API_URL = process.env.YT_DLP_API_URL?.replace(/\/$/, "");
const EXTERNAL_API_KEY = process.env.YT_DLP_API_KEY;

async function downloadViaExternalApi(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `${EXTERNAL_API_URL}/download`;
  const headers = {
    "Content-Type": "application/json",
    ...(EXTERNAL_API_KEY && {
      "X-API-Key": EXTERNAL_API_KEY,
      Authorization: `Bearer ${EXTERNAL_API_KEY}`,
    }),
  };
  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, format: "mp3", options: {} }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Download API returned ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const disposition = res.headers.get("Content-Disposition");
  const extMatch = disposition?.match(/filename="?[^"]*\.(\w+)"?/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".mp3";
  return { buffer, ext };
}

function runYtDlp(videoId, outputDir) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const outTemplate = path.join(outputDir, "%(id)s.%(ext)s");
    const proc = spawn(
      "yt-dlp",
      [
        "-x",
        "--audio-format",
        "mp3",
        "--no-playlist",
        "-o",
        outTemplate,
        url,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(new Error("yt-dlp not found. Install it: https://github.com/yt-dlp/yt-dlp"));
      } else {
        reject(err);
      }
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
  });
}

function findDownloadedFile(dir) {
  const names = fs.readdirSync(dir);
  const file = names.find((n) => /\.(mp3|m4a|webm|opus)$/i.test(n));
  return file ? path.join(dir, file) : null;
}

export async function POST(request) {
  try {
    const { userId } = await requireRole(request, ["admin", "uploader"]);
    const body = await request.json();
    const { videoId, title, artist_id, album_id, image_path } = body;

    if (!videoId || !title) {
      return NextResponse.json(
        { error: "videoId and title required" },
        { status: 400 }
      );
    }

    const artistId = artist_id != null ? parseInt(artist_id, 10) : null;
    if (!artistId) {
      return NextResponse.json(
        { error: "artist_id required" },
        { status: 400 }
      );
    }

    const artistRow = await query("SELECT id, name FROM artists WHERE id = $1", [artistId]);
    if (!artistRow.rows.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 400 });
    }
    const artistName = artistRow.rows[0].name;

    let albumId = null;
    let albumName = "";
    if (album_id != null) {
      const al = await query(
        "SELECT id, name, artist_id FROM albums WHERE id = $1",
        [parseInt(album_id, 10)]
      );
      if (al.rows.length && al.rows[0].artist_id === artistId) {
        albumId = al.rows[0].id;
        albumName = al.rows[0].name;
      }
    }

    let buffer;
    let ext = ".mp3";

    if (EXTERNAL_API_URL) {
      try {
        const result = await downloadViaExternalApi(videoId);
        buffer = result.buffer;
        ext = result.ext;
      } catch (err) {
        console.error("External yt-dlp API error:", err);
        return NextResponse.json(
          { error: err.message || "Download failed" },
          { status: 502 }
        );
      }
    } else {
      const tempDir = path.join(
        os.tmpdir(),
        `spotliner-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        await runYtDlp(videoId, tempDir);
      } catch (err) {
        try {
          fs.rmSync(tempDir, { recursive: true });
        } catch {}
        const msg = err.message || "Download failed";
        const status = msg.includes("not found") ? 503 : 400;
        return NextResponse.json({ error: msg }, { status });
      }

      const downloadedPath = findDownloadedFile(tempDir);
      if (!downloadedPath || !fs.existsSync(downloadedPath)) {
        try {
          fs.rmSync(tempDir, { recursive: true });
        } catch {}
        return NextResponse.json(
          { error: "yt-dlp did not produce an audio file" },
          { status: 500 }
        );
      }
      buffer = fs.readFileSync(downloadedPath);
      ext = path.extname(downloadedPath) || ".mp3";
      try {
        fs.rmSync(tempDir, { recursive: true });
      } catch {}
    }

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    let filePathForDb;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(
        `audio/${uniqueName}`,
        new Blob([buffer], { type: "audio/mpeg" }),
        {
          access: "public",
          addRandomSuffix: true,
        }
      );
      filePathForDb = blob.url;
    } else {
      const dir = path.join(process.cwd(), UPLOAD_DIR);
      fs.mkdirSync(dir, { recursive: true });
      const destPath = path.join(dir, uniqueName);
      fs.writeFileSync(destPath, buffer);
      filePathForDb = uniqueName;
    }

    const result = await query(
      `INSERT INTO tracks (title, artist, album, artist_id, album_id, duration_seconds, file_path, uploaded_by, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, artist, album, duration_seconds, created_at, image_path`,
      [
        (title || "—").trim(),
        artistName,
        albumName,
        artistId,
        albumId,
        0,
        filePathForDb,
        userId,
        image_path || null,
      ]
    );
    const track = result.rows[0];
    return NextResponse.json(track, { status: 201 });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("YouTube download error:", err);
    return NextResponse.json(
      { error: err.message || "Download failed" },
      { status: 500 }
    );
  }
}
