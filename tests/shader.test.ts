import { describe, expect, it } from "vitest";
import { BACKGROUND, DOME_FRAG, DOME_VERT, EDGE_FRACTION, SPHERE_RADIUS } from "@/lib/domeShader";

describe("viewer shader", () => {
  it("keeps its projection constants and the equidistant mapping", () => {
    expect(EDGE_FRACTION).toBe(0.998);
    expect(SPHERE_RADIUS).toBe(50);
    expect(BACKGROUND).toEqual([0.01, 0.01, 0.015]);
    expect(DOME_VERT).toContain("gl_Position");
    expect(DOME_FRAG).toContain("theta / halfFov * circle.z");
    expect(DOME_FRAG).toContain("d_dome = Rx(+tilt) d_level");
  });
});
