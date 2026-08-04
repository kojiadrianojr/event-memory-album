"use client";

import GuestAvatar from "@/components/ui/GuestAvatar";
import VideoPlayer from "@/components/media/VideoPlayer";
import { mimeFromUrl } from "@/lib/mime-from-url";
import {
  mediaFileUrl,
  mediaPlaybackUrl,
  mediaPosterUrl,
} from "@/lib/media-url";
import { FlatMediaItem } from "./types";

interface PhotoGridTileProps {
  item: FlatMediaItem;
  onClick: () => void;
}

export default function PhotoGridTile({ item, onClick }: PhotoGridTileProps) {
  const { post, media } = item;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 ring-offset-2 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-[0.98]"
      aria-label={post.caption ?? `Photo by ${post.uploaderName}`}
    >
      {media.type === "VIDEO" && media.url ? (
        <VideoPlayer
          src={mediaPlaybackUrl(media)}
          poster={mediaPosterUrl(media)}
          mimeType={mimeFromUrl(media.url, "video", "video/mp4")}
          className="h-full w-full"
          compact
          onExpand={onClick}
        />
      ) : media.type === "PHOTO" && media.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaFileUrl(media.id, { thumb: true })}
          alt={post.caption ?? `Photo by ${post.uploaderName}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : null}

      {media.type === "VIDEO" && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Video
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-2 pt-8">
        <GuestAvatar name={post.uploaderName} size="xs" />
        <span className="min-w-0 truncate text-[11px] font-medium text-white/90">
          {post.uploaderName}
        </span>
      </div>
    </button>
  );
}
