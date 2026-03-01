"use client";

import { useState } from "react";
import { search as searchApi, getImageUrl, deleteTrack } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import TrackRow from "@/components/TrackRow";
import EditTrackModal from "@/components/EditTrackModal";
import Link from "next/link";
import styles from "./Search.module.css";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState(null);
  const { user } = useAuthStore();
  const { setQueue, setCurrentTrack, currentTrack } = usePlayerStore();

  const canEditTrack = (track) =>
    user && (user.role === "admin" || track.uploaded_by === user.id);

  const handleDeleteTrack = async (track) => {
    if (
      !window.confirm(
        `למחוק את השיר "${track.title}"? פעולה זו לא ניתנת לביטול.`
      )
    )
      return;
    try {
      await deleteTrack(track.id);
      setResults((prev) => ({
        ...prev,
        tracks: (prev.tracks || []).filter((t) => t.id !== track.id),
      }));
      if (currentTrack?.id === track.id) {
        setQueue([]);
        usePlayerStore.getState().setCurrentTrack(null);
      }
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchApi(q);
      setResults({
        tracks: data.tracks || [],
        artists: data.artists || [],
        albums: data.albums || [],
      });
    } catch {
      setResults({ tracks: [], artists: [], albums: [] });
    } finally {
      setLoading(false);
    }
  };

  const playAll = (tracks) => {
    if (!tracks?.length) return;
    setQueue(tracks);
    setCurrentTrack(tracks[0]);
    setIsPlaying(true);
  };

  return (
    <div className={styles.page}>
      <form onSubmit={handleSearch} className={styles.form}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש שירים, אומנים, אלבומים..."
          className={styles.input}
        />
        <button type="submit" className={styles.btn}>
          חפש
        </button>
      </form>

      {loading && <div className={styles.loading}>טוען...</div>}

      {!loading && (q.trim() === "" || (results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0)) && q.trim() !== "" && (
        <div className={styles.empty}>לא נמצאו תוצאות</div>
      )}

      {!loading && (results.artists?.length > 0 || results.albums?.length > 0) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>אומנים</h2>
          <div className={styles.grid}>
            {results.artists?.map((a) => (
              <Link key={a.id} href={`/artist/${a.id}`} className={styles.card}>
                <div className={styles.cardImg}>
                  {a.image_path ? (
                    <img src={getImageUrl(a.image_path)} alt="" />
                  ) : (
                    <span>♪</span>
                  )}
                </div>
                <span className={styles.cardName}>{a.name}</span>
              </Link>
            ))}
          </div>
          <h2 className={styles.sectionTitle}>אלבומים</h2>
          <div className={styles.grid}>
            {results.albums?.map((al) => (
              <Link key={al.id} href={`/album/${al.id}`} className={styles.card}>
                <div className={styles.cardImg}>
                  {al.image_path ? (
                    <img src={getImageUrl(al.image_path)} alt="" />
                  ) : (
                    <span>♪</span>
                  )}
                </div>
                <span className={styles.cardName}>{al.name}</span>
                <span className={styles.cardSub}>{al.artist_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && results.tracks?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>שירים</h2>
          <div className={styles.trackList}>
            {results.tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                canEditTrack={canEditTrack(track)}
                onEditTrack={setTrackToEdit}
                onDeleteTrack={handleDeleteTrack}
              />
            ))}
          </div>
        </section>
      )}

      {trackToEdit && (
        <EditTrackModal
          track={trackToEdit}
          onClose={() => setTrackToEdit(null)}
          onSaved={() => {
            setTrackToEdit(null);
            if (q.trim()) handleSearch();
          }}
        />
      )}
    </div>
  );
}
