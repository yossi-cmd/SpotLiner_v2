import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 100);
    const offset = parseInt(searchParams.get("offset"), 10) || 0;
    const r = await query(
      "SELECT id, name, image_path, created_at FROM artists ORDER BY name LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    return NextResponse.json({ artists: r.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const name = (body.name || "").trim();
    const image_path = body.image_path || null;
    if (!name) {
      return NextResponse.json(
        { error: "Name required" },
        { status: 400 }
      );
    }
    const r = await query(
      "INSERT INTO artists (name, image_path) VALUES ($1, $2) RETURNING id, name, image_path, created_at",
      [name, image_path]
    );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create artist" },
      { status: 500 }
    );
  }
}
