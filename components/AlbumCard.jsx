 "use client";

 import Link from "next/link";
 import { getImageUrl } from "@/lib/api";
 import styles from "./AlbumCard.module.css";
 import { IconPlay } from "./Icons";

 export default function AlbumCard({
   album,
   href,
   onPlay,
   showArtistName = true,
 }) {
   if (!album) return null;

   const handlePlayClick = (e) => {
     if (!onPlay) return;
     onPlay(album.id, e);
   };

   const Wrapper = href ? Link : "div";
   const wrapperProps = href
     ? { href, className: styles.card }
     : { className: styles.card };

   return (
     <Wrapper {...wrapperProps}>
       <div className={styles.imgWrap}>
         {album.image_path ? (
           <img src={getImageUrl(album.image_path)} alt={album.name || ""} />
         ) : (
           <span className={styles.placeholder}>♪</span>
         )}
       </div>
       <span className={styles.name}>{album.name}</span>
       {showArtistName && album.artist_name && (
         <span className={styles.artist}>{album.artist_name}</span>
       )}
       {onPlay && (
         <button
           type="button"
           className={styles.playOverlayBtn}
           onClick={handlePlayClick}
           aria-label={`השמע את האלבום ${album.name || ""}`}
         >
           <IconPlay />
         </button>
       )}
     </Wrapper>
   );
 }

