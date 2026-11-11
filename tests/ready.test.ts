import { describe, expect, it } from "vitest";
import type { Scene } from "@/lib/cinevers";
import { toReady } from "@/lib/ready";

const full: Scene = {
  id: "a".repeat(24), status: "ready", prompt: "a lighthouse in a storm", title: "Lighthouse", views: 3, mode: "static", length: 5,
  assetUrl: "https://x.test/dome.mp4", thumbnailUrl: "https://x.test/p.jpg", previewUrl: "https://x.test/p.mp4",
  projection: { fovDeg: 200, pitchDeg: 0, circle: { cx: 720, cy: 720, r: 720, size: 1440 }, feather: 0.05 },
  video: { width: 1440, height: 1440, fps: 24, durationSeconds: 5, hasAudio: true },
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("toReady", () => {
  it("accepts a complete ready scene", () => {
    expect(toReady(full)).toBe(full);
  });
  it("refuses anything that is not viewable yet, or is missing a field the viewer needs", () => {
    expect(toReady({ ...full, status: "processing" })).toBeNull();
    expect(toReady({ ...full, status: "failed", error: "Generation failed." })).toBeNull();
    for (const k of ["assetUrl", "thumbnailUrl", "previewUrl", "projection", "video", "title", "prompt"] as const) {
      const s = { ...full } as Partial<Scene>;
      delete s[k];
      expect(toReady(s as Scene), k).toBeNull();
    }
  });
});
