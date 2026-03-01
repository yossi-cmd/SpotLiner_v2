import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";
import { optimizeImage } from "@/lib/optimizeImage";

const UPLOAD_IMAGES_DIR = path.resolve(
  process.env.UPLOAD_PATH || "./uploads/audio",
  "..",
  "images"
);

export async function POST(request) {
  try {
    await requireRole(request, ["admin", "uploader"]);
    const formData = await request.formData();
    const file = formData.get("image");
    if (!file) {
      return NextResponse.json(
        { error: "No image file uploaded" },
        { status: 400 }
      );
    }
    const bytes = await file.arrayBuffer();
    let buffer;
    let ext;
    try {
      const optimized = await optimizeImage(bytes);
      buffer = optimized.buffer;
      ext = optimized.ext;
    } catch (optErr) {
      console.error("Image optimization failed, using original:", optErr);
      buffer = Buffer.from(bytes);
      const origExt = (path.extname(file.name) || "").toLowerCase() || ".jpg";
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      ext = allowed.includes(origExt) ? origExt : ".jpg";
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const pathname = `images/${filename}`;
      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: true,
      });
      return NextResponse.json({ path: blob.url });
    }

    try {
      fs.mkdirSync(UPLOAD_IMAGES_DIR, { recursive: true });
    } catch (e) {}
    const filePath = path.join(UPLOAD_IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    const relativePath = `images/${filename}`;
    return NextResponse.json({ path: relativePath });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Image upload failed" },
      { status: 500 }
    );
  }
}
