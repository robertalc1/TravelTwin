"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** How far ahead of the viewport to begin mounting (px). Default 400. */
  rootMargin?: string;
  /** Skeleton/placeholder rendered before the children mount. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Defers mounting children until the wrapper enters (or nears) the viewport.
 * Used to keep heavy below-the-fold sections (with their own data fetches and
 * iframes) off the initial-render critical path so the trip page lands fast.
 */
export default function LazyMount({ rootMargin = "400px 0px", fallback = null, children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShow(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin, show]);

  return <div ref={ref}>{show ? children : fallback}</div>;
}
