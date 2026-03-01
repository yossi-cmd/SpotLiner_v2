"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { usePWAStore } from "@/lib/store/pwaStore";
import styles from "./Settings.module.css";

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const installPrompt = usePWAStore((s) => s.installPrompt);
  const clearInstallPrompt = usePWAStore((s) => s.clearInstallPrompt);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => clearInstallPrompt());
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הגדרות</h1>
      <section className={styles.section}>
        <h2>חשבון</h2>
        <p className={styles.muted}>{user?.email}</p>
        <p className={styles.muted}>תפקיד: {user?.role}</p>
      </section>
      {installPrompt && (
        <section className={styles.section}>
          <h2>התקנת אפליקציה</h2>
          <button type="button" className={styles.btn} onClick={handleInstall}>
            התקן כאפליקציה
          </button>
        </section>
      )}
    </div>
  );
}
