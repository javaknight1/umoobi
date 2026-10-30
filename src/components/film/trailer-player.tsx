"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useRef } from "react";
import { sendPageEvent } from "./beacon";

/**
 * Free trailers and clips (public playback ids). Mux Data is off: no viewer ids leave the
 * page (D38, VPPA).
 */
export function TrailerPlayer({
  filmId,
  playbackId,
  title,
  poster,
}: {
  filmId: string;
  playbackId: string;
  title: string;
  poster?: string | null;
}) {
  const sent = useRef(false);
  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType="on-demand"
      poster={poster ?? undefined}
      metadata={{ video_title: title }}
      disableTracking
      disableCookies
      accentColor="#e8a33d"
      className="aspect-video w-full overflow-hidden rounded-2xl"
      onPlay={() => {
        if (!sent.current) {
          sent.current = true;
          sendPageEvent(filmId, "trailer_play");
        }
      }}
    />
  );
}
