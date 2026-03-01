import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const trackId = params.trackId;
    await query(
      "INSERT INTO favorites (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, trackId]
    );
    return NextResponse.json({ added: true }, { status: 201 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const trackId = params.trackId;
    await query(
      "DELETE FROM favorites WHERE user_id = $1 AND track_id = $2",
      [userId, trackId]
    );
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
