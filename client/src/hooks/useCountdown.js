import { useEffect, useState } from "react";

/**
 * Counts down to a target time.
 * Returns whole seconds left, whether it has run out, and 0–1 progress
 * (1 = just started, 0 = finished) measured from when the hook mounted.
 *
 * The target is expected to stay fixed for the life of the component — render
 * the component with a `key` that changes with the target (OtpStep is keyed
 * by session id) so a new target gets a fresh countdown.
 */
export default function useCountdown(target) {
  const targetMs = target ? new Date(target).getTime() : 0;

  const [{ startMs, now }, setClock] = useState(() => {
    const t = Date.now();
    return { startMs: t, now: t };
  });

  useEffect(() => {
    if (!targetMs) return undefined;
    const id = window.setInterval(
      () => setClock((clock) => ({ ...clock, now: Date.now() })),
      250
    );
    return () => window.clearInterval(id);
  }, [targetMs]);

  const remainingMs = Math.max(targetMs - now, 0);
  const totalMs = Math.max(targetMs - startMs, 1);

  return {
    secondsLeft: Math.ceil(remainingMs / 1000),
    expired: Boolean(targetMs) && remainingMs <= 0,
    progress: targetMs ? Math.min(remainingMs / totalMs, 1) : 0,
  };
}
