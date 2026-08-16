"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { safeFormatDate } from "@/lib/safe-date";
import { safeDecodeURIComponent } from "@/lib/safe-decode";
import GuestNamePrompt from "@/components/ui/GuestNamePrompt";
import PostCard from "@/components/gallery/PostCard";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import MediaLightbox from "@/components/gallery/MediaLightbox";
import GalleryFilters, {
  GALLERY_DAY_SCROLL_MARGIN,
} from "@/components/gallery/GalleryFilters";
import PhotoChallengesBanner from "@/components/gallery/PhotoChallenges";
import { useChallenges } from "@/components/gallery/ChallengesContext";
import EventHeaderTitle from "@/components/event/EventHeaderTitle";
import LightboxEngagement from "@/components/engagement/LightboxEngagement";
import { useGuestName } from "@/lib/use-guest-name";
import {
  PostItem,
  Reaction,
  Comment,
  EventMoment,
  flattenVisualMedia,
  isVisualPost,
} from "@/components/gallery/types";
import {
  getGalleryViewMode,
  setGalleryViewMode,
  type GalleryViewMode,
} from "@/lib/gallery-view-storage";
import {
  createPendingLocalWrites,
  markLocalReactionWrite,
  prunePendingWrites,
  reconcileFeedPosts,
} from "@/lib/merge-feed-posts";
import { useLiveFeed } from "@/lib/use-live-feed";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/gallery/PullToRefreshIndicator";
import NewPostsBanner from "@/components/gallery/NewPostsBanner";

const SCROLL_TOP_THRESHOLD_PX = 80;

interface GalleryClientProps {
  token: string;
  eventId: string;
  eventName: string;
  eventDate?: string | null;
  readOnly?: boolean;
}

function groupByDay(items: PostItem[]): { day: string; items: PostItem[] }[] {
  const map = new Map<string, PostItem[]>();
  for (const item of items) {
    const date = item.uploadedAt;
    const day = safeFormatDate(date, "yyyy-MM-dd");
    if (!day) continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function visualMediaIndex(post: PostItem, mediaIndex: number): number {
  const target = post.media[mediaIndex];
  if (!target) return 0;
  const visual = post.media.filter(
    (m) => (m.type === "PHOTO" || m.type === "VIDEO") && m.url
  );
  const idx = visual.findIndex((m) => m.id === target.id);
  return idx >= 0 ? idx : 0;
}

/** Syncs feed prompt tallies into ChallengesProvider (guest gallery only). */
function PromptCountsSync({ counts }: { counts: Record<string, number> }) {
  const { setPromptCounts } = useChallenges();
  useEffect(() => {
    setPromptCounts(counts);
  }, [counts, setPromptCounts]);
  return null;
}

export default function GalleryClient({
  token,
  eventId,
  eventName,
  eventDate,
  readOnly = false,
}: GalleryClientProps) {
  const searchParams = useSearchParams();
  const showMine = searchParams.get("mine") === "1";
  const uploaderParam = searchParams.get("uploader");

  const guestName = useGuestName(eventId);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [moments, setMoments] = useState<EventMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingNewPosts, setPendingNewPosts] = useState<PostItem[]>([]);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxMediaIndex, setLightboxMediaIndex] = useState(0);
  const [lightboxFlatIndex, setLightboxFlatIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<GalleryViewMode>(() =>
    getGalleryViewMode(eventId)
  );
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [userSelectedDay, setUserSelectedDay] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const postsRef = useRef<PostItem[]>([]);
  const pendingWritesRef = useRef(createPendingLocalWrites());

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  /** The open post, read from `posts` so live updates reach the lightbox. */
  const lightboxPost = useMemo(
    () => posts.find((post) => post.id === lightboxPostId) ?? null,
    [posts, lightboxPostId]
  );

  const momentQuery = selectedMomentId
    ? `?momentId=${encodeURIComponent(selectedMomentId)}`
    : "";

  const refreshFeed = useCallback(async () => {
    try {
      const [postsRes, momentsRes] = await Promise.all([
        fetch(`/api/events/${token}/media${momentQuery}`),
        fetch(`/api/events/${token}/moments`),
      ]);
      if (postsRes.ok) setPosts(await postsRes.json());
      if (momentsRes.ok) setMoments(await momentsRes.json());
      setPendingNewPosts([]);
    } finally {
      setLoading(false);
    }
  }, [token, momentQuery]);

  /**
   * Folds the latest feed into current state. Updates to posts already on
   * screen (comments, reactions, caption edits) apply immediately; only
   * genuinely new posts wait behind the banner when the user is scrolled down.
   */
  const syncFeed = useCallback(async () => {
    if (postsRef.current.length === 0) {
      await refreshFeed();
      return;
    }

    const fetchStartedAt = Date.now();
    try {
      const res = await fetch(`/api/events/${token}/media${momentQuery}`);
      if (!res.ok) return;

      const incoming = (await res.json()) as PostItem[];
      if (!Array.isArray(incoming) || incoming.length === 0) return;

      // Classify against the last rendered feed — only decides what is staged
      // behind the banner, so a slightly stale read is harmless.
      const knownIds = new Set(postsRef.current.map((post) => post.id));
      const newPosts = incoming.filter((post) => !knownIds.has(post.id));
      const stageNewPosts =
        newPosts.length > 0 && window.scrollY > SCROLL_TOP_THRESHOLD_PX;

      // The merge itself runs against genuinely current state so it can never
      // revert a reaction or comment committed while this request was in flight.
      const pending = pendingWritesRef.current;
      const toApply = stageNewPosts
        ? incoming.filter((post) => knownIds.has(post.id))
        : incoming;

      setPosts(
        (prev) =>
          reconcileFeedPosts(prev, toApply, { fetchStartedAt, pending }).merged
      );
      setPendingNewPosts(stageNewPosts ? newPosts : []);

      prunePendingWrites(pending, incoming, fetchStartedAt);
    } catch {
      // best-effort
    }
  }, [token, momentQuery, refreshFeed]);

  useEffect(() => {
    if (readOnly || guestName) refreshFeed();
  }, [readOnly, guestName, refreshFeed]);

  useLiveFeed({
    token,
    enabled: Boolean(readOnly || guestName),
    onChanged: syncFeed,
  });

  const { pullDistance, isRefreshing, pullThreshold } = usePullToRefresh({
    onRefresh: refreshFeed,
    enabled: !lightboxOpen && !loading,
  });

  const uploaderFilter = useMemo(() => {
    if (showMine && guestName) return { name: guestName, label: "My uploads" };
    if (uploaderParam) {
      const name = safeDecodeURIComponent(uploaderParam);
      if (!name) return null;
      return { name, label: `${name}'s uploads` };
    }
    return null;
  }, [showMine, guestName, uploaderParam]);

  const filteredPosts = useMemo(() => {
    if (!uploaderFilter) return posts;
    return posts.filter((item) => item.uploaderName === uploaderFilter.name);
  }, [posts, uploaderFilter]);

  const pendingNewCount = useMemo(() => {
    if (!uploaderFilter) return pendingNewPosts.length;
    return pendingNewPosts.filter(
      (item) => item.uploaderName === uploaderFilter.name
    ).length;
  }, [pendingNewPosts, uploaderFilter]);

  function loadPendingPosts() {
    setPosts((prev) => reconcileFeedPosts(prev, pendingNewPosts).merged);
    setPendingNewPosts([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleViewModeChange(mode: GalleryViewMode) {
    setViewMode(mode);
    setGalleryViewMode(eventId, mode);
  }

  const flatVisualItems = useMemo(
    () => flattenVisualMedia(filteredPosts),
    [filteredPosts]
  );

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredPosts) {
      const date = item.uploadedAt;
      const day = safeFormatDate(date, "yyyy-MM-dd");
      if (day) set.add(day);
    }
    return Array.from(set).sort();
  }, [filteredPosts]);

  const selectedDay = useMemo(() => {
    if (days.length === 0) return null;
    if (userSelectedDay && days.includes(userSelectedDay)) return userSelectedDay;
    if (eventDate) {
      const eventDay = safeFormatDate(eventDate, "yyyy-MM-dd");
      if (eventDay && days.includes(eventDay)) return eventDay;
    }
    return days[days.length - 1];
  }, [days, eventDate, userSelectedDay]);

  const promptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of posts) {
      if (item.promptId) {
        counts[item.promptId] = (counts[item.promptId] ?? 0) + 1;
      }
    }
    return counts;
  }, [posts]);

  function updatePostReactions(postId: string, reactions: Reaction[]) {
    markLocalReactionWrite(pendingWritesRef.current, postId);
    setPosts((prev) =>
      prev.map((item) => (item.id === postId ? { ...item, reactions } : item))
    );
  }

  function addPostComment(postId: string, comment: Comment) {
    pendingWritesRef.current.commentIds.add(comment.id);
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, comments: [...item.comments, comment] }
          : item
      )
    );
  }

  function updatePostCaptionAndMoment(
    postId: string,
    patch: {
      caption: string | null;
      momentId: string | null;
      moment: EventMoment | null;
    }
  ) {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              caption: patch.caption,
              momentId: patch.momentId,
              moment: patch.moment,
            }
          : item
      )
    );
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((item) => item.id !== postId));
    if (lightboxPostId === postId) {
      setLightboxOpen(false);
      setLightboxPostId(null);
    }
  }

  function updateComment(postId: string, comment: Comment) {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: item.comments.map((c) =>
                c.id === comment.id ? comment : c
              ),
            }
          : item
      )
    );
  }

  function removeComment(postId: string, commentId: string) {
    pendingWritesRef.current.commentIds.delete(commentId);
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: item.comments.filter((c) => c.id !== commentId),
            }
          : item
      )
    );
  }

  function openFeedLightbox(post: PostItem, mediaIndex: number) {
    setLightboxFlatIndex(null);
    setLightboxPostId(post.id);
    setLightboxMediaIndex(visualMediaIndex(post, mediaIndex));
    setLightboxOpen(true);
  }

  function openPhotosLightbox(index: number) {
    setLightboxPostId(null);
    setLightboxFlatIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function scrollToDay(day: string) {
    setUserSelectedDay(day);
    dayRefs.current[day]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!readOnly && !guestName) {
    return <GuestNamePrompt token={token} eventId={eventId} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-zinc-400 text-sm">Loading gallery…</p>
      </div>
    );
  }

  const groups = groupByDay(filteredPosts);
  const containerWidthClass =
    viewMode === "grid"
      ? "max-w-lg sm:max-w-2xl md:max-w-4xl"
      : "max-w-lg";

  const hasStickyHeader = true;

  return (
    <div>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        pullThreshold={pullThreshold}
        isRefreshing={isRefreshing}
        hasStickyHeader={hasStickyHeader}
      />

      {!lightboxOpen && pendingNewCount > 0 && (
        <NewPostsBanner
          count={pendingNewCount}
          onLoad={loadPendingPosts}
          hasStickyHeader={hasStickyHeader}
        />
      )}

      {readOnly && (
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm">
          <EventHeaderTitle eventName={eventName} />
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            View only
          </span>
        </header>
      )}

      <div className={`mx-auto flex ${containerWidthClass} flex-col gap-6 px-4 pt-4`}>
        <div className="flex flex-col gap-3">
          <GalleryFilters
            moments={moments}
            selectedMomentId={selectedMomentId}
            onSelectMoment={setSelectedMomentId}
            uploaderFilter={uploaderFilter}
            clearUploaderHref={readOnly ? `/view/${token}` : `/event/${token}`}
            days={days}
            selectedDay={selectedDay}
            onSelectDay={scrollToDay}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

          {!readOnly && (
            <>
              <PromptCountsSync counts={promptCounts} />
              <PhotoChallengesBanner />
            </>
          )}
        </div>

      {viewMode === "grid" ? (
        flatVisualItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm">
              {uploaderFilter
                ? `No photos from ${uploaderFilter.name} yet.`
                : readOnly
                  ? "No photos shared yet."
                  : "No photos yet. Be the first to upload!"}
            </p>
          </div>
        ) : (
          <PhotoGrid
            items={flatVisualItems}
            onItemClick={openPhotosLightbox}
          />
        )
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <p className="text-sm">
            {uploaderFilter
              ? `No uploads from ${uploaderFilter.name} yet.`
              : readOnly
                ? "No memories shared yet."
                : "No photos yet. Be the first to upload!"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-6">
          {groups.map(({ day, items }) => (
            <div
              key={day}
              ref={(el) => {
                dayRefs.current[day] = el;
              }}
              className={`flex flex-col gap-4 ${GALLERY_DAY_SCROLL_MARGIN}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {safeFormatDate(`${day}T00:00:00`, "MMMM d, yyyy")}
                </span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
              {items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  token={token}
                  guestName={guestName ?? ""}
                  readOnly={readOnly}
                  moments={moments}
                  onImageClick={(mediaIndex) => {
                    if (isVisualPost(post)) openFeedLightbox(post, mediaIndex);
                  }}
                  onReactionsChange={(reactions) =>
                    updatePostReactions(post.id, reactions)
                  }
                  onCommentAdded={(comment) =>
                    addPostComment(post.id, comment)
                  }
                  onPostUpdated={updatePostCaptionAndMoment}
                  onPostDeleted={removePost}
                  onCommentUpdated={updateComment}
                  onCommentDeleted={removeComment}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      </div>

      {lightboxPost && (
        <MediaLightbox
          post={lightboxPost}
          mediaIndex={lightboxMediaIndex}
          open={lightboxOpen}
          onClose={closeLightbox}
          renderFooter={
            readOnly || guestName
              ? (post, { isMobile }) => (
                  <LightboxEngagement
                    post={post}
                    token={token}
                    guestName={guestName ?? ""}
                    readOnly={readOnly}
                    isMobile={isMobile}
                    onReactionsChange={(reactions) =>
                      updatePostReactions(post.id, reactions)
                    }
                    onCommentAdded={(comment) =>
                      addPostComment(post.id, comment)
                    }
                    onCommentUpdated={(comment) =>
                      updateComment(post.id, comment)
                    }
                    onCommentDeleted={(commentId) =>
                      removeComment(post.id, commentId)
                    }
                  />
                )
              : undefined
          }
        />
      )}

      {lightboxFlatIndex !== null && flatVisualItems.length > 0 && (
        <MediaLightbox
          flatItems={flatVisualItems}
          startIndex={lightboxFlatIndex}
          open={lightboxOpen}
          onClose={closeLightbox}
          renderFooter={
            readOnly || guestName
              ? (post, { isMobile }) => (
                  <LightboxEngagement
                    post={post}
                    token={token}
                    guestName={guestName ?? ""}
                    readOnly={readOnly}
                    isMobile={isMobile}
                    onReactionsChange={(reactions) =>
                      updatePostReactions(post.id, reactions)
                    }
                    onCommentAdded={(comment) =>
                      addPostComment(post.id, comment)
                    }
                    onCommentUpdated={(comment) =>
                      updateComment(post.id, comment)
                    }
                    onCommentDeleted={(commentId) =>
                      removeComment(post.id, commentId)
                    }
                  />
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
