import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const { userId } = await requireAuth(request);
    const result = await query(
      "SELECT id, email, display_name, role, created_at FROM users WHERE id = $1",
      [userId]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const u = result.rows[0];
    return NextResponse.json({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
    });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
