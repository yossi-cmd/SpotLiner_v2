import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  try {
    await requireRole(request, ["admin"]);
    const r = await query(
      `SELECT ps.id, ps.user_id, ps.endpoint, ps.created_at, u.email, u.display_name
       FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id ORDER BY ps.created_at DESC`
    );
    return NextResponse.json({ subscribers: r.rows });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}
