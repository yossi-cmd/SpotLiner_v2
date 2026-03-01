"use client";

import { useState, useEffect } from "react";
import { getPlaylists, getFavorites, getHistory } from "@/lib/api";
import Link from "next/link";
import { usePlayerStore } from "@/lib/store/playerStore";
import TrackRow from "@/components/TrackRow";
import styles from "./Library.module.css";

export default function Library() {
  const [playlists, setPlaylists] = useState([]);
  const [favorites, setFavorites] = useState({ tracks: [] });
  const [history, setHistory] = useState({ tracks: [] });
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    Promise.all([
      getPlaylists().catch(() => ({ playlists: [] })),
      getFavorites().catch(() => ({ tracks: [] })),
      getHistory().catch(() => ({ tracks: [] })),
    ]).then(([p, f, h]) => {
      setPlaylists(p.playlists || []);
      setFavorites(f);
      setHistory(h);
      setLoading(false);
    });
  }, []);

  const playAll = (tracks) => {
    if (!tracks?.length) return;
    setQueue(tracks);
    setCurrentTrack(tracks[0]);
    setIsPlaying(true);
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הספרייה שלי</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פלייליסטים</h2>
        <div className={styles.playlistGrid}>
          {playlists.map((pl) => (
            <Link key={pl.id} href={`/playlist/${pl.id}`} className={styles.playlistCard}>
              <div className={styles.playlistIcon}>📋</div>
              <span className={styles.playlistName}>{pl.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>אהובים</h2>
        <div className={styles.trackList}>
          {favorites.tracks?.length === 0 ? (
            <div className={styles.empty}>אין שירים אהובים</div>
          ) : (
            (favorites.tracks || []).map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>השמעה לאחרונה</h2>
        <div className={styles.trackList}>
          {history.tracks?.length === 0 ? (
            <div className={styles.empty}>אין היסטוריה</div>
          ) : (
            (history.tracks || []).map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
