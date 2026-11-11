import { afterEach, describe, expect, it, vi } from "vitest";
import { apiBaseUrl, countView, createScene, CineversApiError, getScene, listScenes } from "@/lib/cinevers";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_CINEVERS_API_URL;
});

const stub = (res: Response | Error) => {
  const f = vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  });
  vi.stubGlobal("fetch", f);
  return f;
};
const j = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
const call = (f: ReturnType<typeof stub>, n = 0) => f.mock.calls[n] as unknown as [string, RequestInit];

describe("typed API client", () => {
  it("uses the configured base URL (trailing slash trimmed), same origin when unset", () => {
    expect(apiBaseUrl()).toBe("");
    process.env.NEXT_PUBLIC_CINEVERS_API_URL = "https://api.example.test/";
    expect(apiBaseUrl()).toBe("https://api.example.test");
  });

  it("createScene posts JSON with the passcode header", async () => {
    process.env.NEXT_PUBLIC_CINEVERS_API_URL = "https://api.example.test";
    const f = stub(j({ jobId: "a".repeat(24) }, 202));
    expect(await createScene({ prompt: "a lighthouse in a storm at night", mode: "ride", length: 10 }, "pass-1")).toEqual({ jobId: "a".repeat(24) });
    const [url, init] = call(f);
    expect(url).toBe("https://api.example.test/api/v1/scenes");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-cinevers-passcode"]).toBe("pass-1");
    expect(JSON.parse(init.body as string)).toEqual({ prompt: "a lighthouse in a storm at night", mode: "ride", length: 10 });
  });

  it("getScene encodes the id and parses the body; listScenes can sort by popularity", async () => {
    const scene = { id: "b".repeat(24), status: "queued", mode: "static", length: 5, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    let f = stub(j(scene));
    expect(await getScene("a/b?c")).toEqual(scene);
    expect(call(f)[0]).toBe("/api/v1/scenes/a%2Fb%3Fc");
    f = stub(j([]));
    await listScenes();
    expect(call(f)[0]).toBe("/api/v1/scenes");
    f = stub(j([]));
    await listScenes({ sort: "popular" });
    expect(call(f)[0]).toBe("/api/v1/scenes?sort=popular");
  });

  it("countView posts to the view endpoint without a body", async () => {
    const f = stub(j({ views: 7 }));
    expect(await countView("e".repeat(24))).toEqual({ views: 7 });
    const [url, init] = call(f);
    expect(url).toBe(`/api/v1/scenes/${"e".repeat(24)}/view`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("throws a typed CineversApiError with status, code and message", async () => {
    stub(j({ code: "unauthorized", message: "Missing or wrong passcode" }, 401));
    const err = await createScene({ prompt: "a lighthouse in a storm at night" }, "x").catch((e) => e);
    expect(err).toBeInstanceOf(CineversApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ name: "CineversApiError", status: 401, code: "unauthorized", message: "Missing or wrong passcode" });
    expect(err.retryAfter).toBeUndefined();
  });

  it("carries retryAfter on 429, from the body or from the Retry-After header", async () => {
    stub(j({ code: "rate_limited", message: "slow down", retryAfter: 3600 }, 429, { "retry-after": "3600" }));
    expect(await getScene("d".repeat(24)).catch((e) => e)).toMatchObject({ status: 429, code: "rate_limited", retryAfter: 3600 });
    stub(j({ code: "rate_limited", message: "slow down" }, 429, { "retry-after": "42" }));
    expect(await listScenes().catch((e) => e)).toMatchObject({ retryAfter: 42 });
  });

  it("handles non-JSON errors and network failures", async () => {
    stub(new Response("<html>bad gateway</html>", { status: 502 }));
    expect(await listScenes().catch((e) => e)).toMatchObject({ status: 502, code: "http_error", message: "HTTP 502" });
    stub(new TypeError("fetch failed"));
    expect(await listScenes().catch((e) => e)).toMatchObject({ status: 0, code: "network_error", message: "fetch failed" });
  });
});
