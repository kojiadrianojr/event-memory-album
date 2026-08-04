"use client";

import type { GalleryViewMode } from "@/lib/gallery-view-storage";

interface GalleryViewToggleProps {
  mode: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
}

export default function GalleryViewToggle({
  mode,
  onChange,
}: GalleryViewToggleProps) {
  const items: { id: GalleryViewMode; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "grid", label: "Grid" },
  ];

  return (
    <div
      className="flex rounded-xl bg-zinc-100 p-1"
      role="group"
      aria-label="Gallery view"
    >
      {items.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={active}
            className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
