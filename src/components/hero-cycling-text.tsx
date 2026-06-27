"use client";

import { useEffect, useState } from "react";

const PHRASES = ["More Customers.", "More Deals.", "More Opportunity."];
const INTERVAL = 2400;

export function HeroCyclingText() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, 300);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      style={{
        display: "inline-block",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
      }}
    >
      {PHRASES[index]}
    </span>
  );
}
