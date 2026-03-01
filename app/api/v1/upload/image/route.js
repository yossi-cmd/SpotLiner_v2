import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import path from "path";
import fs from "fs";

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
    const ext = (path.extname(file.name) || "").toLowerCase() || ".jpg";
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const safeExt = allowed.includes(ext) ? ext : ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
    try {
      fs.mkdirSync(UPLOAD_IMAGES_DIR, { recursive: true });
    } catch (e) {}
    const filePath = path.join(UPLOAD_IMAGES_DIR, filename);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));
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
