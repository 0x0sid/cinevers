import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HONEST_LINE } from "@/components/site/data";

const ROOT = path.resolve(__dirname, "..");
const OLD_NAME = new RegExp("Scene" + "Shift", "i");          // the former brand
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf-8").replace(/\r\n/g, "\n");

describe("copy rules", () => {
  it("the marketing pages never say dome, 3DoF or 3D", () => {
    for (const f of ["app/page.tsx", "app/gallery/page.tsx", "app/layout.tsx", "components/site/PromptBox.tsx", "components/site/GalleryBrowser.tsx", "components/site/SiteNav.tsx", "components/site/SiteFooter.tsx", "components/site/HeroVideo.tsx"]) {
      expect(read(f), f).not.toMatch(/3\s?DoF|\b3D\b|\bdome\b/i);
    }
  });

  it("the honest line is one string, used in the FAQ and on the viewer page only", () => {
    expect(HONEST_LINE).toBe("AI-generated 180° video — look around with your head or drag.");
    expect(["app/page.tsx", "components/DomeViewer.tsx"].filter((f) => read(f).includes("HONEST_LINE"))).toEqual(["app/page.tsx", "components/DomeViewer.tsx"]);
    for (const f of ["components/site/PromptBox.tsx", "components/site/GalleryBrowser.tsx", "components/site/SiteFooter.tsx"]) expect(read(f)).not.toContain("HONEST_LINE");
  });

  it("hero and gallery copy as agreed; no price or credits anywhere", () => {
    const home = read("app/page.tsx");
    expect(home).toContain("Step into your own movie.");
    expect(home).toContain("Describe a scene. Then stand inside it.");
    expect(home).toContain("Create your own immersion.");
    expect(read("components/site/PromptBox.tsx")).toContain("Free during preview · every request is reviewed");
    for (const f of ["components/site/PromptBox.tsx", "app/page.tsx", "components/JobStatus.tsx"]) expect(read(f), f).not.toMatch(/credit|stripe|\$\d/i);
  });

  it("the brand is Cinevers", () => {
    for (const f of ["app/layout.tsx", "app/gallery/page.tsx", "components/site/SiteNav.tsx", "components/site/SiteFooter.tsx", "components/site/data.ts"]) expect(read(f), f).not.toMatch(OLD_NAME);
    expect(read("components/site/SiteFooter.tsx")).toContain("© {SITE_NAME}");
    expect(read("components/site/data.ts")).toContain('SITE_NAME = "Cinevers"');
  });

  it("the three camera modes keep their agreed copy", async () => {
    const { MODES } = await import("@/components/site/data");
    expect(MODES.map((m) => m.id)).toEqual(["static", "ride", "glide"]);
    const by = Object.fromEntries(MODES.map((m) => [m.id, m]));
    expect(by.glide.exp).toBe(true);
    expect(by.glide.note).toBe("You drift slowly forward, like walking. No turns. May be uncomfortable for some people in VR.");
    expect(by.static.note).toBe("The camera stays still. Anything in the scene can move.");
    expect(by.ride.note).toBe("You rise smoothly, like a glass elevator.");
  });
});
