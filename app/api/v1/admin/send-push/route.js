import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function POST(request) {
  try {
    await requireRole(request, ["admin"]);
    const body = await request.json();
    const { title, body: msgBody, url, icon, image, badge, tag, userIds } = body;
    return NextResponse.json(
      { error: "Admin send-push: implement with web-push to userIds" },
      { status: 501 }
    );
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
