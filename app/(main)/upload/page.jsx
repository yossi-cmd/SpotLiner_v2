"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  uploadTrack,
  getArtists,
  getAlbums,
  uploadImage,
  createAlbum,
  getImageUrl,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import styles from "./Upload.module.css";

const MODE_SINGLE = "single";
const MODE_ALBUM = "album";
const NEW_ALBUM_VALUE = "__new__";

function getTitleFromFileName(name) {
  if (!name) return "";
  const base = name.replace(/\.[^/.]+$/, "").trim();
  return base || name;
}

function getDurationFromFile(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration) || 0);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}

export default function Upload() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [mode, setMode] = useState(MODE_SINGLE);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [duration, setDuration] = useState(0);
  const [albumRows, setAlbumRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
    if (!canUpload) {
      router.replace("/");
      return;
    }
    getArtists({ limit: 500 })
      .then((r) => setArtists(r.artists || []))
      .catch(() => setArtists([]));
  }, [canUpload, router]);

  useEffect(() => {
    if (artistId) {
      getAlbums({ artist_id: artistId, limit: 500 })
        .then((r) => {
          setAlbums(r.albums || []);
          if (albumId !== NEW_ALBUM_VALUE) setAlbumId("");
        })
        .catch(() => setAlbums([]));
    } else {
      setAlbums([]);
      setAlbumId("");
    }
  }, [artistId]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError("");
    if (f) {
      setTitle(getTitleFromFileName(f.name));
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => setDuration(Math.round(audio.duration));
      audio.src = URL.createObjectURL(f);
    } else {
      setTitle("");
      setDuration(0);
    }
  };

  const onAlbumFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setError("");
    setAlbumRows((prev) => {
      const emptyIndices = prev
        .map((r, i) => (r.file ? null : i))
        .filter((i) => i !== null);
      const next = prev.map((r) => ({ ...r }));
      files.forEach((f, i) => {
        if (emptyIndices[i] !== undefined) {
          next[emptyIndices[i]] = { ...next[emptyIndices[i]], file: f };
        } else {
          next.push({ file: f, title: getTitleFromFileName(f.name) });
        }
      });
      return next.length ? next : files.map((f) => ({ file: f, title: getTitleFromFileName(f.name) }));
    });
    e.target.value = "";
  };

  const setAlbumRowTitle = (index, title) => {
    setAlbumRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, title } : r))
    );
  };

  const removeAlbumRow = (index) => {
    setAlbumRows((prev) => prev.filter((_, i) => i !== index));
  };

  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    try {
      const path = await uploadImage(f);
      setImagePath(path);
      setImageFile(f);
    } catch (err) {
      setError(err.message || "העלאת תמונה נכשלה");
      setImagePath("");
      setImageFile(null);
    }
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError("נא לבחור קובץ ולהזין כותרת");
      return;
    }
    if (!artistId) {
      setError("נא לבחור אומן");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      let resolvedAlbumId = albumId ? parseInt(albumId, 10) : undefined;
      if (albumId === NEW_ALBUM_VALUE && newAlbumName?.trim()) {
        const created = await createAlbum(
          newAlbumName.trim(),
          parseInt(artistId, 10),
          imagePath || undefined
        );
        resolvedAlbumId = created.id;
      }
      await uploadTrack(file, {
        title: title.trim(),
        artist_id: parseInt(artistId, 10),
        album_id: resolvedAlbumId,
        duration_seconds: duration,
        image_path: imagePath || undefined,
      });
      setSuccess(true);
      setFile(null);
      setTitle("");
      setArtistId("");
      setAlbumId("");
      setNewAlbumName("");
      setImagePath("");
      setImageFile(null);
      setDuration(0);
      e.target.reset();
    } catch (err) {
      setError(err.message || "העלאה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAlbum = async (e) => {
    e.preventDefault();
    if (!artistId) {
      setError("נא לבחור אומן");
      return;
    }
    if (albumRows.length === 0) {
      setError("נא לבחור קבצי אודיו");
      return;
    }
    const useNewAlbum = albumId === NEW_ALBUM_VALUE;
    if (useNewAlbum && !newAlbumName?.trim()) {
      setError("נא להזין שם לאלבום החדש");
      return;
    }
    const rowsWithFile = albumRows.filter((r) => r.file);
    if (rowsWithFile.length === 0) {
      setError("נא להוסיף קובץ אודיו לכל שיר (או לבחור קבצים)");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      let resolvedAlbumId = null;
      if (useNewAlbum) {
        const created = await createAlbum(
          newAlbumName.trim(),
          parseInt(artistId, 10),
          imagePath || undefined
        );
        resolvedAlbumId = created.id;
      } else if (albumId) {
        resolvedAlbumId = parseInt(albumId, 10);
      }
      const aid = parseInt(artistId, 10);
      const trackImagePath = useNewAlbum ? undefined : imagePath || undefined;
      for (let i = 0; i < rowsWithFile.length; i++) {
        const row = rowsWithFile[i];
        const durationSec = await getDurationFromFile(row.file);
        await uploadTrack(row.file, {
          title: (row.title || getTitleFromFileName(row.file?.name) || "ללא כותרת").trim(),
          artist_id: aid,
          album_id: resolvedAlbumId || undefined,
          duration_seconds: durationSec,
          image_path: trackImagePath,
        });
      }
      setUploadedCount(rowsWithFile.length);
      setSuccess(true);
      setAlbumRows([]);
      setArtistId("");
      setAlbumId("");
      setNewAlbumName("");
      setImagePath("");
      setImageFile(null);
    } catch (err) {
      setError(err.message || "העלאה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === MODE_ALBUM ? handleSubmitAlbum : handleSubmitSingle;
  const isAlbum = mode === MODE_ALBUM;

  if (!canUpload) return null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>העלאת שיר</h1>
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === MODE_SINGLE ? styles.tabActive : styles.tab}
          onClick={() => setMode(MODE_SINGLE)}
        >
          שיר בודד
        </button>
        <button
          type="button"
          className={mode === MODE_ALBUM ? styles.tabActive : styles.tab}
          onClick={() => setMode(MODE_ALBUM)}
        >
          העלאה כאלבום
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && (
        <div className={styles.success}>
          {isAlbum
            ? `הועלו ${uploadedCount} שירים בהצלחה.`
            : "השיר הועלה בהצלחה."}
        </div>
      )}
      {artists.length === 0 && !loading && (
        <p className={styles.hint}>
          אין עדיין אומנים.{" "}
          <Link href="/artists/create">צור אומן חדש</Link> ואז חזור להעלות שיר.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className={styles.form}
        key={mode}
      >
        {isAlbum ? (
          <>
            <label className={styles.label}>
              אומן *
              <div className={styles.selectRow}>
                <select
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                  className={styles.input}
                  required
                >
                  <option value="">בחר אומן</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Link href="/artists/create" className={styles.createLink}>
                  צור אומן חדש
                </Link>
              </div>
            </label>
            <label className={styles.label}>
              אלבום
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className={styles.input}
                disabled={!artistId}
              >
                <option value="">ללא אלבום</option>
                {albums.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.name}
                  </option>
                ))}
                <option value={NEW_ALBUM_VALUE}>+ אלבום חדש</option>
              </select>
            </label>
            {albumId === NEW_ALBUM_VALUE && (
              <label className={styles.label}>
                שם האלבום החדש *
                <input
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className={styles.input}
                  placeholder="שם האלבום"
                />
              </label>
            )}
            <label className={styles.label}>
              תמונת כיסוי (משותפת לכל השירים)
              <div className={styles.imageRow}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className={styles.fileInput}
                />
                {(imagePath || imageFile) && (
                  <div className={styles.previewRow}>
                    <img
                      src={
                        imagePath
                          ? getImageUrl(imagePath)
                          : imageFile
                            ? URL.createObjectURL(imageFile)
                            : ""
                      }
                      alt=""
                      className={styles.previewImg}
                    />
                    <button
                      type="button"
                      className={styles.removeImg}
                      onClick={() => {
                        setImagePath("");
                        setImageFile(null);
                      }}
                    >
                      הסר
                    </button>
                  </div>
                )}
              </div>
            </label>
            <label className={styles.label}>
              קבצי אודיו (ניתן לבחור כמה)
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={onAlbumFilesChange}
                className={styles.fileInput}
              />
            </label>
            {albumRows.length > 0 && (
              <div className={styles.albumTableWrap}>
                <p className={styles.albumTableTitle}>
                  כותרת השירים (הוסף קבצים למעלה)
                </p>
                {albumRows.map((row, i) => (
                  <div key={i} className={styles.albumRow}>
                    <button
                      type="button"
                      className={styles.removeRowBtn}
                      onClick={() => removeAlbumRow(i)}
                      title="הסר"
                    >
                      ×
                    </button>
                    <span className={styles.fileName}>
                      {row.file ? row.file.name : "—"}
                    </span>
                    <input
                      value={row.title || ""}
                      onChange={(e) => setAlbumRowTitle(i, e.target.value)}
                      className={styles.input}
                      placeholder="שם השיר"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <label className={styles.label}>
              קובץ אודיו (MP3, M4A, וכו׳)
              <input
                type="file"
                accept="audio/*"
                onChange={onFileChange}
                className={styles.fileInput}
              />
              {file && <span className={styles.fileName}>{file.name}</span>}
            </label>
            <label className={styles.label}>
              כותרת *
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
                required
                placeholder="שם השיר"
              />
            </label>
            <label className={styles.label}>
              אומן *
              <div className={styles.selectRow}>
                <select
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                  className={styles.input}
                  required
                >
                  <option value="">בחר אומן</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Link href="/artists/create" className={styles.createLink}>
                  צור אומן חדש
                </Link>
              </div>
            </label>
            <label className={styles.label}>
              אלבום
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className={styles.input}
                disabled={!artistId}
              >
                <option value="">ללא אלבום</option>
                {albums.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.name}
                  </option>
                ))}
                <option value={NEW_ALBUM_VALUE}>+ אלבום חדש</option>
              </select>
            </label>
            {albumId === NEW_ALBUM_VALUE && (
              <label className={styles.label}>
                שם האלבום החדש *
                <input
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className={styles.input}
                  placeholder="שם האלבום"
                />
              </label>
            )}
            <label className={styles.label}>
              תמונת כיסוי (אופציונלי)
              <div className={styles.imageRow}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className={styles.fileInput}
                />
                {(imagePath || imageFile) && (
                  <div className={styles.previewRow}>
                    <img
                      src={
                        imagePath
                          ? getImageUrl(imagePath)
                          : imageFile
                            ? URL.createObjectURL(imageFile)
                            : ""
                      }
                      alt=""
                      className={styles.previewImg}
                    />
                    <button
                      type="button"
                      className={styles.removeImg}
                      onClick={() => {
                        setImagePath("");
                        setImageFile(null);
                      }}
                    >
                      הסר
                    </button>
                  </div>
                )}
              </div>
            </label>
          </>
        )}

        <button
          type="submit"
          className={styles.btn}
          disabled={
            loading ||
            (isAlbum && albumRows.filter((r) => r.file).length === 0)
          }
        >
          {loading
            ? "מעלה..."
            : isAlbum
              ? `העלה ${albumRows.filter((r) => r.file).length} שירים`
              : "העלה שיר"}
        </button>
      </form>
    </div>
  );
}
