"use client";

import { FlatMediaItem } from "./types";
import PhotoGridTile from "./PhotoGridTile";

interface PhotoGridProps {
  items: FlatMediaItem[];
  onItemClick: (index: number) => void;
}

export default function PhotoGrid({ items, onItemClick }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item, index) => (
        <PhotoGridTile
          key={item.media.id}
          item={item}
          onClick={() => onItemClick(index)}
        />
      ))}
    </div>
  );
}
