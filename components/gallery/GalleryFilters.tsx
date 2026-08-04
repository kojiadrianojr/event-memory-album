"use client";

import CalendarNav from "@/components/gallery/CalendarNav";
import GalleryViewToggle from "@/components/gallery/GalleryViewToggle";
import UploaderFilterBar from "@/components/gallery/UploaderFilterBar";
import { EventMoment } from "@/components/gallery/types";
import type { GalleryViewMode } from "@/lib/gallery-view-storage";

interface GalleryFiltersProps {
  moments: EventMoment[];
  selectedMomentId: string | null;
  onSelectMoment: (id: string | null) => void;
  uploaderFilter: { name: string; label: string } | null;
  clearUploaderHref: string;
  days: string[];
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
}

function MomentTabs({
  moments,
  selectedMomentId,
  onSelectMoment,
}: {
  moments: EventMoment[];
  selectedMomentId: string | null;
  onSelectMoment: (id: string | null) => void;
}) {
  const items = [{ id: null, name: "All" }, ...moments.map((m) => ({ id: m.id, name: m.name }))];
  const useSegmented = items.length <= 4;

  if (useSegmented) {
    return (
      <div className="flex rounded-xl bg-zinc-100 p-1">
        {items.map((item) => {
          const active =
            item.id === null
              ? selectedMomentId === null
              : selectedMomentId === item.id;
          return (
            <button
              key={item.id ?? "all"}
              type="button"
              onClick={() => onSelectMoment(item.id)}
              className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                active
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {items.map((item) => {
        const active =
          item.id === null
            ? selectedMomentId === null
            : selectedMomentId === item.id;
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            onClick={() => onSelectMoment(item.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

export default function GalleryFilters({
  moments,
  selectedMomentId,
  onSelectMoment,
  uploaderFilter,
  clearUploaderHref,
  days,
  selectedDay,
  onSelectDay,
  viewMode,
  onViewModeChange,
}: GalleryFiltersProps) {
  const showMoments = moments.length > 0;
  const showDays = days.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <GalleryViewToggle mode={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      {uploaderFilter && (
        <UploaderFilterBar
          name={uploaderFilter.name}
          label={uploaderFilter.label}
          clearHref={clearUploaderHref}
        />
      )}

      {showMoments && (
        <MomentTabs
          moments={moments}
          selectedMomentId={selectedMomentId}
          onSelectMoment={onSelectMoment}
        />
      )}

      {showDays && (
        <CalendarNav
          days={days}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          variant="cards"
        />
      )}
    </div>
  );
}

export const GALLERY_DAY_SCROLL_MARGIN = "scroll-mt-20";
