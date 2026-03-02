const FEATURED_SUB = `(SELECT COALESCE(json_agg(json_build_object('id', fa.id, 'name', fa.name) ORDER BY tfa.position), '[]'::json) FROM track_featured_artists tfa JOIN artists fa ON fa.id = tfa.artist_id WHERE tfa.track_id = t.id)`;

export function getTracksListSelect() {
  return `SELECT t.id, t.title,
    a.name AS artist,
    al.name AS album,
    t.duration_seconds,
    t.created_at,
    t.uploaded_by,
    t.artist_id,
    t.album_id,
    t.image_path,
    COALESCE(t.image_path, al.image_path, a.image_path) AS cover_image_path,
    ${FEATURED_SUB} AS featured_artists
    FROM tracks t
    LEFT JOIN albums al ON t.album_id = al.id
    LEFT JOIN artists a ON t.artist_id = a.id`;
}
