"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PULL_THRESHOLD_PX = 60;
const MAX_PULL_PX = 120;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const resetPull = useCallback(() => {
    touchStartY.current = null;
    pulling.current = false;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    pullDistanceRef.current = PULL_THRESHOLD_PX;
    setPullDistance(PULL_THRESHOLD_PX);
    try {
      await onRefreshRef.current();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      resetPull();
    }
  }, [resetPull]);

  useEffect(() => {
    if (!enabled) {
      resetPull();
      return;
    }

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || isRefreshingRef.current) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (touchStartY.current === null || isRefreshingRef.current) return;
      if (window.scrollY > 0) {
        resetPull();
        return;
      }

      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      pulling.current = true;
      const distance = Math.min(delta * 0.5, MAX_PULL_PX);
      pullDistanceRef.current = distance;
      setPullDistance(distance);

      if (distance > 0) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (touchStartY.current === null || isRefreshingRef.current) return;

      if (pulling.current && pullDistanceRef.current >= PULL_THRESHOLD_PX) {
        void triggerRefresh();
        return;
      }

      resetPull();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, resetPull, triggerRefresh]);

  return {
    pullDistance,
    isRefreshing,
    pullThreshold: PULL_THRESHOLD_PX,
  };
}
