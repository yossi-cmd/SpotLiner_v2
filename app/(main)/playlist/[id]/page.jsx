"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlaylist, removeTrackFromPlaylist, deletePlaylist } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import TrackRow from "@/components/TrackRow";
import styles from "./Playlist.module.css";

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuthStore();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  const canDelete = user && playlist?.user_id === user.id;

  useEffect(() => {
    if (!id) return;
    getPlaylist(id)
      .then(setPlaylist)
      .catch(() => setPlaylist(null))
      .finally(() => setLoading(false));
  }, [id]);

  const playAll = () => {
    if (!playlist?.tracks?.length) return;
    setQueue(playlist.tracks);
    setCurrentTrack(playlist.tracks[0]);
    setIsPlaying(true);
  };

  const handleRemove = (trackId) => {
    removeTrackFromPlaylist(id, trackId).then(() => {
      setPlaylist((p) => ({
        ...p,
        tracks: (p?.tracks || []).filter((t) => t.id !== trackId),
      }));
    });
  };

  const handleDeletePlaylist = async () => {
    if (
      !window.confirm(
        `למחוק את הפלייליסט "${playlist.name}"? השירים לא יימחקו.`
      )
    )
      return;
    try {
      await deletePlaylist(id);
      router.push("/library");
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (!playlist) return <div className={styles.empty}>פלייליסט לא נמצא</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{playlist.name}</h1>
        <button type="button" className={styles.playBtn} onClick={playAll}>
          השמע
        </button>
        {canDelete && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDeletePlaylist}
          >
            מחק פלייליסט
          </button>
        )}
      </div>
      <div className={styles.trackList}>
        {(playlist.tracks || []).map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            playlistId={id}
            onRemoveFromPlaylist={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
