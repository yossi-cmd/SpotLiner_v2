import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const id = searchParams.get("id");
  if (!url && !id) {
    return NextResponse.json(
      { error: "url or id required" },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { error: "YouTube integration: implement with youtube-dl or similar" },
    { status: 501 }
  );
}
