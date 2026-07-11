"use client";

import { useEffect, useRef } from "react";

/**
 * Attach to a container; any descendant with the `.reveal` class
 * fades/slides into view the first time it crosses the viewport.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.classList.contains("reveal")
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>(".reveal"));

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}
