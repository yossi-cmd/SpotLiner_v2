import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

function extractPlaylistId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const s = urlOrId.trim();
  const listMatch = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const id = searchParams.get("id");
  const playlistId = id || extractPlaylistId(url);

  if (!playlistId) {
    return NextResponse.json(
      { error: "url or id required (e.g. ?url=https://youtube.com/playlist?list=PLxxx or ?id=PLxxx)" },
      { status: 400 }
    );
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const [playlistRes, itemsRes] = await Promise.all([
      fetch(
        `${BASE}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${YOUTUBE_API_KEY}`
      ),
      fetch(
        `${BASE}/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${YOUTUBE_API_KEY}`
      ),
    ]);

    const [playlistData, itemsData] = await Promise.all([
      playlistRes.json(),
      itemsRes.json(),
    ]);

    if (playlistData.error) {
      const msg = playlistData.error.message || "YouTube API error";
      const code = playlistData.error.code;
      return NextResponse.json(
        { error: msg, code },
        { status: code === 403 ? 403 : 400 }
      );
    }

    const pl = playlistData.items?.[0];
    const title = pl?.snippet?.title || "אלבום";
    const thumbnails = pl?.snippet?.thumbnails || {};
    const thumbnailUrl =
      thumbnails.maxres?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null;

    const items = [];
    let nextPageToken = itemsData.nextPageToken;
    let currentItems = itemsData.items || [];

    const pushItems = (list) => {
      for (const it of list || []) {
        const vid = it.snippet?.resourceId?.videoId;
        const t = it.snippet?.title;
        if (vid) items.push({ videoId: vid, title: t || "—" });
      }
    };
    pushItems(currentItems);

    while (nextPageToken) {
      const nextRes = await fetch(
        `${BASE}/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&pageToken=${encodeURIComponent(nextPageToken)}&key=${YOUTUBE_API_KEY}`
      );
      const nextData = await nextRes.json();
      nextPageToken = nextData.nextPageToken;
      pushItems(nextData.items);
    }

    return NextResponse.json({
      title,
      thumbnailUrl,
      items,
    });
  } catch (err) {
    console.error("YouTube playlist fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}
