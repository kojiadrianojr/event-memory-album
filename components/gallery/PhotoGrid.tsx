"use client";

import { FlatMediaItem } from "./types";
import PhotoGridTile from "./PhotoGridTile";

interface PhotoGridProps {
  items: FlatMediaItem[];
  onItemClick: (index: number) => void;
}

export default function PhotoGrid({ items, onItemClick }: PhotoGridProps) {
  const countLabel = items.length === 1 ? "1 photo" : `${items.length} photos`;

  return (
    <div className="pb-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        {countLabel}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4">
        {items.map((item, index) => (
          <PhotoGridTile
            key={item.media.id}
            item={item}
            onClick={() => onItemClick(index)}
          />
        ))}
      </div>
    </div>
  );
}
