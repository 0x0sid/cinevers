import type { SceneMode } from "@/lib/cinevers";

/** where the hero loop lives (a static asset host; the loop is part of the site, not of the API) */
const HERO_BASE = "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/site";
export const HERO = { mp4: `${HERO_BASE}/hero.mp4`, webm: `${HERO_BASE}/hero.webm`, poster: `${HERO_BASE}/hero-poster.jpg` };

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cinevers.xyz";
export const SITE_NAME = "Cinevers";
export const TAGLINE = "Describe a scene. Then stand inside it.";

/** the one factual line about what a scene is. Shown small on the viewer page and in the FAQ; nothing else on the site describes the format. */
export const HONEST_LINE = "AI-generated 180° video — look around with your head or drag.";

export const PASSCODE_KEY = "ss.passcode";

export const MODES: readonly { id: SceneMode; name: string; note: string; exp?: true }[] = [
  { id: "static", name: "Static", note: "The camera stays still. Anything in the scene can move." },
  { id: "ride", name: "Ride", note: "You rise smoothly, like a glass elevator." },
  { id: "glide", name: "Glide", note: "You drift slowly forward, like walking. No turns. May be uncomfortable for some people in VR.", exp: true },
];
export const LENGTHS = [5, 10, 15] as const;
export const modeName = (id: string) => MODES.find((m) => m.id === id)?.name ?? "Static";

export const LOAD_PROMPT_EVENT = "ss:load-prompt";
export type LoadPromptDetail = { prompt: string; mode: SceneMode; length: number };
