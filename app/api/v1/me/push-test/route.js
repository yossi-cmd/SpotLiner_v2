import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request) {
  try {
    const { userId } = await requireAuth(request);
    const { sendTestPushToUser } = await import("@/lib/push");
    const result = await sendTestPushToUser(userId);
    if (result.sent) return NextResponse.json({ sent: true });
    return NextResponse.json(
      { sent: false, error: result.error },
      { status: 400 }
    );
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Push test failed" },
      { status: 500 }
    );
  }
}
