"use client";

import type { ReactNode } from "react";

export type MemoryType = "media" | "text" | "audio";

interface MemoryTypePickerProps {
  value: MemoryType;
  onChange: (type: MemoryType) => void;
}

const OPTIONS: {
  id: MemoryType;
  label: string;
  helper: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "media",
    label: "Photos & videos",
    helper: "Up to 10 per post",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? 0 : 1.75}
        aria-hidden
      >
        {active ? (
          <>
            <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            <circle cx="8.5" cy="9.5" r="1.5" fill="white" />
            <path
              d="M4 16l4-4 3 3 5-6 4 4"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M4 16l4-4 3 3 5-6 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    ),
  },
  {
    id: "text",
    label: "Write",
    helper: "Story, toast, note",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {active ? (
          <path d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm2 4h10v1.5H7V8zm0 3.5h10V13H7v-1.5zm0 3.5h6V17H7v-1.5z" />
        ) : (
          <>
            <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </>
        )}
      </svg>
    ),
  },
  {
    id: "audio",
    label: "Voice",
    helper: "Record or upload audio",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {active ? (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0" fill="none" stroke="white" strokeWidth="2" />
            <path d="M12 18v3" fill="none" stroke="white" strokeWidth="2" />
          </>
        ) : (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0" />
            <path d="M12 18v3" />
          </>
        )}
      </svg>
    ),
  },
];

export default function MemoryTypePicker({
  value,
  onChange,
}: MemoryTypePickerProps) {
  return (
    <div
      role="tablist"
      aria-label="Memory type"
      className="grid grid-cols-3 gap-2"
    >
      {OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {option.icon(active)}
            <span className={`text-xs font-medium leading-tight ${active ? "text-white" : "text-zinc-800"}`}>
              {option.label}
            </span>
            <span
              className={`text-[10px] leading-tight ${active ? "text-zinc-300" : "text-zinc-400"}`}
            >
              {option.helper}
            </span>
          </button>
        );
      })}
    </div>
  );
}
