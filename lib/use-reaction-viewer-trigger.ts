"use client";

import { useCallback, useState } from "react";

export function useReactionViewerTriggerController() {
  const [pressingKey, setPressingKey] = useState<string | null>(null);

  const getTriggerProps = useCallback((key: string, onOpen: () => void) => {
    const pressClass =
      pressingKey === key ? "ring-2 ring-zinc-400 ring-offset-1 scale-95" : "";

    return {
      pressClass,
      triggerProps: {
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation();
          onOpen();
        },
        onPointerDown: () => setPressingKey(key),
        onPointerUp: () => setPressingKey(null),
        onPointerLeave: () => setPressingKey(null),
        onPointerCancel: () => setPressingKey(null),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        },
      },
    };
  }, [pressingKey]);

  return { getTriggerProps };
}
