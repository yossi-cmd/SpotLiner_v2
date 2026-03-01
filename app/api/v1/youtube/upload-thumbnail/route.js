import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";

const UPLOAD_IMAGES_DIR = path.resolve(
  process.env.UPLOAD_PATH || "./uploads/audio",
  "..",
  "images"
);

export async function POST(request) {
  try {
    await requireRole(request, ["admin", "uploader"]);
    const body = await request.json();
    const url = body.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "SpotLiner/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${res.status}` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const extByType = contentType.includes("png")
      ? ".png"
      : contentType.includes("gif")
        ? ".gif"
        : contentType.includes("webp")
          ? ".webp"
          : ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${extByType}`;
    const bytes = await res.arrayBuffer();

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`images/${filename}`, new Blob([bytes], { type: contentType }), {
        access: "public",
        addRandomSuffix: true,
      });
      return NextResponse.json({ path: blob.url });
    }

    try {
      fs.mkdirSync(UPLOAD_IMAGES_DIR, { recursive: true });
    } catch (e) {}
    const filePath = path.join(UPLOAD_IMAGES_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(bytes));
    const relativePath = `images/${filename}`;
    return NextResponse.json({ path: relativePath });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Thumbnail upload failed" },
      { status: 500 }
    );
  }
}
