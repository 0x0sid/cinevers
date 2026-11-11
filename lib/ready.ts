import type { Scene } from "@/lib/cinevers";

/** a scene that is published, with every field the viewer needs */
export type ReadyScene = Scene & Required<Pick<Scene, "prompt" | "title" | "views" | "assetUrl" | "thumbnailUrl" | "previewUrl" | "projection" | "video">>;

/** narrows a Scene from the API to a ReadyScene, or null when it is not (yet) viewable */
export function toReady(s: Scene): ReadyScene | null {
  if (s.status !== "ready" || !s.prompt || !s.title || s.views === undefined || !s.assetUrl || !s.thumbnailUrl || !s.previewUrl || !s.projection || !s.video) return null;
  return s as ReadyScene;
}
