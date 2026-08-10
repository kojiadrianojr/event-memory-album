"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Lightbox, {
  type Slide,
  useController,
  useLightboxProps,
  useLightboxState,
} from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/plugins/counter.css";
import VideoPlayer from "@/components/media/VideoPlayer";
import { mimeFromUrl } from "@/lib/mime-from-url";
import {
  mediaLightboxUrl,
  mediaPlaybackUrl,
  mediaPosterUrl,
} from "@/lib/media-url";
import { useMediaQuery } from "@/lib/use-media-query";
import { format, parseISO } from "date-fns";
import { FlatMediaItem, MediaAsset, PostItem } from "./types";

interface VideoSlideMeta {
  isVideoSlide: true;
  videoSrc: string;
  poster?: string;
  mimeType: string;
}

interface PhotoSlideMeta {
  isPhotoSlide: true;
  fullSrc: string;
  placeholderSrc?: string;
  alt: string;
}

function isVideoSlide(slide: Slide): slide is Slide & VideoSlideMeta {
  return (slide as Slide & VideoSlideMeta).isVideoSlide === true;
}

function isPhotoSlideType(slide: Slide): slide is Slide & PhotoSlideMeta {
  return (slide as Slide & PhotoSlideMeta).isPhotoSlide === true;
}

export interface MediaLightboxFooterContext {
  isMobile: boolean;
}

interface MediaLightboxBaseProps {
  open: boolean;
  onClose: () => void;
  renderFooter?: (
    post: PostItem,
    context: MediaLightboxFooterContext
  ) => React.ReactNode;
}

interface PostScopedLightboxProps extends MediaLightboxBaseProps {
  post: PostItem;
  mediaIndex: number;
  flatItems?: never;
  startIndex?: never;
}

interface FlatLightboxProps extends MediaLightboxBaseProps {
  flatItems: FlatMediaItem[];
  startIndex: number;
  post?: never;
  mediaIndex?: never;
}

export type MediaLightboxProps = PostScopedLightboxProps | FlatLightboxProps;

type PhotoFitMode = "contain" | "cover";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "MMM d, yyyy");
}

type VideoSlide = Slide & VideoSlideMeta;
type PhotoSlide = Slide & PhotoSlideMeta;

function PhotoSlideView({
  fullSrc,
  placeholderSrc,
  alt,
  fit,
}: {
  fullSrc: string;
  placeholderSrc?: string;
  alt: string;
  fit: PhotoFitMode;
}) {
  const [loaded, setLoaded] = useState(false);
  const fitClass =
    fit === "cover" ? "object-cover" : "object-contain";

  return (
    <div className="relative flex h-full w-full min-h-0 items-center justify-center">
      {placeholderSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-105 blur-sm ${fitClass}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={fullSrc}
        src={fullSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`relative max-h-full max-w-full transition-opacity duration-300 ${fitClass} ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function buildSlide(
  item: MediaAsset,
  post: PostItem,
  description: string
): Slide | VideoSlide | PhotoSlide {
  if (item.type === "VIDEO") {
    const poster = mediaPosterUrl(item);
    return {
      src: poster ?? mediaPlaybackUrl(item),
      isVideoSlide: true as const,
      videoSrc: mediaPlaybackUrl(item),
      poster,
      mimeType: mimeFromUrl(item.url!, "video", "video/mp4"),
      title: post.caption ?? undefined,
      description,
    } satisfies VideoSlide;
  }

  const placeholderSrc = mediaPosterUrl(item);
  const fullSrc = mediaLightboxUrl(item);
  const alt = post.caption ?? `Photo by ${post.uploaderName}`;

  return {
    src: placeholderSrc ?? fullSrc,
    isPhotoSlide: true as const,
    fullSrc,
    placeholderSrc,
    alt,
    title: post.caption ?? undefined,
    description,
  } satisfies PhotoSlide;
}

function FiniteNavVisibility() {
  const { currentIndex, slides } = useLightboxState();
  const { carousel } = useLightboxProps();
  const { containerRef } = useController();

  useLayoutEffect(() => {
    const root = containerRef.current?.closest(".yarl__portal");
    if (!root) return;

    const prev = root.querySelector<HTMLButtonElement>(".yarl__navigation_prev");
    const next = root.querySelector<HTMLButtonElement>(".yarl__navigation_next");
    const hidePrev = carousel.finite && currentIndex <= 0;
    const hideNext =
      carousel.finite && currentIndex >= slides.length - 1;

    if (prev) prev.hidden = hidePrev;
    if (next) next.hidden = hideNext;
  }, [carousel.finite, containerRef, currentIndex, slides.length]);

  return null;
}

function PhotoFitToggle({
  mode,
  onChange,
}: {
  mode: PhotoFitMode;
  onChange: (mode: PhotoFitMode) => void;
}) {
  return (
    <div className="media-lightbox-fit-toggle pointer-events-auto absolute right-3 top-14 z-30 flex rounded-lg bg-black/50 p-0.5 backdrop-blur-sm sm:top-3">
      {(["contain", "cover"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
            mode === value
              ? "bg-white text-zinc-900"
              : "text-white/80 hover:text-white"
          }`}
        >
          {value === "contain" ? "Fit" : "Fill"}
        </button>
      ))}
    </div>
  );
}

function LightboxCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="media-lightbox-close pointer-events-auto absolute left-3 top-3 z-[10001] flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export default function MediaLightbox(props: MediaLightboxProps) {
  const { open, onClose, renderFooter } = props;
  const isFlatMode = "flatItems" in props && props.flatItems != null;

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mediaHost, setMediaHost] = useState<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [photoFit, setPhotoFit] = useState<PhotoFitMode>("contain");

  const slideEntries = useMemo(() => {
    if (isFlatMode) {
      return props.flatItems.map((entry) => ({
        post: entry.post,
        media: entry.media,
      }));
    }

    const post = props.post;
    return post.media
      .filter((m) => (m.type === "PHOTO" || m.type === "VIDEO") && m.url)
      .map((media) => ({ post, media }));
  }, [isFlatMode, props]);

  const slides: Slide[] = useMemo(
    () =>
      slideEntries.map(({ post, media }) => {
        const description = [
          post.caption,
          `${post.uploaderName} · ${formatDate(post.uploadedAt)}`,
        ]
          .filter(Boolean)
          .join("\n");
        return buildSlide(media, post, description);
      }),
    [slideEntries]
  );

  const startIndex = isFlatMode
    ? Math.min(props.startIndex, Math.max(0, slides.length - 1))
    : Math.min(props.mediaIndex, Math.max(0, slides.length - 1));

  const resolvedIndex = currentIndex ?? startIndex;

  const activePost =
    slideEntries[resolvedIndex]?.post ?? slideEntries[startIndex]?.post;
  const currentSlide = slides[resolvedIndex];
  const isPhotoSlide = currentSlide && isPhotoSlideType(currentSlide);

  const hasMultipleSlides = slides.length > 1;
  const hasMobileDock = !isDesktop && !!renderFooter;
  const hasDesktopAside = isDesktop && !!renderFooter;
  const usesEngagementShell = hasMobileDock || hasDesktopAside;
  const plugins = [
    Counter,
    ...(hasMobileDock ? [] : [Captions]),
  ];
  const engagementPanel =
    activePost && renderFooter?.(activePost, { isMobile: hasMobileDock });
  const shellReady = !usesEngagementShell || !!mediaHost;
  const fitClass =
    photoFit === "cover" ? "media-lightbox-fit-cover" : "media-lightbox-fit-contain";

  useEffect(() => {
    if (!open || !hasMobileDock || !dockRef.current) {
      setDockHeight(0);
      return;
    }

    const node = dockRef.current;
    const update = () => setDockHeight(node.offsetHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMobileDock, open, engagementPanel]);

  useEffect(() => {
    if (!open || !hasMobileDock) return;
    document.documentElement.style.setProperty(
      "--lightbox-dock-height",
      `${dockHeight}px`
    );
    return () => {
      document.documentElement.style.removeProperty("--lightbox-dock-height");
    };
  }, [dockHeight, hasMobileDock, open]);

  function handleClose() {
    setCurrentIndex(null);
    setPhotoFit("contain");
    setMediaHost(null);
    onClose();
  }

  const lightbox = (
    <Lightbox
      open={open && shellReady}
      close={handleClose}
      slides={slides}
      index={startIndex}
      carousel={{ finite: true }}
      plugins={plugins}
      on={{
        view: ({ index }) => setCurrentIndex(index),
      }}
      {...(usesEngagementShell && mediaHost
        ? { portal: { root: mediaHost } }
        : {})}
      {...(!hasMultipleSlides
        ? { controller: { disableSwipeNavigation: true } }
        : {})}
      className={[
        "media-lightbox",
        fitClass,
        hasDesktopAside ? "media-lightbox-desktop" : "",
        hasMobileDock ? "media-lightbox-mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      styles={{
        root: usesEngagementShell
          ? { position: "absolute", inset: 0 }
          : undefined,
        container: usesEngagementShell
          ? { position: "absolute", inset: 0 }
          : undefined,
      }}
      render={{
        slideContainer: ({ slide, children }) =>
          isVideoSlide(slide) || isPhotoSlideType(slide) ? (
            <div className="yarl__slide_wrapper yarl__slide_wrapper_interactive yarl__fullsize yarl__flex_center">
              {children}
            </div>
          ) : (
            children
          ),
        slide: ({ slide }) => {
          if (isVideoSlide(slide)) {
            return (
              <div className="flex h-full w-full min-h-0 items-center justify-center p-2 md:p-4">
                <VideoPlayer
                  key={slide.videoSrc}
                  fill
                  src={slide.videoSrc}
                  poster={slide.poster}
                  mimeType={slide.mimeType}
                  className="h-full w-full min-h-0 max-h-full max-w-full"
                />
              </div>
            );
          }
          if (isPhotoSlideType(slide)) {
            return (
              <PhotoSlideView
                key={slide.fullSrc}
                fullSrc={slide.fullSrc}
                placeholderSrc={slide.placeholderSrc}
                alt={slide.alt}
                fit={photoFit}
              />
            );
          }
          return undefined;
        },
        controls: () => (
          <>
            {!usesEngagementShell && (
              <LightboxCloseButton onClose={handleClose} />
            )}
            {hasMultipleSlides && <FiniteNavVisibility />}
            {isPhotoSlide && (
              <PhotoFitToggle mode={photoFit} onChange={setPhotoFit} />
            )}
          </>
        ),
        ...(hasMultipleSlides
          ? {}
          : {
              buttonPrev: () => null,
              buttonNext: () => null,
            }),
        buttonClose: () => null,
      }}
    />
  );

  return (
    <>
      {hasMobileDock &&
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="media-lightbox-mobile-shell fixed inset-0 z-[10000] flex flex-col overflow-hidden bg-black">
            <LightboxCloseButton onClose={handleClose} />
            <div
              ref={setMediaHost}
              className="relative min-h-0 w-full flex-1 touch-pan-y"
            />
            {engagementPanel && (
              <div
                ref={dockRef}
                className="media-lightbox-dock relative z-20 w-full min-w-0 shrink-0 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-zinc-800 bg-zinc-950 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] touch-manipulation"
                style={{ maxHeight: "min(42dvh, 280px)" }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {engagementPanel}
              </div>
            )}
          </div>,
          document.body
        )}

      {hasDesktopAside &&
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="media-lightbox-desktop-shell fixed inset-0 z-[10000] flex overflow-hidden bg-black">
            <LightboxCloseButton onClose={handleClose} />
            <div
              ref={setMediaHost}
              className="relative min-h-0 min-w-0 flex-1"
            />
            {engagementPanel && (
              <aside
                className="media-lightbox-aside relative z-20 flex h-full w-[min(360px,32vw)] shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950/95 touch-manipulation lg:w-[380px]"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {engagementPanel}
              </aside>
            )}
          </div>,
          document.body
        )}

      {!usesEngagementShell && lightbox}
      {usesEngagementShell && lightbox}
    </>
  );
}
