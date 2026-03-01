"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getArtist } from "@/lib/api";
import { getImageUrl } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import TrackRow from "@/components/TrackRow";
import Link from "next/link";
import styles from "./Artist.module.css";

export default function ArtistPage() {
  const params = useParams();
  const id = params.id;
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    getArtist(id)
      .then(setArtist)
      .catch(() => setArtist(null))
      .finally(() => setLoading(false));
  }, [id]);

  const playAll = (tracks) => {
    if (!tracks?.length) return;
    setQueue(tracks);
    setCurrentTrack(tracks[0]);
    setIsPlaying(true);
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (!artist) return <div className={styles.empty}>אומן לא נמצא</div>;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.artwork}>
          {artist.image_path ? (
            <img src={getImageUrl(artist.image_path)} alt="" />
          ) : (
            <span>♪</span>
          )}
        </div>
        <h1 className={styles.name}>{artist.name}</h1>
      </div>
      {artist.tracks?.length > 0 && (
        <section className={styles.section}>
          <h2>שירים</h2>
          <button type="button" className={styles.playAll} onClick={() => playAll(artist.tracks)}>
            השמע הכול
          </button>
          <div className={styles.trackList}>
            {(artist.tracks || []).map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} />
            ))}
          </div>
        </section>
      )}
      {artist.albums?.length > 0 && (
        <section className={styles.section}>
          <h2>אלבומים</h2>
          <div className={styles.albumGrid}>
            {artist.albums.map((al) => (
              <Link key={al.id} href={`/album/${al.id}`} className={styles.albumCard}>
                <div className={styles.albumImg}>
                  {al.image_path ? (
                    <img src={getImageUrl(al.image_path)} alt="" />
                  ) : (
                    <span>♪</span>
                  )}
                </div>
                <span>{al.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
