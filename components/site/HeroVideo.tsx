"use client";
import { useEffect, useRef } from "react";
import { HERO } from "./data";

/** full-bleed mood loop, served from a static asset host. Autoplay needs the muted PROPERTY set before play(); under prefers-reduced-motion CSS hides the video and shows the poster instead. */
export function HeroVideo() {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    el.muted = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.play().catch(() => undefined);
  }, []);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO.poster} alt="" width={1920} height={1080} fetchPriority="high" className="ss-hero-still absolute inset-0 hidden size-full object-cover" />
      <video ref={v} className="ss-hero-video absolute inset-0 size-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={HERO.poster} aria-hidden tabIndex={-1}>
        <source src={HERO.webm} type="video/webm" />
        <source src={HERO.mp4} type="video/mp4" />
      </video>
    </>
  );
}
