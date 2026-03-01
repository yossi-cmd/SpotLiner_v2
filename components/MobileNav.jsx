"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import {
  IconHome,
  IconSearch,
  IconLibrary,
  IconUser,
  IconDisc,
  IconUpload,
  IconSettings,
  IconBell,
} from "./Icons";
import styles from "./MobileNav.module.css";

export default function MobileNav() {
  const pathname = usePathname();
  const canUpload = useAuthStore((s) => s.canUpload());
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const link = (path) =>
    pathname === path ? styles.linkActive : styles.link;

  return (
    <nav className={styles.nav}>
      <Link href="/" className={link("/")}>
        <IconHome className={styles.icon} />
        דף הבית
      </Link>
      <Link href="/search" className={link("/search")}>
        <IconSearch className={styles.icon} />
        חיפוש
      </Link>
      <Link href="/library" className={link("/library")}>
        <IconLibrary className={styles.icon} />
        ספרייה
      </Link>
      <Link href="/artists" className={link("/artists")}>
        <IconUser className={styles.icon} />
        אומנים
      </Link>
      <Link href="/albums" className={link("/albums")}>
        <IconDisc className={styles.icon} />
        אלבומים
      </Link>
      {canUpload && (
        <Link href="/upload" className={link("/upload")}>
          <IconUpload className={styles.icon} />
          העלאה
        </Link>
      )}
      <Link href="/settings" className={link("/settings")}>
        <IconSettings className={styles.icon} />
        הגדרות
      </Link>
      {isAdmin && (
        <Link href="/admin/send-push" className={link("/admin/send-push")}>
          <IconBell className={styles.icon} />
          התראות
        </Link>
      )}
    </nav>
  );
}
