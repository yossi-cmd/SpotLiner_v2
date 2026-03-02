 "use client";

 import Link from "next/link";
 import { getImageUrl } from "@/lib/api";
 import styles from "./ArtistCard.module.css";
 import { IconPlay } from "./Icons";

 export default function ArtistCard({ artist, href, onPlay }) {
   if (!artist) return null;

   const handlePlayClick = (e) => {
     if (!onPlay) return;
     // Allow parent to control queue logic and prevent navigation
     onPlay(artist.id, e);
   };

   const Wrapper = href ? Link : "div";
   const wrapperProps = href
     ? { href, className: styles.card }
     : { className: styles.card };

   return (
     <Wrapper {...wrapperProps}>
       <div className={styles.imgWrap}>
         {artist.image_path ? (
           <img src={getImageUrl(artist.image_path)} alt={artist.name || ""} />
         ) : (
           <span className={styles.placeholder}>♪</span>
         )}
       </div>
       <span className={styles.name}>{artist.name}</span>
       {onPlay && (
         <button
           type="button"
           className={styles.playOverlayBtn}
           onClick={handlePlayClick}
           aria-label={`השמע את כל שירי האומן ${artist.name || ""}`}
         >
           <IconPlay />
         </button>
       )}
     </Wrapper>
   );
 }

