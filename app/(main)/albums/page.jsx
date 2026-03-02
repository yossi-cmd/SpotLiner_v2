"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAlbums, getAlbum } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import AlbumCard from "@/components/AlbumCard";
import styles from "./Albums.module.css";

export default function Albums() {
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    getAlbums()
      .then((r) => setAlbums(r.albums || []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePlayAlbum = async (albumId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const data = await getAlbum(albumId);
      const tracks = data?.tracks || [];
      if (!tracks.length) return;
      setQueue(tracks, 0);
      setCurrentTrack(tracks[0]);
      setIsPlaying(true);
    } catch {
      // ignore
    }
  };

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
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            href={`/album/${album.id}`}
            onPlay={handlePlayAlbum}
            showArtistName={true}
          />
        ))}
      </div>
    </div>
  );
}

