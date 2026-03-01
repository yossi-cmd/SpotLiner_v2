"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAlbum,
  getArtists,
  uploadImage,
  getImageUrl,
} from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import styles from "./CreateAlbum.module.css";

export default function CreateAlbum() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [name, setName] = useState("");
  const [artistId, setArtistId] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getArtists({ limit: 500 })
      .then((r) => setArtists(r.artists || []))
      .catch(() => setArtists([]));
  }, []);

  const onImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setError("");
    try {
      const path = await uploadImage(file);
      setImagePath(path);
    } catch (err) {
      setError(err.message || "העלאת תמונה נכשלה");
      setImagePath("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !artistId) {
      setError("נא להזין שם אלבום ולבחור אומן");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const album = await createAlbum(
        name.trim(),
        parseInt(artistId, 10),
        imagePath || null
      );
      router.push(`/album/${album.id}`);
    } catch (err) {
      setError(err.message || "יצירת אלבום נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (!canUpload) {
    router.replace("/");
    return null;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>צור אלבום חדש</h1>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          תמונת עטיפה
          <div className={styles.imageRow}>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className={styles.fileInput}
            />
            {(imagePath || imageFile) && (
              <div className={styles.previewWrap}>
                <img
                  src={
                    imagePath
                      ? getImageUrl(imagePath)
                      : imageFile
                        ? URL.createObjectURL(imageFile)
                        : ""
                  }
                  alt=""
                  className={styles.preview}
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
          אומן *
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
        </label>
        <label className={styles.label}>
          שם האלבום *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="שם האלבום"
            required
          />
        </label>
        <div className={styles.actions}>
          <Link href="/albums" className={styles.cancelBtn}>
            ביטול
          </Link>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "יוצר..." : "צור אלבום"}
          </button>
        </div>
      </form>
    </div>
  );
}
