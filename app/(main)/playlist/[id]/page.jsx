"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getPlaylist, removeTrackFromPlaylist } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import TrackRow from "@/components/TrackRow";
import styles from "./Playlist.module.css";

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id;
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

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

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (!playlist) return <div className={styles.empty}>פלייליסט לא נמצא</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{playlist.name}</h1>
        <button type="button" className={styles.playBtn} onClick={playAll}>
          השמע
        </button>
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
