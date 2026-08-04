"use client";

import GuestAvatar from "@/components/ui/GuestAvatar";
import VideoPlayer from "@/components/media/VideoPlayer";
import { mimeFromUrl } from "@/lib/mime-from-url";
import {
  aspectRatioStyleValue,
  photoGridTileClasses,
} from "@/lib/media-aspect";
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
  const spanClasses = photoGridTileClasses(media.width, media.height);
  const ratio = aspectRatioStyleValue(media.width, media.height);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative block w-full overflow-hidden bg-zinc-100 focus:outline-none ${spanClasses}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
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
          className="h-full w-full object-cover"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-1.5 pt-6">
        <GuestAvatar name={post.uploaderName} size="xs" />
      </div>
    </button>
  );
}
