"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "master" | "trailer" | "clip";

/** Reads a video file's duration in the browser (used for the dev provider and for limit hints). */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(Number.isFinite(el.duration) ? el.duration : null);
    };
    el.onerror = () => resolve(null);
    el.src = URL.createObjectURL(file);
  });
}

/**
 * Uploads straight from the browser to the video host. Mux uploads go through UpChunk
 * (resumable 30 MB chunks with retries); the dev provider takes a single PUT.
 */
export function Uploader({ filmId, kind, label, disabled, hint }: { filmId: string; kind: Kind; label: string; disabled?: string; hint?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  async function start() {
    const file = input.current?.files?.[0];
    if (!file) return setError("Choose a video file.");
    setError("");
    setProgress(0);
    const res = await fetch(`/api/films/${filmId}/uploads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, label: name || undefined }),
    });
    const body = await res.json();
    if (!res.ok) {
      setProgress(null);
      return setError(body.error ?? "Couldn't start the upload.");
    }

    if (body.provider === "mux") {
      const { createUpload } = await import("@mux/upchunk");
      const up = createUpload({ endpoint: body.uploadUrl, file, chunkSize: 30720, dynamicChunkSize: true });
      up.on("progress", (e) => setProgress(Math.round(e.detail)));
      up.on("error", (e) => {
        setProgress(null);
        setError(`Upload failed: ${e.detail.message}`);
      });
      up.on("success", () => {
        setProgress(100);
        router.refresh();
      });
    } else {
      const duration = await readDuration(file);
      const put = await fetch(body.uploadUrl, {
        method: "PUT",
        body: file,
        headers: duration ? { "x-duration": String(Math.round(duration)) } : {},
      });
      setProgress(put.ok ? 100 : null);
      if (!put.ok) setError("Upload failed.");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-dashed border-line p-4">
      <p className="label">{label}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {disabled ? (
        <p className="text-sm text-warn">{disabled}</p>
      ) : (
        <>
          {kind !== "master" ? (
            <input
              aria-label={`${label} name`}
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          ) : null}
          <input ref={input} type="file" accept="video/*,.mov,.mxf" aria-label={`${label} file`} className="text-sm" />
          <button type="button" onClick={start} disabled={progress !== null && progress < 100} className="btn-ghost justify-self-start">
            {progress !== null && progress < 100 ? `Uploading… ${progress}%` : "Upload"}
          </button>
          {progress !== null ? (
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
