"use client";

import { useState } from "react";
import { search as searchApi, deleteTrack, getAlbum, getArtist } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import TrackRow from "@/components/TrackRow";
import EditTrackModal from "@/components/EditTrackModal";
import EditLyricsModal from "@/components/EditLyricsModal";
import ArtistCard from "@/components/ArtistCard";
import AlbumCard from "@/components/AlbumCard";
import Link from "next/link";
import styles from "./Search.module.css";

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState(null);
  const [trackToEditLyrics, setTrackToEditLyrics] = useState(null);
  const { user } = useAuthStore();
  const { setQueue, setCurrentTrack, currentTrack, setIsPlaying } =
    usePlayerStore();

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

      {!loading && results.artists?.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>אומנים</h2>
          <div className={styles.grid}>
            {results.artists?.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                href={`/artist/${artist.id}`}
                onPlay={handlePlayArtist}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && results.albums?.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>אלבומים</h2>
          <div className={styles.grid}>
            {results.albums?.map((album) => (
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
                onEditLyricsTrack={setTrackToEditLyrics}
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
      {trackToEditLyrics && (
        <EditLyricsModal
          track={trackToEditLyrics}
          onClose={() => setTrackToEditLyrics(null)}
          onSaved={() => {
            setTrackToEditLyrics(null);
            if (q.trim()) handleSearch();
          }}
        />
      )}
    </div>
  );
}
