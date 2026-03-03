"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/playerStore";
import {
  IconSkipPrev,
  IconPlay,
  IconPause,
  IconSkipNext,
  IconVolume,
} from "@/components/Icons";
import styles from "./NowPlaying.module.css";

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseLrcLines(lyricsText) {
  if (!lyricsText || !String(lyricsText).trim()) return [];
  const lines = String(lyricsText)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*\[(\d{1,2}):(\d{2})(?:\.\d+)?]\s*(.*)$/);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const text = (m[3] || "").trim();
    if (!text) continue;
    out.push({ timeSec: min * 60 + sec, text });
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

function getPlainLyricsLines(lyricsText) {
  if (!lyricsText || !String(lyricsText).trim()) return [];
  return String(lyricsText)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ timeSec: 0, text }));
}

export default function NowPlayingPage() {
  const router = useRouter();
  const lyricsScrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    progress,
    duration,
    volume,
    setCurrentTrack,
    setIsPlaying,
    setVolume,
    setSeekTime,
    next,
    prev,
    getCurrentFromQueue,
  } = usePlayerStore();

  const track = currentTrack || getCurrentFromQueue();
  const hasLrc = track?.lyrics_text && /\[\d{1,2}:\d{2}/.test(track.lyrics_text);
  const lyricLines = track?.lyrics_text
    ? hasLrc
      ? parseLrcLines(track.lyrics_text)
      : getPlainLyricsLines(track.lyrics_text)
    : [];
  const activeIndex =
    lyricLines.length && hasLrc
      ? lyricLines.findIndex((l, i) => {
          const nextTime =
            i < lyricLines.length - 1 ? lyricLines[i + 1].timeSec : 1e9;
          return progress >= l.timeSec && progress < nextTime;
        })
      : -1;

  useEffect(() => {
    if (activeIndex >= 0 && activeLineRef.current && lyricsScrollRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!track) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>אין שיר שמתנגן</p>
          <Link href="/" className={styles.emptyLink}>
            בחר שיר להאזנה
          </Link>
        </div>
      </div>
    );
  }

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.right - e.clientX;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const t = pct * duration;
    setSeekTime(t);
  };

  return (
    <div className={styles.page}>
      <div className={styles.back}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="חזור"
        >
          ←
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          <h1 className={styles.title}>{track.title}</h1>
          {track.artist_id ? (
            <Link
              href={`/artist/${track.artist_id}`}
              className={styles.artist}
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist}
            </Link>
          ) : (
            <span className={styles.artist}>{track.artist}</span>
          )}
        </div>
        <div className={styles.rightCol}>
          <div className={styles.artworkWrap}>
            <div className={styles.artwork}>
              {(track.cover_image_path || track.image_path) ? (
                <img
                  src={getImageUrl(track.cover_image_path || track.image_path)}
                  alt=""
                  className={styles.artworkImg}
                />
              ) : (
                <div className={styles.artworkPlaceholder} />
              )}
            </div>
          </div>
        </div>
        <div className={styles.leftCol}>
          {lyricLines.length > 0 ? (
            <div className={styles.lyricsWrap} ref={lyricsScrollRef}>
              <div className={styles.lyricsList}>
                {lyricLines.map((line, i) => (
                  <p
                    key={`${line.timeSec}-${i}`}
                    ref={activeIndex >= 0 && i === activeIndex ? activeLineRef : null}
                    className={`${styles.lyricLine} ${activeIndex >= 0 && i === activeIndex && hasLrc ? styles.lyricLineActive : ""}`}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.noLyrics}>אין מילות שיר</div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.ctrlBtns}>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setCurrentTrack(prev() || track)}
            aria-label="הקודם"
          >
            <IconSkipPrev />
          </button>
          <button
            type="button"
            className={styles.playBtn}
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "השהה" : "השמע"}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setCurrentTrack(next() || track)}
            aria-label="הבא"
          >
            <IconSkipNext />
          </button>
        </div>
        <div className={styles.progressSection}>
          <span className={styles.time}>{formatTime(progress)}</span>
          <div
            className={styles.progressWrap}
            onClick={handleSeek}
            role="progressbar"
            aria-valuenow={progressPct}
          >
            <div
              className={styles.progressBar}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className={styles.time}>
            {formatTime(duration || track.duration_seconds)}
          </span>
        </div>
        <div className={styles.volumeWrap}>
          <span className={styles.volIcon}>
            <IconVolume />
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={styles.volume}
          />
        </div>
      </div>
    </div>
  );
}
