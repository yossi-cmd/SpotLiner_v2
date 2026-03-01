"use client";

import { useState, useEffect } from "react";
import { getAlbums } from "@/lib/api";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import styles from "./Albums.module.css";

export default function Albums() {
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlbums()
      .then((r) => setAlbums(r.albums || []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>טוען...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>אלבומים</h1>
        {canUpload && (
          <Link href="/albums/create" className={styles.createBtn}>
            צור אלבום חדש
          </Link>
        )}
      </div>
      <div className={styles.grid}>
        {albums.map((al) => (
          <Link key={al.id} href={`/album/${al.id}`} className={styles.card}>
            <div className={styles.imgWrap}>
              {al.image_path ? (
                <img src={getImageUrl(al.image_path)} alt="" />
              ) : (
                <span>♪</span>
              )}
            </div>
            <span className={styles.name}>{al.name}</span>
            <span className={styles.artist}>{al.artist_name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
