"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getArtist,
  updateArtist,
  getImageUrl,
  uploadImage,
  deleteTrack,
  deleteArtist,
} from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import TrackRow from "@/components/TrackRow";
import EditTrackModal from "@/components/EditTrackModal";
import styles from "./Artist.module.css";

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuthStore();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImagePath, setEditImagePath] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState(null);
  const { setCurrentTrack, setQueue, currentTrack } = usePlayerStore();

  const canEdit =
    user && (user.role === "admin" || artist?.created_by === user.id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getArtist(id);
        if (!cancelled) setArtist(data);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "שגיאה בטעינת האומן");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const playAll = () => {
    if (!artist?.tracks?.length) return;
    setQueue(artist.tracks);
    setCurrentTrack(artist.tracks[0]);
    usePlayerStore.getState().setQueueIndex(0);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const startEdit = () => {
    setEditName(artist.name);
    setEditImagePath(undefined);
    setEditing(true);
  };

  const onImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadImage(file);
      setEditImagePath(path);
    } catch {}
  };

  const saveArtist = async () => {
    if (!editName?.trim()) return;
    setSaving(true);
    try {
      const updated = await updateArtist(
        id,
        editName.trim(),
        editImagePath !== undefined ? editImagePath : undefined
      );
      setArtist((a) => ({
        ...a,
        name: updated.name,
        image_path: updated.image_path,
      }));
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

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
      if (currentTrack?.id === track.id) {
        const rest = (artist.tracks || []).filter((t) => t.id !== track.id);
        if (rest.length) {
          setQueue(rest);
          setCurrentTrack(rest[0]);
        } else {
          setQueue([]);
          setCurrentTrack(null);
        }
      }
      setArtist((a) => ({
        ...a,
        tracks: (a.tracks || []).filter((t) => t.id !== track.id),
      }));
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  const handleDeleteArtist = async () => {
    if (
      !window.confirm(
        `למחוק את האומן "${artist.name}"? כל האלבומים והשירים יימחקו לצמיתות. פעולה זו לא ניתנת לביטול.`
      )
    )
      return;
    try {
      await deleteArtist(id);
      router.push("/artists");
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (error || !artist)
    return (
      <div className={styles.empty}>
        {error || "אומן לא נמצא"}
      </div>
    );

  const displayImagePath =
    editImagePath !== undefined ? editImagePath : artist.image_path;
  const displayImageUrl = displayImagePath
    ? getImageUrl(displayImagePath)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroImage}>
          <div className={styles.artwork}>
            {displayImageUrl ? (
              <img src={displayImageUrl} alt="" />
            ) : (
              <span>{artist.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {editing && (
            <div className={styles.editImageRow}>
              <label className={styles.fileLabel}>
                החלף תמונה
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className={styles.fileInput}
                />
              </label>
              {displayImagePath != null && displayImagePath !== "" && (
                <button
                  type="button"
                  className={styles.removeImgBtn}
                  onClick={() => setEditImagePath(null)}
                >
                  הסר תמונה
                </button>
              )}
            </div>
          )}
        </div>
        <div className={styles.heroDetails}>
          <div className={styles.nameRow}>
            {editing ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.editInput}
                />
                <div className={styles.editActions}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={saveArtist}
                    disabled={saving}
                  >
                    {saving ? "שומר..." : "שמור"}
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setEditing(false)}
                  >
                    ביטול
                  </button>
                </div>
              </>
            ) : (
              <h1 className={styles.name}>{artist.name}</h1>
            )}
          </div>
          <span className={styles.meta}>
            {(artist.tracks || []).length} שירים
          </span>
          <div className={styles.heroButtons}>
            <button type="button" className={styles.playBtn} onClick={playAll}>
              השמע
            </button>
            {canEdit && !editing && (
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={startEdit}
                >
                  ערוך אומן
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDeleteArtist}
                >
                  מחק אומן
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {artist.albums?.length > 0 && (
        <section className={styles.section}>
          <h2>אלבומים</h2>
          <div className={styles.albumGrid}>
            {artist.albums.map((al) => (
              <Link
                key={al.id}
                href={`/album/${al.id}`}
                className={styles.albumCard}
              >
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

      <section className={styles.section}>
        <h2>שירים</h2>
        {(artist.tracks || []).length === 0 ? (
          <div className={styles.empty}>אין שירים</div>
        ) : (
          <div className={styles.trackList}>
            {(artist.tracks || []).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                showAlbum={true}
                canEditTrack={canEditTrack(track)}
                onEditTrack={setTrackToEdit}
                onDeleteTrack={handleDeleteTrack}
              />
            ))}
          </div>
        )}
      </section>

      {trackToEdit && (
        <EditTrackModal
          track={trackToEdit}
          onClose={() => setTrackToEdit(null)}
          onSaved={() => {
            setTrackToEdit(null);
            getArtist(id).then(setArtist);
          }}
        />
      )}
    </div>
  );
}
