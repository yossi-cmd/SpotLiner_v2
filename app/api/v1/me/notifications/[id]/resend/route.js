import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const { userId } = await requireAuth(request);
    const id = parseInt(params.id, 10);
    const { resendPushNotification } = await import("@/lib/push");
    const result = await resendPushNotification(id, userId);
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
      { error: err.message || "Resend failed" },
      { status: 500 }
    );
  }
}
