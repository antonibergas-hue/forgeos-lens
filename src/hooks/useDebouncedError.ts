import { useRef, useEffect } from "react";
import { toast } from "sonner";

/**
 * Debounced error toast helper (TODO #17c).
 *
 * When a forgeos CLI call fails the first time we toast the operator.
 * Subsequent failures within `debounceMs` are suppressed so a brief
 * network blip or a CLI restart does not cascade into a wall of toasts.
 *
 * Callers pass the error message; the hook handles the timing logic.
 */
export function useDebouncedError(debounceMs = 2_000) {
  const lastToastedAt = useRef(0);

  const notify = (message: string) => {
    const now = Date.now();
    if (now - lastToastedAt.current < debounceMs) return;
    lastToastedAt.current = now;
    toast.error(message, { duration: 10_000 });
  };

  // Reset on unmount so a fresh mount starts with no stale timer
  useEffect(() => {
    const prev = lastToastedAt.current;
    return () => {
      lastToastedAt.current = prev; // restore (no-op, but explicit)
    };
  }, []);

  return notify;
}
