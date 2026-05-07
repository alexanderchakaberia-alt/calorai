import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, durationMs = 500) {
  const [value, setValue] = useState(target);
  const raf = useRef<number | null>(null);
  const prev = useRef(target);

  useEffect(() => {
    const from = prev.current;
    const to = target;
    prev.current = target;

    if (!Number.isFinite(from) || !Number.isFinite(to) || durationMs <= 0 || from === to) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const e = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [target, durationMs]);

  return value;
}

