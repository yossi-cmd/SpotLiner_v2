"use client";

import { useEffect, useRef, useState } from "react";
import { getStreamUrl, updateTrack } from "@/lib/api";
import styles from "./EditLyricsModal.module.css";

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return "0:00";
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function secondsToTag(sec) {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `[${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}]`;
}

function parseLrc(lyricsText) {
  if (!lyricsText) return [];
  const lines = lyricsText
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
    out.push({
      id: `${min * 60 + sec}-${out.length}`,
      timeSec: min * 60 + sec,
      text,
    });
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

/** Parse raw text (LRC lines or plain lines) into lines array. Plain lines get timeSec 0. */
function parseTextToLines(rawText) {
  if (!rawText || !String(rawText).trim()) return [];
  const input = String(rawText)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const out = [];
  for (let i = 0; i < input.length; i++) {
    const line = input[i];
    const m = line.match(/^\s*\[(\d{1,2}):(\d{2})(?:\.\d+)?]\s*(.*)$/);
    const text = m ? (m[3] || "").trim() : line.trim();
    if (!text) continue;
    const timeSec = m
      ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
      : 0;
    out.push({
      id: `line-${i}-${timeSec}`,
      timeSec,
      text,
    });
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

function linesToLrc(lines) {
  return lines
    .filter((l) => (l.text || "").trim())
    .sort((a, b) => a.timeSec - b.timeSec)
    .map((l) => `${secondsToTag(l.timeSec)} ${(l.text || "").trim()}`)
    .join("\n");
}

export default function EditLyricsModal({ track, onClose, onSaved }) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lines, setLines] = useState(() =>
    parseLrc(track?.lyrics_text || "")
  );
  const [viewMode, setViewMode] = useState("visual");
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLines(parseLrc(track?.lyrics_text || ""));
    setCurrentTime(0);
  }, [track?.id]);

  const switchToText = () => {
    setRawText(linesToLrc(lines));
    setViewMode("text");
  };

  const switchToVisual = () => {
    const parsed = parseTextToLines(rawText);
    setLines(parsed.length ? parsed : lines);
    setViewMode("visual");
  };

  if (!track) return null;

  const addLineAtCurrent = () => {
    const el = audioRef.current;
    const t = el ? el.currentTime || 0 : currentTime || 0;
    const sec = Math.max(0, Math.round(t));
    const newLine = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timeSec: sec,
      text: "",
    };
    setLines((prev) =>
      [...prev, newLine].sort((a, b) => a.timeSec - b.timeSec)
    );
  };

  const updateLine = (id, patch) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, ...patch } : l))
        .sort((a, b) => a.timeSec - b.timeSec)
    );
  };

  const removeLine = (id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const seekTo = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, sec);
    el.play().catch(() => {});
  };

  const setLineTimeToCurrent = (id) => {
    const el = audioRef.current;
    const t = el ? el.currentTime || 0 : currentTime || 0;
    const sec = Math.max(0, Math.round(t));
    updateLine(id, { timeSec: sec });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const effectiveLines =
        viewMode === "text"
          ? parseTextToLines(rawText)
          : lines
              .map((l) => ({ ...l, text: (l.text || "").trim() }))
              .filter((l) => l.text);
      const lrc = effectiveLines.length
        ? linesToLrc(effectiveLines)
        : "";

      await updateTrack(track.id, {
        lyrics_text: lrc || null,
      });
      if (onSaved) onSaved(lrc);
      onClose();
    } catch (e) {
      setError(e.message || "שמירת כתוביות נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>עריכת כתוביות – {track.title}</h2>

        <div className={styles.audioRow}>
          <audio
            ref={audioRef}
            src={getStreamUrl(track.id)}
            controls
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime || 0)}
          />
          <div className={styles.timeInfo}>
            <span>זמן נוכחי: {formatTime(currentTime)}</span>
            <button
              type="button"
              className={styles.addBtn}
              onClick={addLineAtCurrent}
            >
              הוסף שורה בזמן הנוכחי
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.viewModeTabs}>
          <button
            type="button"
            className={viewMode === "visual" ? styles.viewTabActive : styles.viewTab}
            onClick={() => viewMode === "text" && switchToVisual()}
          >
            עריכה ויזואלית
          </button>
          <button
            type="button"
            className={viewMode === "text" ? styles.viewTabActive : styles.viewTab}
            onClick={() => viewMode === "visual" && switchToText()}
          >
            עריכה כטקסט
          </button>
        </div>

        {viewMode === "text" ? (
          <div className={styles.textEditorWrap}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className={styles.rawTextarea}
              placeholder="שורות עם [דקה:שנייה] או בלי זמנים. מעבר לעריכה ויזואלית יעדכן את הרשימה ואפשר להוסיף זמנים שם."
              rows={14}
            />
            <p className={styles.textEditorHint}>
              ניתן להדביק קובץ שורות (עם או בלי [mm:ss]). בלחיצה על &quot;עריכה ויזואלית&quot; יופיעו השורות ואפשר להוסיף זמנים.
            </p>
          </div>
        ) : (
          <>
        <div className={styles.linesHeader}>
          <span className={styles.colTime}>שנייה</span>
          <span className={styles.colText}>טקסט</span>
        </div>
        <div className={styles.linesList}>
          {lines.length === 0 && (
            <div className={styles.empty}>
              אין שורות – התחל בלחיצה על הכפתור למעלה.
            </div>
          )}
          {lines.map((line) => (
            <div key={line.id} className={styles.lineRow}>
              <div className={styles.timeCell}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={Number.isFinite(line.timeSec) ? line.timeSec : ""}
                  onChange={(e) =>
                    updateLine(line.id, {
                      timeSec: Math.max(
                        0,
                        parseInt(e.target.value || "0", 10)
                      ),
                    })
                  }
                  className={styles.timeInput}
                />
                <span className={styles.timePreview}>
                  {secondsToTag(line.timeSec)} ({formatTime(line.timeSec)})
                </span>
                <button
                  type="button"
                  className={styles.seekBtn}
                  onClick={() => seekTo(line.timeSec)}
                >
                  נגן מפה
                </button>
                <button
                  type="button"
                  className={styles.setCurrentBtn}
                  onClick={() => setLineTimeToCurrent(line.id)}
                >
                  הגדר שנייה נוכחית
                </button>
              </div>
              <div className={styles.textCell}>
                <input
                  value={line.text}
                  onChange={(e) =>
                    updateLine(line.id, { text: e.target.value })
                  }
                  className={styles.textInput}
                  placeholder="טקסט השורה"
                />
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeLine(line.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
          </>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "שומר..." : "שמור כתוביות (LRC)"}
          </button>
        </div>
      </div>
    </div>
  );
}

