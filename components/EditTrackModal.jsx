"use client";

import { useState, useEffect } from "react";
import {
  updateTrack,
  getArtists,
  getAlbums,
  uploadImage,
  getImageUrl,
} from "@/lib/api";
import styles from "./EditTrackModal.module.css";

export default function EditTrackModal({ track, onClose, onSaved }) {
  const [title, setTitle] = useState(track?.title || "");
  const [artistId, setArtistId] = useState(track?.artist_id || "");
  const [albumId, setAlbumId] = useState(track?.album_id || "");
  const [featuredArtistIds, setFeaturedArtistIds] = useState([]);
  const [imagePath, setImagePath] = useState(undefined);
  const [lyricsText, setLyricsText] = useState(track?.lyrics_text ?? "");
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!track) return;
    setTitle(track.title);
    setArtistId(track.artist_id || "");
    setAlbumId(track.album_id || "");
    setFeaturedArtistIds(
      Array.isArray(track.featured_artists)
        ? track.featured_artists.map((a) => a.id)
        : []
    );
    setImagePath(undefined);
    setLyricsText(track.lyrics_text ?? "");
  }, [track]);

  useEffect(() => {
    getArtists({ limit: 500 })
      .then((r) => setArtists(r.artists || []))
      .catch(() => setArtists([]));
  }, []);

  useEffect(() => {
    if (artistId) {
      getAlbums({ limit: 500, artist_id: artistId })
        .then((r) => setAlbums(r.albums || []))
        .catch(() => setAlbums([]));
    } else {
      setAlbums([]);
      setAlbumId("");
    }
  }, [artistId]);

  const onImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadImage(file);
      setImagePath(path);
    } catch {}
  };

  /** Parse LRC/SRT/VTT content into LRC-like format [mm:ss] line */
  const parseLyricsFile = (content, filename = "") => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");

    // If it's already LRC, keep as-is (trim empty edges only)
    if (ext === "lrc") {
      return lines.map((l) => l.replace(/\s+$/, "")).join("\n").trim();
    }

    // Convert SRT / VTT to simple [mm:ss] LRC lines
    if (ext === "srt" || ext === "vtt") {
      const out = [];
      let i = 0;

      // Skip WEBVTT header if present
      if (ext === "vtt" && lines[i]?.trim().toUpperCase() === "WEBVTT") {
        i++;
      }

      const parseTimeToSeconds = (line) => {
        // Try hh:mm:ss,ms or hh:mm:ss.ms
        let m = line.match(/(\d{2}):(\d{2}):(\d{2})[.,]\d{2,3}/);
        let h = 0;
        let min = 0;
        let s = 0;
        if (m) {
          h = parseInt(m[1], 10);
          min = parseInt(m[2], 10);
          s = parseInt(m[3], 10);
        } else {
          // Try mm:ss,ms or mm:ss.ms
          m = line.match(/(\d{2}):(\d{2})[.,]\d{2,3}/);
          if (!m) return null;
          min = parseInt(m[1], 10);
          s = parseInt(m[2], 10);
        }
        return h * 3600 + min * 60 + s;
      };

      while (i < lines.length) {
        let line = lines[i].trim();
        if (!line) {
          i++;
          continue;
        }

        // Optional numeric cue index
        if (/^\d+$/.test(line)) {
          i++;
          line = lines[i]?.trim() || "";
        }

        // Timecode line
        if (!line.includes("-->")) {
          i++;
          continue;
        }

        const sec = parseTimeToSeconds(line);
        if (sec == null) {
          i++;
          continue;
        }

        const total = Math.max(0, sec);
        const mm = String(Math.floor(total / 60)).padStart(2, "0");
        const ss = String(total % 60).padStart(2, "0");
        const tag = `[${mm}:${ss}]`;

        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim()) {
          textLines.push(lines[i].trim());
          i++;
        }
        const text = textLines.join(" ");
        if (text) out.push(`${tag} ${text}`);
        i++;
      }

      return out.join("\n").trim();
    }

    // Plain text file – no timing, keep raw
    return normalized.trim();
  };

  const onLyricsFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setLyricsText(parseLyricsFile(text, file.name));
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const displayImagePath =
    imagePath !== undefined ? imagePath : track?.image_path;
  const displayImageUrl = displayImagePath
    ? getImageUrl(displayImagePath)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("נא להזין כותרת");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updateTrack(track.id, {
        title: title.trim(),
        artist_id: artistId ? parseInt(artistId, 10) : undefined,
        album_id: albumId ? parseInt(albumId, 10) : undefined,
        featured_artist_ids: featuredArtistIds,
        image_path: imagePath,
        lyrics_text: lyricsText.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "עדכון נכשל");
    } finally {
      setLoading(false);
    }
  };

  if (!track) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>עריכת שיר</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            כותרת *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          <label className={styles.label}>
            אומן
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className={styles.input}
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
            אלבום
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className={styles.input}
            >
              <option value="">ללא אלבום</option>
              {albums.map((al) => (
                <option key={al.id} value={al.id}>
                  {al.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            אמנים משניים
            <select
              multiple
              value={featuredArtistIds.map(String)}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => parseInt(o.value, 10)
                );
                setFeaturedArtistIds(selected);
              }}
              className={styles.input}
            >
              {artists
                .filter((a) => a.id !== (artistId ? parseInt(artistId, 10) : null))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <span className={styles.hint}>החזק Ctrl/Cmd לבחירה מרובה</span>
          </label>
          <label className={styles.label}>
            מילות השיר
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              className={styles.lyricsTextarea}
              placeholder="הדבק טקסט או העלה קובץ (.txt, .lrc, .srt, .vtt)"
              rows={6}
            />
            <div className={styles.lyricsFileRow}>
              <input
                type="file"
                accept=".txt,.lrc,.srt,.vtt,text/plain"
                onChange={onLyricsFileChange}
                className={styles.fileInput}
              />
            </div>
          </label>
          <div className={styles.imageRow}>
            <span className={styles.label}>תמונת כיסוי</span>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className={styles.fileInput}
            />
            {(displayImageUrl || imagePath !== undefined) && (
              <div className={styles.previewWrap}>
                {displayImageUrl && (
                  <img
                    src={displayImageUrl}
                    alt=""
                    className={styles.preview}
                  />
                )}
                {imagePath === null && (
                  <span className={styles.removedLabel}>תמונה הוסרה</span>
                )}
                {(displayImageUrl || (imagePath && imagePath !== null)) && (
                  <button
                    type="button"
                    className={styles.removeImg}
                    onClick={() => setImagePath(null)}
                  >
                    הסר תמונה
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "שומר..." : "שמור"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
