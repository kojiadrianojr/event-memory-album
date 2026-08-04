"use client";

import { useEffect, useRef, useState } from "react";
import type Plyr from "plyr";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  mimeType?: string;
  className?: string;
  compact?: boolean;
  /** Fill the parent for lightbox / fullscreen viewing. */
  fill?: boolean;
  onExpand?: () => void;
}

export default function VideoPlayer({
  src,
  poster,
  mimeType = "video/mp4",
  className = "",
  compact = false,
  fill = false,
  onExpand,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    async function initPlayer() {
      const [{ default: PlyrConstructor }, _css] = await Promise.all([
        import("plyr"),
        import("plyr/dist/plyr.css"),
      ]);
      void _css;

      if (cancelled || !videoRef.current) return;

      const controls = compact
        ? ["play", "progress", "mute", "fullscreen"]
        : [
            "play-large",
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            ...(fill ? [] : ["fullscreen"]),
          ];

      const player = new PlyrConstructor(videoRef.current, {
        controls,
        ratio: compact || fill ? undefined : "16:9",
        clickToPlay: true,
        hideControls: false,
      });

      player.source = {
        type: "video",
        sources: [{ src, type: mimeType }],
        poster,
      };

      playerRef.current = player;
    }

    void initPlayer();

    return () => {
      cancelled = true;
      const player = playerRef.current;
      const video = videoRef.current;
      playerRef.current = null;
      try {
        player?.pause();
      } catch {
        // Ignore — player may already be tearing down.
      }
      player?.destroy();
      // Detach from Safari MediaController before GC. Otherwise WebKit can
      // throw "Can't find variable: EmptyRanges" (bug 318284) after delete.
      if (video) {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {
          // Ignore teardown races in WebKit media controls.
        }
      }
    };
  }, [compact, fill, mounted, src, mimeType, poster]);

  const shellClass = compact
    ? "[&_.plyr]:h-full [&_.plyr__video-wrapper]:h-full"
    : fill
      ? "[&_.plyr]:flex [&_.plyr]:h-full [&_.plyr]:max-h-full [&_.plyr]:w-full [&_.plyr]:max-w-full [&_.plyr__video-wrapper]:h-full [&_.plyr__video-wrapper]:max-h-full [&_.plyr__video-wrapper]:w-full [&_.plyr__poster]:object-contain [&_video]:h-full [&_video]:max-h-full [&_video]:w-full [&_video]:object-contain"
      : "";

  if (!mounted) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-900 ${shellClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className={
              compact
                ? "aspect-square w-full"
                : fill
                  ? "h-full min-h-[12rem] w-full"
                  : "aspect-video w-full"
            }
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${shellClass} ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <video ref={videoRef} playsInline poster={poster} className="w-full" />
      {onExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute right-2 top-2 z-10 rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Expand video"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
