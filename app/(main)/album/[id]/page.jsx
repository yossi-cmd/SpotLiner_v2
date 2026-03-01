"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getAlbum } from "@/lib/api";
import { getImageUrl } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import TrackRow from "@/components/TrackRow";
import styles from "./Album.module.css";

export default function AlbumPage() {
  const params = useParams();
  const id = params.id;
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    getAlbum(id)
      .then(setAlbum)
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false));
  }, [id]);

  const playAll = () => {
    if (!album?.tracks?.length) return;
    setQueue(album.tracks);
    setCurrentTrack(album.tracks[0]);
    setIsPlaying(true);
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (!album) return <div className={styles.empty}>אלבום לא נמצא</div>;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.artwork}>
          {album.image_path ? (
            <img src={getImageUrl(album.image_path)} alt="" />
          ) : (
            <span>♪</span>
          )}
        </div>
        <h1 className={styles.title}>{album.name}</h1>
        <span className={styles.artist}>{album.artist_name}</span>
      </div>
      <button type="button" className={styles.playBtn} onClick={playAll}>
        השמע
      </button>
      <div className={styles.trackList}>
        {(album.tracks || []).map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} />
        ))}
      </div>
    </div>
  );
}
