import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const url = body.url;
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "YouTube thumbnail upload: implement fetch + save" },
      { status: 501 }
    );
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
