"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { getAdminPushSubscribers } from "@/lib/api";
import styles from "./AdminSendPush.module.css";

export default function AdminSendPush() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      router.replace("/");
      return;
    }
    getAdminPushSubscribers()
      .then((r) => setSubscribers(r.subscribers || []))
      .catch(() => setSubscribers([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (user?.role !== "admin") return null;
  if (loading) return <div className={styles.loading}>טוען...</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>שליחת התראות</h1>
      <p className={styles.muted}>
        משתמשים עם מנוי Push: {subscribers.length}
      </p>
      <ul className={styles.list}>
        {subscribers.map((s) => (
          <li key={s.id}>
            {s.email} {s.display_name && `(${s.display_name})`}
          </li>
        ))}
      </ul>
    </div>
  );
}
