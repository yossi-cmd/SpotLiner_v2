"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAlbum,
  updateAlbum,
  getArtists,
  getImageUrl,
  uploadImage,
  deleteTrack,
  deleteAlbum,
} from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import TrackRow from "@/components/TrackRow";
import EditTrackModal from "@/components/EditTrackModal";
import styles from "./Album.module.css";

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuthStore();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editArtistId, setEditArtistId] = useState("");
  const [editImagePath, setEditImagePath] = useState(undefined);
  const [artists, setArtists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState(null);
  const { setCurrentTrack, setQueue, currentTrack } = usePlayerStore();

  const canEdit =
    user && (user.role === "admin" || album?.created_by === user.id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAlbum(id);
        if (!cancelled) {
          setAlbum(data);
          setEditName(data.name);
          setEditArtistId(String(data.artist_id || ""));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "שגיאה בטעינת האלבום");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    getArtists({ limit: 500 })
      .then((r) => setArtists(r.artists || []))
      .catch(() => setArtists([]));
  }, []);

  const playAll = () => {
    if (!album?.tracks?.length) return;
    setQueue(album.tracks);
    setCurrentTrack(album.tracks[0]);
    usePlayerStore.getState().setQueueIndex(0);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const startEdit = () => {
    setEditName(album.name);
    setEditArtistId(String(album.artist_id || ""));
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

  const saveAlbum = async () => {
    if (!editName?.trim() || !editArtistId) return;
    setSaving(true);
    try {
      const payload = {
        name: editName.trim(),
        artist_id: parseInt(editArtistId, 10),
      };
      if (editImagePath !== undefined) payload.image_path = editImagePath;
      const updated = await updateAlbum(id, payload);
      setAlbum((a) => ({
        ...a,
        name: updated.name,
        artist_id: updated.artist_id,
        artist_name: artists.find((ar) => ar.id === updated.artist_id)?.name || a.artist_name,
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
        const rest = (album.tracks || []).filter((t) => t.id !== track.id);
        if (rest.length) {
          setQueue(rest);
          setCurrentTrack(rest[0]);
        } else {
          setQueue([]);
          setCurrentTrack(null);
        }
      }
      setAlbum((a) => ({
        ...a,
        tracks: (a.tracks || []).filter((t) => t.id !== track.id),
      }));
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  const handleDeleteAlbum = async () => {
    if (
      !window.confirm(
        `למחוק את האלבום "${album.name}"? כל השירים באלבום יימחקו לצמיתות. פעולה זו לא ניתנת לביטול.`
      )
    )
      return;
    try {
      await deleteAlbum(id);
      router.push(album.artist_id ? `/artist/${album.artist_id}` : "/albums");
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;
  if (error || !album)
    return (
      <div className={styles.empty}>
        {error || "אלבום לא נמצא"}
      </div>
    );

  const displayImagePath =
    editImagePath !== undefined ? editImagePath : album.image_path;
  const displayImageUrl = displayImagePath
    ? getImageUrl(displayImagePath)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.artwork}>
          {displayImageUrl ? (
            <img src={displayImageUrl} alt="" />
          ) : (
            <span>♪</span>
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
            {(editImagePath !== undefined ? editImagePath : album.image_path) && (
              <button
                type="button"
                className={styles.removeImgBtn}
                onClick={() => setEditImagePath(null)}
              >
                הסר תמונת אלבום
              </button>
            )}
          </div>
        )}
        <div className={styles.titleRow}>
          {editing ? (
            <>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={styles.editInput}
                placeholder="שם האלבום"
              />
              <select
                value={editArtistId}
                onChange={(e) => setEditArtistId(e.target.value)}
                className={styles.editInput}
              >
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className={styles.editActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={saveAlbum}
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
            <>
              <h1 className={styles.title}>{album.name}</h1>
              <Link
                href={`/artist/${album.artist_id}`}
                className={styles.artist}
              >
                {album.artist_name}
              </Link>
            </>
          )}
        </div>
        <span className={styles.meta}>
          {(album.tracks || []).length} שירים
        </span>
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
              ערוך אלבום
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDeleteAlbum}
            >
              מחק אלבום
            </button>
          </div>
        )}
      </div>

      <div className={styles.trackList}>
        {(album.tracks || []).length === 0 ? (
          <div className={styles.empty}>אין שירים</div>
        ) : (
          (album.tracks || []).map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              showAlbum={false}
              canEditTrack={canEditTrack(track)}
              onEditTrack={setTrackToEdit}
              onDeleteTrack={handleDeleteTrack}
            />
          ))
        )}
      </div>

      {trackToEdit && (
        <EditTrackModal
          track={trackToEdit}
          onClose={() => setTrackToEdit(null)}
          onSaved={() => {
            setTrackToEdit(null);
            getAlbum(id).then(setAlbum);
          }}
        />
      )}
    </div>
  );
}
