"use client";

import { useEffect, useRef } from "react";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

/**
 * Native audio with Safari MediaController teardown.
 * Safari can throw "Can't find variable: EmptyRanges" when controls stay
 * attached after the element is removed (WebKit bug 318284).
 */
export default function AudioPlayer({ src, className }: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    return () => {
      if (!el) return;
      try {
        el.removeAttribute("controls");
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        // Ignore teardown races in WebKit media controls.
      }
    };
  }, [src]);

  return <audio ref={ref} controls src={src} className={className} />;
}
