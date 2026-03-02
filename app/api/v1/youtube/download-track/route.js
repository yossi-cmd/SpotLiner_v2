import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import { put } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_PATH || "./uploads/audio";
const raw = process.env.YT_DLP_API_URL?.replace(/\/$/, "") || "";
const EXTERNAL_API_URL = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
const EXTERNAL_API_KEY = process.env.YT_DLP_API_KEY;
const SPOTIFY_DOWNLOAD_PATH = process.env.YT_DLP_SPOTIFY_DOWNLOAD_PATH || "/spotify/download";

function isSpotifyUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /open\.spotify\.com\/track\//i.test(url.trim());
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    ...(EXTERNAL_API_KEY && {
      "X-API-Key": EXTERNAL_API_KEY,
      Authorization: `Bearer ${EXTERNAL_API_KEY}`,
    }),
  };
}

function parseApiError(text) {
  let message = text;
  try {
    const json = JSON.parse(text);
    const detail = json.detail || json.error || json.message;
    if (typeof detail === "string") message = detail;
  } catch {}
  if (
    message.includes("not available") ||
    message.includes("Private video") ||
    message.includes("Video unavailable")
  ) {
    message = "הסרטון לא זמין ב-YouTube (ייתכן שנמחק, פרטי או חסום).";
  }
  return message;
}

async function fetchFromExternalApi(apiPath, body = null) {
  const apiUrl = `${EXTERNAL_API_URL}${apiPath}`;
  const options = {
    method: body ? "POST" : "GET",
    headers: getAuthHeaders(),
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(apiUrl, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiError(text) || `API returned ${res.status}`);
  }
  return res;
}

async function downloadYouTubeFromExternalApi(videoIdOrUrl) {
  const url =
    videoIdOrUrl.startsWith("http") ?
      videoIdOrUrl
    : `https://www.youtube.com/watch?v=${videoIdOrUrl}`;
  const res = await fetchFromExternalApi("/download", {
    url,
    format: "mp3",
    options: {},
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  const disposition = res.headers.get("Content-Disposition");
  const extMatch = disposition?.match(/filename="?[^"]*\.(\w+)"?/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".mp3";
  const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || "";
  const titleFromFile = filename ? path.basename(filename, path.extname(filename)) : "";
  return { buffer, ext, titleFromFile };
}

async function downloadSpotifyFromExternalApi(trackUrl) {
  let metadata = { title: "—", artist: "", album: "" };
  try {
    const metaRes = await fetch(
      `${EXTERNAL_API_URL}/spotify/track?url=${encodeURIComponent(trackUrl)}`,
      { method: "GET", headers: getAuthHeaders() }
    );
    if (metaRes.ok) {
      const data = await metaRes.json();
      metadata = {
        title: data.title || "—",
        artist: data.artist || "",
        album: data.album || "",
      };
    }
  } catch {
    // /spotify/track לא זמין או נכשל – ממשיכים בלי מטא־דאטה
  }

  const spotifyPath = SPOTIFY_DOWNLOAD_PATH.startsWith("/") ? SPOTIFY_DOWNLOAD_PATH : `/${SPOTIFY_DOWNLOAD_PATH}`;
  let res;
  try {
    res = await fetchFromExternalApi(spotifyPath, { url: trackUrl });
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("Cannot POST") || msg.includes("404") || msg.includes("Not Found")) {
      res = await fetchFromExternalApi("/download", { url: trackUrl, format: "mp3", options: {} });
    } else {
      throw err;
    }
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const disposition = res.headers.get("Content-Disposition");
  const extMatch = disposition?.match(/filename="?[^"]*\.(\w+)"?/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".mp3";
  const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || "";
  const titleFromFile = filename ? path.basename(filename, path.extname(filename)) : "";
  return {
    buffer,
    ext,
    title: metadata.title !== "—" ? metadata.title : titleFromFile || "—",
    artist: metadata.artist || "",
    album: metadata.album || "",
  };
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
    const body = await request.json().catch(() => ({}));
    const { videoId, title, artist_id, album_id, image_path } = body;
    const inputUrl =
      (body.url && typeof body.url === "string" ? body.url : null) ||
      (body.link && typeof body.link === "string" ? body.link : null) ||
      (body.track_url && typeof body.track_url === "string" ? body.track_url : null) ||
      null;
    const linkUrl = inputUrl ? inputUrl.trim() : null;
    const isSpotify = linkUrl ? isSpotifyUrl(linkUrl) : false;
    const isYouTubeByUrl = linkUrl && !isSpotify && (linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be"));

    const hasUrl = !!linkUrl;
    const hasVideoId = !!videoId;

    if (!hasUrl && !hasVideoId) {
      return NextResponse.json(
        { error: "נדרש url (קישור YouTube או Spotify) או videoId + title" },
        { status: 400 }
      );
    }

    if (!hasUrl && !title) {
      return NextResponse.json(
        { error: "videoId and title required when not sending url" },
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
    if (album_id != null) {
      const al = await query(
        "SELECT id, artist_id FROM albums WHERE id = $1",
        [parseInt(album_id, 10)]
      );
      if (al.rows.length && al.rows[0].artist_id === artistId) {
        albumId = al.rows[0].id;
      }
    }

    let buffer;
    let ext = ".mp3";
    let finalTitle = (title || "").trim() || "—";

    if (EXTERNAL_API_URL) {
      try {
        if (isSpotify) {
          const result = await downloadSpotifyFromExternalApi(linkUrl);
          buffer = result.buffer;
          ext = result.ext;
          finalTitle = result.title || finalTitle;
        } else {
          const idOrUrl = hasUrl ? linkUrl : videoId;
          const result = await downloadYouTubeFromExternalApi(idOrUrl);
          buffer = result.buffer;
          ext = result.ext;
          if (!finalTitle || finalTitle === "—") finalTitle = result.titleFromFile || "—";
        }
      } catch (err) {
        console.error("External download API error:", err);
        return NextResponse.json(
          { error: err.message || "Download failed" },
          { status: 502 }
        );
      }
    } else {
      if (isSpotify || hasUrl) {
        return NextResponse.json(
          { error: "Spotify and URL download require YT_DLP_API_URL" },
          { status: 400 }
        );
      }
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

    const insertRes = await query(
      `INSERT INTO tracks (title, artist_id, album_id, duration_seconds, file_path, uploaded_by, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        finalTitle,
        artistId,
        albumId,
        0,
        filePathForDb,
        userId,
        image_path || null,
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
    console.error("Download track error:", err);
    return NextResponse.json(
      { error: err.message || "Download failed" },
      { status: 500 }
    );
  }
}
