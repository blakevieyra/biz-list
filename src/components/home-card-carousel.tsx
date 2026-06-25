import type { ReactNode } from "react";

/** Horizontal scroll row for home dashboard cards (events, favorites). */
export function HomeCardCarousel({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-smooth sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {children}
    </div>
  );
}

export function HomeCarouselItem({ children }: { children: ReactNode }) {
  return <div className="w-72 shrink-0 snap-start sm:w-80">{children}</div>;
}
