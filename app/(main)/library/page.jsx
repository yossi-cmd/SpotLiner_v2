"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPlaylists, getPlaylist, getFavorites, getHistory, createPlaylist } from "@/lib/api";
import Link from "next/link";
import { usePlayerStore } from "@/lib/store/playerStore";
import TrackRow from "@/components/TrackRow";
import styles from "./Library.module.css";

export default function Library() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [favorites, setFavorites] = useState({ tracks: [] });
  const [history, setHistory] = useState({ tracks: [] });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
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

  const handlePlayPlaylist = async (playlistId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const data = await getPlaylist(playlistId);
      const tracks = data?.tracks || [];
      if (!tracks.length) return;
      setQueue(tracks, 0);
      setCurrentTrack(tracks[0]);
      setIsPlaying(true);
    } catch {
      // ignore
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateError("נא להזין שם לפלייליסט");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    try {
      const playlist = await createPlaylist(name, true);
      setPlaylists((prev) => [{ ...playlist }, ...prev]);
      setCreateOpen(false);
      setNewName("");
      router.push(`/playlist/${playlist.id}`);
    } catch (err) {
      setCreateError(err.message || "יצירת פלייליסט נכשלה");
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הספרייה שלי</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פלייליסטים</h2>
        <div className={styles.playlistGrid}>
          <button
            type="button"
            className={styles.playlistCardNew}
            onClick={() => setCreateOpen(true)}
            aria-label="פלייליסט חדש"
          >
            <div className={styles.playlistIconNew}>+</div>
            <span className={styles.playlistName}>פלייליסט חדש</span>
          </button>
          {playlists.map((pl) => (
            <Link key={pl.id} href={`/playlist/${pl.id}`} className={styles.playlistCard}>
              <button
                type="button"
                className={styles.playlistPlayBtn}
                onClick={(e) => handlePlayPlaylist(pl.id, e)}
                aria-label={`השמע את הפלייליסט ${pl.name}`}
              >
                השמע
              </button>
              <div className={styles.playlistIcon}>📋</div>
              <span className={styles.playlistName}>{pl.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {createOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !createLoading && setCreateOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>פלייליסט חדש</h2>
            {createError && <div className={styles.modalError}>{createError}</div>}
            <form onSubmit={handleCreatePlaylist} className={styles.modalForm}>
              <label className={styles.modalLabel}>
                שם הפלייליסט
                <input
                  type="text"
                  className={styles.modalInput}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="למשל: מוזיקה לעבודה"
                  autoFocus
                  disabled={createLoading}
                />
              </label>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancel}
                  onClick={() => !createLoading && setCreateOpen(false)}
                  disabled={createLoading}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmit}
                  disabled={createLoading || !newName.trim()}
                >
                  {createLoading ? "יוצר..." : "צור פלייליסט"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
