"use client";

import { useCallback, useEffect, useState } from "react";
import { useGuestName } from "@/lib/use-guest-name";
import type { WallContributor, WallSummary } from "@/lib/wall-contributors";
import WallContributorCard from "./WallContributorCard";
import WallEmptyState from "./WallEmptyState";
import WallStatsBar from "./WallStatsBar";
import WallYouCard from "./WallYouCard";

interface WallClientProps {
  token: string;
  eventId: string;
  contributors: WallContributor[];
  summary: WallSummary;
}

const PRESENCE_INTERVAL_MS = 30_000;
const WALL_REFRESH_INTERVAL_MS = 60_000;

export default function WallClient({
  token,
  eventId,
  contributors: initialContributors,
  summary: initialSummary,
}: WallClientProps) {
  const guestName = useGuestName(eventId);
  const [contributors, setContributors] =
    useState<WallContributor[]>(initialContributors);
  const [summary, setSummary] = useState<WallSummary>(initialSummary);
  const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());

  const sendHeartbeat = useCallback(async () => {
    if (!guestName) return;
    try {
      await fetch(`/api/events/${token}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName }),
      });
    } catch {
      // best-effort
    }
  }, [token, guestName]);

  const refreshPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${token}/presence`);
      if (!res.ok) return;
      const data = (await res.json()) as { online?: string[] };
      setOnlineNames(new Set(data.online ?? []));
    } catch {
      // best-effort
    }
  }, [token]);

  const refreshWall = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${token}/wall`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        contributors: WallContributor[];
        summary: WallSummary;
      };
      setContributors(data.contributors);
      setSummary(data.summary);
    } catch {
      // best-effort
    }
  }, [token]);

  useEffect(() => {
    if (!guestName) return;

    const presenceTimer = setInterval(() => {
      void sendHeartbeat();
      void refreshPresence();
    }, PRESENCE_INTERVAL_MS);

    const wallTimer = setInterval(() => {
      void refreshWall();
    }, WALL_REFRESH_INTERVAL_MS);

    const initial = window.setTimeout(() => {
      void sendHeartbeat();
      void refreshPresence();
      void refreshWall();
    }, 0);

    return () => {
      window.clearTimeout(initial);
      clearInterval(presenceTimer);
      clearInterval(wallTimer);
    };
  }, [guestName, sendHeartbeat, refreshPresence, refreshWall]);

  const contributorNames = new Set(contributors.map((c) => c.name));
  const showYouCard = guestName !== null && !contributorNames.has(guestName);
  const isSelfOnline = guestName !== null && onlineNames.has(guestName);

  return (
    <div className="px-4 py-5 pb-32 md:pb-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Guests</h1>
          <p className="text-sm text-zinc-500">
            See who&apos;s contributing — tap someone to view their posts
          </p>
        </div>

        {(summary.contributorCount > 0 || guestName) && (
          <WallStatsBar
            summary={summary}
            guestName={guestName}
            contributors={contributors}
          />
        )}

        {showYouCard && (
          <WallYouCard
            token={token}
            guestName={guestName}
            isOnline={isSelfOnline}
          />
        )}

        {contributors.length === 0 ? (
          <WallEmptyState token={token} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {contributors.map((contributor) => (
              <WallContributorCard
                key={contributor.name}
                token={token}
                name={contributor.name}
                postCount={contributor.postCount}
                isCurrentGuest={contributor.name === guestName}
                isOnline={onlineNames.has(contributor.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
