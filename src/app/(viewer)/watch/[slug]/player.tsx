"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { rentalWindowLabel } from "@/lib/library/format";

interface Session {
  playbackId: string;
  tokens: { playback: string | null; thumbnail: string | null; storyboard: string | null; drm: string | null };
  startTime: number;
  subtitles: { src: string; label: string; lang: string }[];
}

const HEARTBEAT_MS = 30_000;

/**
 * Asks for playback tokens only when the viewer presses play, which is when a rental's
 * clock starts (D51). Casting: Mux Player's built-in Chromecast and AirPlay buttons
 * (without DRM during the beta, D44; a custom DRM receiver is T012).
 * Mux Data gets the film id and title but never a viewer id, and no cookies (VPPA).
 */
export function Player(props: { filmId: string; title: string; posterUrl: string | null; rentalNotStarted: boolean; rentalHours: number | null }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const position = useRef(0);
  const playing = useRef(false);

  const send = useCallback(
    (event: "start" | "heartbeat" | "pause" | "end") => {
      const body = JSON.stringify({ filmId: props.filmId, position: position.current, event });
      fetch("/api/playback/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    },
    [props.filmId],
  );

  useEffect(() => {
    const t = setInterval(() => playing.current && send("heartbeat"), HEARTBEAT_MS);
    const hide = () => document.visibilityState === "hidden" && playing.current && send("pause");
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [send]);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/playback/${props.filmId}/token`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(body.error ?? "This film can't play right now.");
    position.current = body.startTime ?? 0;
    setSession(body);
  }

  if (!session) {
    return (
      <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#3b2f22,#0f0e0c_70%)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.posterUrl ? <img src={props.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
        <div className="relative grid justify-items-center gap-3 px-4 text-center">
          <button onClick={start} disabled={loading} className="btn-primary px-8 py-4 text-base" aria-label={`Play ${props.title}`}>
            {loading ? "Loading…" : "▶ Play"}
          </button>
          {props.rentalNotStarted ? (
            <p className="text-sm text-muted">Pressing play starts your {rentalWindowLabel(props.rentalHours ?? 48)} rental.</p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-bad">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <MuxPlayer
      className="aspect-video w-full overflow-hidden rounded-2xl"
      playbackId={session.playbackId}
      tokens={{
        playback: session.tokens.playback ?? undefined,
        thumbnail: session.tokens.thumbnail ?? undefined,
        storyboard: session.tokens.storyboard ?? undefined,
        drm: session.tokens.drm ?? undefined,
      }}
      streamType="on-demand"
      title={props.title}
      startTime={session.startTime}
      autoPlay
      accentColor="#e8a33d"
      disableCookies
      metadata={{ video_id: props.filmId, video_title: props.title }}
      onPlay={() => {
        playing.current = true;
        send("start");
      }}
      onPause={() => {
        playing.current = false;
        send("pause");
      }}
      onEnded={() => {
        playing.current = false;
        send("end");
      }}
      onTimeUpdate={(e) => {
        position.current = (e.target as HTMLMediaElement).currentTime ?? position.current;
      }}
    >
      {session.subtitles.map((s) => (
        <track key={s.src} kind="subtitles" src={s.src} label={s.label} srcLang={s.lang} />
      ))}
    </MuxPlayer>
  );
}
