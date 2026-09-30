"use client";

import { useEffect, useRef } from "react";

export function TopbarVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (azHareket) ref.current?.pause();
  }, []);

  return (
    <video ref={ref} className="topbar-video" autoPlay loop muted playsInline poster="/topbar-bg.jpg" aria-hidden="true">
      <source src="/topbar-bg.mp4" type="video/mp4" />
    </video>
  );
}
