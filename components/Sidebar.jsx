"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { sendTestPush } from "@/lib/api";
import {
  IconHome,
  IconSearch,
  IconLibrary,
  IconUpload,
  IconUser,
  IconDisc,
  IconClose,
  IconSettings,
  IconBell,
} from "./Icons";
import styles from "./Sidebar.module.css";

export default function Sidebar({ isOpen = false, onClose }) {
  const { user, logout, canUpload } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [pushTesting, setPushTesting] = useState(false);

  const handlePushTest = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPushTesting(true);
    try {
      const r = await sendTestPush();
      if (r.sent) window.alert("התראת בדיקה נשלחה. בדוק במכשיר.");
      else window.alert("שליחה נכשלה: " + (r.error || "לא ידוע"));
    } catch (err) {
      window.alert("שגיאה: " + (err.message || "לא ידוע"));
    } finally {
      setPushTesting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
    onClose?.();
  };

  const handleNavClick = () => onClose?.();

  const link = (path) => (pathname === path ? styles.linkActive : styles.link);

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.logoRow}>
          <Link href="/" className={styles.logo} onClick={handleNavClick}>
            <img src="/favicon.svg" alt="" className={styles.logoIcon} aria-hidden />
            ספוטליינר
          </Link>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="סגור"
          >
            <IconClose />
          </button>
        </div>
        <nav className={styles.nav}>
          <Link
            href="/"
            className={link("/")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconHome className={styles.iconSvg} /></span>
            דף הבית
          </Link>
          <Link
            href="/search"
            className={link("/search")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconSearch className={styles.iconSvg} /></span>
            חיפוש
          </Link>
          <Link
            href="/library"
            className={link("/library")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconLibrary className={styles.iconSvg} /></span>
            הספרייה שלי
          </Link>
          <Link
            href="/artists"
            className={link("/artists")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconUser className={styles.iconSvg} /></span>
            אומנים
          </Link>
          <Link
            href="/albums"
            className={link("/albums")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconDisc className={styles.iconSvg} /></span>
            אלבומים
          </Link>
          {canUpload() && (
            <Link
              href="/upload"
              className={link("/upload")}
              onClick={handleNavClick}
            >
              <span className={styles.icon}><IconUpload className={styles.iconSvg} /></span>
              העלאת שיר
            </Link>
          )}
          <Link
            href="/settings"
            className={link("/settings")}
            onClick={handleNavClick}
          >
            <span className={styles.icon}><IconSettings className={styles.iconSvg} /></span>
            הגדרות
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin/send-push"
              className={link("/admin/send-push")}
              onClick={handleNavClick}
            >
              <span className={styles.icon}><IconBell className={styles.iconSvg} /></span>
              שליחת התראות
            </Link>
          )}
        </nav>
        {user ? (
          <div className={styles.user}>
            <span className={styles.userName}>
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handlePushTest}
              disabled={pushTesting}
            >
              {pushTesting ? "שולח..." : "בדיקת התראות"}
            </button>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              יציאה
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
