"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import GuestAvatar from "@/components/ui/GuestAvatar";
import SwitchGuestButton from "@/components/ui/SwitchGuestButton";
import EventHeaderTitle from "@/components/event/EventHeaderTitle";
import ChallengeHeaderButton from "@/components/event/ChallengeHeaderButton";
import { ChallengesProvider } from "@/components/gallery/ChallengesContext";
import { useGuestName } from "@/lib/use-guest-name";

interface EventChromeProps {
  token: string;
  eventId: string;
  eventName: string;
  children: React.ReactNode;
}

const TABS = [
  { id: "gallery", label: "Gallery", href: (token: string) => `/event/${token}` },
  {
    id: "upload",
    label: "Upload",
    href: (token: string) => `/event/${token}/upload`,
  },
  {
    id: "wall",
    label: "Guests",
    href: (token: string) => `/event/${token}/wall`,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function NavTabIcon({
  id,
  active,
  className,
}: {
  id: TabId;
  active: boolean;
  className?: string;
}) {
  const svgProps = {
    className,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  if (active) {
    switch (id) {
      case "gallery":
        return (
          <svg {...svgProps} fill="currentColor">
            <path d="M4 6a2 2 0 012-2h9.5L18 6.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            <path
              d="M8 18a2 2 0 01-2-2V8.5L9.5 5H18a2 2 0 012 2v9.5L16.5 20H8z"
              opacity="0.45"
            />
          </svg>
        );
      case "upload":
        return (
          <svg {...svgProps} fill="currentColor">
            <path d="M9 4h6l1.5 2H20a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h3.5L9 4z" />
          </svg>
        );
      case "wall":
        return (
          <svg {...svgProps} fill="currentColor">
            <circle cx="9.5" cy="11" r="3.75" />
            <circle cx="15.5" cy="11" r="3.75" />
          </svg>
        );
    }
  }

  const strokeProps = {
    ...svgProps,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (id) {
    case "gallery":
      return (
        <svg {...strokeProps}>
          <path d="M7 6h9l2 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" />
          <path d="M5 18l3.5-3.5 2.5 2.5 3.5-3.5 3.5 3.5" />
          <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
          <path d="M13 6h5a2 2 0 012 2v3" />
        </svg>
      );
    case "upload":
      return (
        <svg {...strokeProps}>
          <path d="M9 4h6l1.5 2H20a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h3.5L9 4z" />
          <circle cx="12" cy="12.5" r="3.25" />
        </svg>
      );
    case "wall":
      return (
        <svg {...strokeProps}>
          <circle cx="9.5" cy="11" r="3.25" />
          <circle cx="15.5" cy="11" r="3.25" />
          <path d="M5.25 18.25c1-2.35 2.85-3.5 4.25-3.5s3.25 1.15 4.25 3.5" />
        </svg>
      );
  }
}

function activeTab(
  pathname: string,
  token: string,
  searchParams: URLSearchParams
): string {
  if (pathname === `/event/${token}/upload`) return "upload";
  if (pathname === `/event/${token}/wall`) return "wall";
  if (pathname === `/event/${token}` && searchParams.has("uploader")) {
    return "wall";
  }
  return "gallery";
}

function EventChromeInner({
  token,
  eventId,
  eventName,
  children,
}: EventChromeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = activeTab(pathname, token, searchParams);
  const showMine = searchParams.get("mine") === "1";
  const onGallery = pathname === `/event/${token}`;
  const guestName = useGuestName(eventId);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm">
        <EventHeaderTitle eventName={eventName} />
        {guestName && (
          <div className="flex shrink-0 items-center gap-2">
            <ChallengeHeaderButton />
            <Link
              href={
                onGallery
                  ? showMine
                    ? `/event/${token}`
                    : `/event/${token}?mine=1`
                  : `/event/${token}/wall`
              }
              className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-zinc-100 ${
                showMine && onGallery ? "ring-2 ring-zinc-900 ring-offset-1" : ""
              }`}
              title={
                onGallery
                  ? showMine
                    ? "Showing your photos — tap to show all"
                    : `View your photos (${guestName})`
                  : guestName
              }
              aria-current={showMine && onGallery ? "true" : undefined}
            >
              <GuestAvatar name={guestName} size="sm" />
              <span className="hidden max-w-[7rem] truncate text-xs font-medium text-zinc-600 sm:block">
                {onGallery && showMine ? "My photos" : guestName}
              </span>
            </Link>
            <SwitchGuestButton eventId={eventId} />
          </div>
        )}
      </header>

      <div className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>

      <nav
        aria-label="Event navigation"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
          {TABS.map((tab) => {
            const isActive = current === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href(token)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex min-h-11 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200 md:min-h-10 md:gap-0 md:py-2.5 ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 active:scale-[0.98] active:bg-zinc-200/80"
                }`}
              >
                <NavTabIcon
                  id={tab.id}
                  active={isActive}
                  className="h-5 w-5 shrink-0 md:h-[1.375rem] md:w-[1.375rem]"
                />
                <span
                  className={`truncate text-[10px] leading-none md:hidden ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function EventChrome(props: EventChromeProps) {
  // ChallengesProvider must wrap Suspense: the fallback also renders
  // children (GalleryClient), which calls useChallenges().
  return (
    <ChallengesProvider token={props.token} eventId={props.eventId}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-zinc-50 flex flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm">
              <EventHeaderTitle eventName={props.eventName} />
            </header>
            <div className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
              {props.children}
            </div>
          </div>
        }
      >
        <EventChromeInner {...props} />
      </Suspense>
    </ChallengesProvider>
  );
}
