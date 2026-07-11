"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, decimals = 0, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / durationMs);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Number((target * eased).toFixed(decimals)));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [target, decimals, durationMs]);

  return { ref, value };
}
