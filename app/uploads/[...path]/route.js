import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const UPLOAD_BASE = path.resolve(
  process.cwd(),
  process.env.UPLOAD_PATH || "./uploads/audio",
  ".."
);

export async function GET(request, { params }) {
  const pathSegments = params.path || [];
  if (pathSegments.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = path.join(UPLOAD_BASE, ...pathSegments);
  if (!filePath.startsWith(UPLOAD_BASE) || path.relative(UPLOAD_BASE, filePath).startsWith("..")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
