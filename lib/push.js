import webpush from "web-push";
import { query } from "@/lib/db";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@spotliner.app",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export function getVapidPublicKey() {
  return vapidPublicKey || null;
}

export async function sendTestPushToUser(userId) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { sent: false, error: "Push not configured" };
  }
  const r = await query(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );
  if (!r.rows.length) {
    return { sent: false, error: "No subscription for user" };
  }
  const sub = {
    endpoint: r.rows[0].endpoint,
    keys: { p256dh: r.rows[0].p256dh, auth: r.rows[0].auth },
  };
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: "SpotLiner",
        body: "זו הודעת בדיקה",
      })
    );
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

export async function resendPushNotification(logId, userId) {
  const r = await query(
    "SELECT id, user_id FROM push_notification_log WHERE id = $1 AND user_id = $2",
    [logId, userId]
  );
  if (!r.rows.length) {
    return { sent: false, error: "Notification not found" };
  }
  return sendTestPushToUser(userId);
}

export async function notifyNewTrackToAll(
  uploaderName,
  artistId,
  artistName,
  trackTitle,
  trackId,
  uploaderUserId
) {
  // Optional: notify users who favorited this artist. Implement if needed.
}
