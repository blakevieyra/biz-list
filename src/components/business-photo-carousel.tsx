"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VISIBLE_COUNT = 5;

export function BusinessPhotoCarousel({ urls }: { urls: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(urls.length > VISIBLE_COUNT);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [urls.length, updateScrollState]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const photoStep = el.querySelector<HTMLElement>("[data-photo-slide]")?.offsetWidth ?? 156;
    const gap = 12;
    const step = (photoStep + gap) * Math.min(VISIBLE_COUNT, urls.length);
    el.scrollBy({ left: direction === "right" ? step : -step, behavior: "smooth" });
    window.setTimeout(updateScrollState, 320);
  }

  if (urls.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-full overflow-hidden sm:max-w-[52rem]">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Previous photos"
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-lg shadow-sm hover:border-accent/40 sm:-left-4"
        >
          ‹
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            data-photo-slide
            className="h-28 w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-slate-100 sm:h-32 sm:w-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading={index < VISIBLE_COUNT ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          type="button"
          aria-label="Next photos"
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-lg shadow-sm hover:border-accent/40 sm:-right-4"
        >
          ›
        </button>
      )}
    </div>
  );
}
