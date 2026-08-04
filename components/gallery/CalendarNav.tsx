"use client";

import { safeFormatDate } from "@/lib/safe-date";

interface CalendarNavProps {
  days: string[];
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  variant?: "cards" | "compact";
}

export default function CalendarNav({
  days,
  selectedDay,
  onSelectDay,
  variant = "cards",
}: CalendarNavProps) {
  if (days.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {days.map((day) => {
          const dateKey = `${day}T00:00:00`;
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {safeFormatDate(dateKey, "EEE d MMM")}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {days.map((day) => {
        const dateKey = `${day}T00:00:00`;
        const isSelected = day === selectedDay;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`shrink-0 flex min-w-[56px] flex-col items-center rounded-xl px-3 py-2 transition-colors ${
              isSelected
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {safeFormatDate(dateKey, "EEE")}
            </span>
            <span className="text-lg font-bold leading-tight">
              {safeFormatDate(dateKey, "d")}
            </span>
            <span className="text-[10px] opacity-70">
              {safeFormatDate(dateKey, "MMM")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
