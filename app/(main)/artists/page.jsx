"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getArtists, getArtist } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import ArtistCard from "@/components/ArtistCard";
import styles from "./Artists.module.css";

export default function Artists() {
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    getArtists()
      .then((r) => setArtists(r.artists || []))
      .catch(() => setArtists([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePlayArtist = async (artistId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const data = await getArtist(artistId);
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
        <h1 className={styles.title}>אומנים</h1>
        {canUpload && (
          <Link href="/artists/create" className={styles.createBtn}>
            צור אומן חדש
          </Link>
        )}
      </div>
      <div className={styles.grid}>
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            href={`/artist/${artist.id}`}
            onPlay={handlePlayArtist}
          />
        ))}
      </div>
    </div>
  );
}

