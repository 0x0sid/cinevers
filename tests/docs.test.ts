import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").replace(/\r\n/g, "\n");

describe("README", () => {
  it("contains the API types exactly as they are in lib/cinevers/types.ts", () => {
    expect(read("README.md")).toContain(read("lib/cinevers/types.ts").trimEnd());
  });
  it("documents the hosted API endpoints, the honest line, and that the backend and engine are not included", () => {
    const md = read("README.md");
    for (const s of ["POST /api/v1/scenes", "GET /api/v1/scenes/{jobId}", "GET /api/v1/scenes`", "/view", "X-Cinevers-Passcode", "NEXT_PUBLIC_CINEVERS_API_URL", "AI-generated 180° video — look around with your head or drag.", "proprietary and not included"]) expect(md, s).toContain(s);
    expect(md).not.toMatch(/3DoF|\b3D\b/i);
  });
});
