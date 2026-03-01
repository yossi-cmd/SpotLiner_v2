import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const { userId } = await requireAuth(request);
    const r = await query(
      "SELECT id, name, is_public, created_at FROM playlists WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return NextResponse.json({ playlists: r.rows });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const name = (body.name || "").trim();
    const isPublic = !!body.isPublic;
    if (!name) {
      return NextResponse.json(
        { error: "Playlist name required" },
        { status: 400 }
      );
    }
    const r = await query(
      "INSERT INTO playlists (user_id, name, is_public) VALUES ($1, $2, $3) RETURNING id, name, is_public, created_at",
      [userId, name, isPublic]
    );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
