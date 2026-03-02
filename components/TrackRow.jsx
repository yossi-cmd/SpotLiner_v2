"use client";

import { usePlayerStore } from "@/lib/store/playerStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import {
  addFavorite,
  removeFavorite,
  getPlaylists,
  addTrackToPlaylist,
  getImageUrl,
} from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  IconMusic,
  IconHeart,
  IconPlus,
  IconPlaylist,
  IconEdit,
  IconTrash,
  IconMoreVertical,
} from "./Icons";
import styles from "./TrackRow.module.css";

const TRACK_MENU_CLOSE_ALL = "trackMenuCloseAll";

export default function TrackRow({
  track,
  index,
  showAlbum = true,
  hideArtwork = false,
  playlistId,
  onRemoveFromPlaylist,
  canEditTrack,
  onEditTrack,
  onDeleteTrack,
}) {
  const {
    setCurrentTrack,
    setQueue,
    setQueueIndex,
    addToQueue,
    currentTrack,
    setIsPlaying,
  } = usePlayerStore();
  const { user } = useAuthStore();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const addFavoriteId = useFavoritesStore((s) => s.addFavorite);
  const removeFavoriteId = useFavoritesStore((s) => s.removeFavorite);
  const isFavorite =
    favoriteIds.has(track.id) || favoriteIds.has(Number(track.id));
  const [favLoading, setFavLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [playlists, setPlaylists] = useState([]);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const isActive = currentTrack?.id === track.id;

  useEffect(() => {
    if (!menuOpen || !user) return;
    getPlaylists()
      .then((r) => setPlaylists(r.playlists || []))
      .catch(() => setPlaylists([]));
  }, [menuOpen, user]);

  useEffect(() => {
    const closeAll = () => setMenuOpen(false);
    window.addEventListener(TRACK_MENU_CLOSE_ALL, closeAll);
    return () => window.removeEventListener(TRACK_MENU_CLOSE_ALL, closeAll);
  }, []);

  const openMenu = (e) => {
    window.dispatchEvent(new CustomEvent(TRACK_MENU_CLOSE_ALL));
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const clickX = e?.clientX ?? rect.left;
      setMenuPosition({ top: rect.bottom + 4, left: clickX });
    }
    setTimeout(() => setMenuOpen(true), 0);
  };

  useEffect(() => {
    const close = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inTrigger && !inDropdown) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const play = () => {
    setQueue([track], 0);
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const addToQueueClick = (e) => {
    e.stopPropagation();
    addToQueue(track);
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user || favLoading) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(track.id);
        removeFavoriteId(track.id);
      } else {
        await addFavorite(track.id);
        addFavoriteId(track.id);
      }
    } catch {
      // ignore
    } finally {
      setFavLoading(false);
    }
  };

  function formatDuration(sec) {
    if (sec == null) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const showMenu =
    (canEditTrack && (onEditTrack || onDeleteTrack)) ||
    user ||
    (playlistId && onRemoveFromPlaylist);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={play}
      onKeyDown={(e) => e.key === "Enter" && play()}
      className={`${styles.row} ${showAlbum ? "" : styles.noAlbum} ${hideArtwork ? styles.hideArtwork : ""} ${isActive ? styles.active : ""}`}
    >
      <span className={styles.index}>
        {index != null ? index + 1 : "—"}
      </span>
      <div className={styles.artwork}>
        {(track.cover_image_path || track.image_path) ? (
          <img
            src={getImageUrl(track.cover_image_path || track.image_path)}
            alt=""
            className={styles.artworkImg}
          />
        ) : (
          <IconMusic />
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.title}>{track.title}</span>
        {track.artist_id ? (
          <Link
            href={`/artist/${track.artist_id}`}
            className={styles.artist}
            onClick={(e) => e.stopPropagation()}
          >
            {track.artist || "—"}
          </Link>
        ) : (
          <span className={styles.artist}>{track.artist || "—"}</span>
        )}
        {Array.isArray(track.featured_artists) &&
          track.featured_artists.length > 0 && (
            <span className={styles.artist}>
              {" feat. "}
              {track.featured_artists.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/artist/${a.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
            </span>
          )}
      </div>
      {showAlbum && (
        <div className={styles.album}>
          {track.album_id ? (
            <Link
              href={`/album/${track.album_id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {track.album || "—"}
            </Link>
          ) : (
            <span>{track.album || "—"}</span>
          )}
        </div>
      )}
      <span className={styles.duration}>
        {formatDuration(track.duration_seconds)}
      </span>
      <div className={styles.actions}>
        {user && (
          <div className={styles.actionsInline}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={addToQueueClick}
              aria-label="הוסף לתור"
            >
              <IconPlus />
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={toggleFavorite}
              disabled={favLoading}
              aria-label={isFavorite ? "הסר מאהובים" : "הוסף לאהובים"}
            >
              <IconHeart
                filled={isFavorite}
                style={{ color: isFavorite ? "var(--green)" : undefined }}
              />
            </button>
          </div>
        )}
        {showMenu && (
          <div className={styles.menuWrap} ref={triggerRef}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMenu(e);
              }}
              aria-label="עוד"
            >
              <IconMoreVertical />
            </button>
            {menuOpen &&
              createPortal(
                <div
                  ref={dropdownRef}
                  className={styles.menuDropdown}
                  style={{
                    position: "fixed",
                    top: menuPosition.top,
                    left: menuPosition.left,
                  }}
                >
                  {canEditTrack && onEditTrack && (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEditTrack(track);
                      }}
                    >
                      <IconEdit />
                      ערוך שיר
                    </button>
                  )}
                  {canEditTrack && onDeleteTrack && (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDeleteTrack(track);
                      }}
                    >
                      <IconTrash />
                      מחק שיר
                    </button>
                  )}
                  {user && (
                    <>
                      {(canEditTrack && (onEditTrack || onDeleteTrack)) && (
                        <div className={styles.menuDivider} />
                      )}
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          addToQueueClick(e);
                        }}
                      >
                        <IconPlus />
                        הוסף לתור
                      </button>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          await toggleFavorite(e);
                        }}
                      >
                        <IconHeart
                          filled={isFavorite}
                          style={{ color: isFavorite ? "var(--green)" : undefined }}
                        />
                        {isFavorite ? "הסר מאהובים" : "הוסף לאהובים"}
                      </button>
                      <div className={styles.menuDivider} />
                      <div className={styles.menuSection}>הוסף לפלייליסט</div>
                      {playlists.length === 0 ? (
                        <div className={styles.menuItemDisabled}>
                          אין פלייליסטים
                        </div>
                      ) : (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            className={styles.menuItem}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await addTrackToPlaylist(pl.id, track.id);
                                setMenuOpen(false);
                              } catch {}
                            }}
                          >
                            <IconPlaylist />
                            {pl.name}
                          </button>
                        ))
                      )}
                    </>
                  )}
                  {playlistId && onRemoveFromPlaylist && (
                    <>
                      <div className={styles.menuDivider} />
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onRemoveFromPlaylist(track.id);
                        }}
                      >
                        הסר מפלייליסט
                      </button>
                    </>
                  )}
                </div>,
                document.body
              )}
          </div>
        )}
      </div>
    </div>
  );
}
