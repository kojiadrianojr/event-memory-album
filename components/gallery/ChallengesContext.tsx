"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ChallengeSheet from "@/components/gallery/ChallengeSheet";
import { EventPrompt } from "@/components/gallery/types";
import {
  isChallengesBannerDismissed,
  setChallengesBannerDismissed,
} from "@/lib/challenge-banner-storage";

interface ChallengesContextValue {
  prompts: EventPrompt[];
  promptCounts: Record<string, number>;
  setPromptCounts: (counts: Record<string, number>) => void;
  hasPrompts: boolean;
  bannerDismissed: boolean;
  bannerHydrated: boolean;
  dismissBanner: () => void;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const ChallengesContext = createContext<ChallengesContextValue | null>(null);

export function useChallenges(): ChallengesContextValue {
  const value = useContext(ChallengesContext);
  if (!value) {
    throw new Error("useChallenges must be used within ChallengesProvider");
  }
  return value;
}

interface ChallengesProviderProps {
  token: string;
  eventId: string;
  children: React.ReactNode;
}

export function ChallengesProvider({
  token,
  eventId,
  children,
}: ChallengesProviderProps) {
  const [prompts, setPrompts] = useState<EventPrompt[]>([]);
  const [promptCounts, setPromptCounts] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerHydrated, setBannerHydrated] = useState(false);

  useEffect(() => {
    setBannerDismissed(isChallengesBannerDismissed(eventId));
    setBannerHydrated(true);
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/events/${token}/prompts`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPrompts)
      .catch(() => setPrompts([]));
  }, [token]);

  const dismissBanner = useCallback(() => {
    setChallengesBannerDismissed(eventId);
    setBannerDismissed(true);
  }, [eventId]);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const value = useMemo(
    () => ({
      prompts,
      promptCounts,
      setPromptCounts,
      hasPrompts: prompts.length > 0,
      bannerDismissed,
      bannerHydrated,
      dismissBanner,
      sheetOpen,
      openSheet,
      closeSheet,
    }),
    [
      prompts,
      promptCounts,
      bannerDismissed,
      bannerHydrated,
      dismissBanner,
      sheetOpen,
      openSheet,
      closeSheet,
    ]
  );

  return (
    <ChallengesContext.Provider value={value}>
      {children}
      {prompts.length > 0 && (
        <ChallengeSheet
          open={sheetOpen}
          onClose={closeSheet}
          token={token}
          prompts={prompts}
          promptCounts={promptCounts}
        />
      )}
    </ChallengesContext.Provider>
  );
}
