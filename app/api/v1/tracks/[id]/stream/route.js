import { query } from "@/lib/db";
import { optionalAuth } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";

const UPLOAD_DIR = process.env.UPLOAD_PATH || "./uploads/audio";

export async function GET(request, { params }) {
  try {
    optionalAuth(request);
    const id = params.id;
    const r = await query("SELECT file_path FROM tracks WHERE id = $1", [id]);
    if (!r.rows.length) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    const filePath = path.join(
      process.cwd(),
      UPLOAD_DIR,
      path.basename(r.rows[0].file_path)
    );
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".m4a" ? "audio/mp4" : ext === ".ogg" ? "audio/ogg" : "audio/mpeg";

    const headers = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    };

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
      headers["Content-Length"] = String(chunkSize);
      return new NextResponse(stream, {
        status: 206,
        headers,
      });
    }

    headers["Content-Length"] = String(fileSize);
    const fullStream = fs.createReadStream(filePath);
    return new NextResponse(fullStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Stream failed" },
      { status: 500 }
    );
  }
}
