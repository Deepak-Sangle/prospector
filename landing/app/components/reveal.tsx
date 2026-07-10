"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper. Content renders fully visible by default (SSR / no-JS /
 * reduced-motion), and only opts into the hidden-then-reveal enhancement once
 * JS runs and motion is allowed — so the section never ships blank.
 */
export function Reveal({
  children,
  as,
  className,
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as ?? "div";

  useEffect(() => {
    const el = ref.current;
    if (el == null) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    el.setAttribute("data-reveal", "");
    el.style.setProperty("--reveal-delay", `${delay}ms`);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(0);
        if (entry == null || !entry.isIntersecting) return;
        el.setAttribute("data-shown", "true");
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
