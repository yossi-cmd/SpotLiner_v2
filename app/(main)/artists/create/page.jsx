"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createArtist, uploadImage, getImageUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import styles from "./CreateArtist.module.css";

export default function CreateArtist() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canUpload = user && ["admin", "uploader"].includes(user.role);
  const [name, setName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!name.trim()) {
      setError("נא להזין שם אומן");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const artist = await createArtist(name.trim(), imagePath || null);
      router.push(`/artist/${artist.id}`);
    } catch (err) {
      setError(err.message || "יצירת אומן נכשלה");
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
      <h1 className={styles.title}>צור אומן חדש</h1>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          תמונה ראשית
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
                  src={imagePath ? getImageUrl(imagePath) : imageFile ? URL.createObjectURL(imageFile) : ""}
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
          שם האומן *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="שם האומן"
            required
          />
        </label>
        <div className={styles.actions}>
          <Link href="/artists" className={styles.cancelBtn}>
            ביטול
          </Link>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "יוצר..." : "צור אומן"}
          </button>
        </div>
      </form>
    </div>
  );
}
