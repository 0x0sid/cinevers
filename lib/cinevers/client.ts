// Typed client for the Cinevers public API v1. Uses `fetch` only, no dependencies; works in the browser, Node 18+ and edge runtimes.
import type { CineversErrorBody, CreateSceneInput, CreateSceneResponse, Scene, SceneSummary, ViewCountResponse } from "./types";

/**
 * Base URL of the API, from `NEXT_PUBLIC_CINEVERS_API_URL` (for example `https://www.cinevers.xyz`).
 * When it is not set, requests go to the same origin (relative URLs), which is what you want inside the Cinevers site itself.
 * In Node there is no "same origin": set the variable there.
 */
export function apiBaseUrl(): string {
  const v = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_CINEVERS_API_URL : undefined;
  return (v ?? "").replace(/\/+$/, "");
}

/** Thrown for every non-2xx response and for network failures (`status` 0, `code` "network_error"). */
export class CineversApiError extends Error {
  /** HTTP status, or 0 when the request never got an answer. */
  readonly status: number;
  /** Stable machine-readable code from the API, for example "unauthorized" or "rate_limited". */
  readonly code: string;
  /** Seconds to wait before retrying, when the API said so (HTTP 429). */
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = "CineversApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function request<T>(method: "GET" | "POST", path: string, init: { body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiBaseUrl() + path, {
      method,
      headers: { accept: "application/json", ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch (e) {
    throw new CineversApiError(0, "network_error", e instanceof Error ? e.message : "Network error");
  }
  if (res.ok) return (await res.json()) as T;
  let body: Partial<CineversErrorBody> = {};
  try {
    body = (await res.json()) as Partial<CineversErrorBody>;
  } catch {
    /* not JSON (a proxy error page, for example) */
  }
  const header = Number(res.headers.get("retry-after"));
  const retryAfter = typeof body.retryAfter === "number" ? body.retryAfter : Number.isFinite(header) && header > 0 ? header : undefined;
  throw new CineversApiError(res.status, body.code ?? "http_error", body.message ?? `HTTP ${res.status}`, retryAfter);
}

/**
 * Request a new scene. Every request is reviewed by a human before anything is generated, so this returns right away with an id:
 * poll {@link getScene} until its status is "ready" or "failed".
 *
 * @param input the prompt (8 to 400 characters), optionally `mode` ("static" | "ride" | "glide") and `length` (5 | 10 | 15 seconds)
 * @param passcode the access passcode (sent as the `X-Cinevers-Passcode` header)
 * @throws {CineversApiError} 400 `invalid_input`, 401 `unauthorized`, 429 `rate_limited` (see `retryAfter`)
 * @example
 * const { jobId } = await createScene({ prompt: "a herd of woolly mammoths walks through a snowy valley at sunset", mode: "static", length: 5 }, "my-passcode");
 */
export function createScene(input: CreateSceneInput, passcode: string): Promise<CreateSceneResponse> {
  return request<CreateSceneResponse>("POST", "/api/v1/scenes", { body: input, headers: { "x-cinevers-passcode": passcode } });
}

/**
 * Read one scene by the id that {@link createScene} returned.
 *
 * @param jobId the id from `createScene`
 * @throws {CineversApiError} 404 `not_found` for an unknown id
 * @example
 * const scene = await getScene(jobId);
 * if (scene.status === "ready") console.log(scene.viewerUrl, scene.assetUrl);
 */
export function getScene(jobId: string): Promise<Scene> {
  return request<Scene>("GET", `/api/v1/scenes/${encodeURIComponent(jobId)}`);
}

/**
 * List the published scenes. Newest first, or most viewed first with `sort: "popular"`.
 *
 * @param options `sort`: `"newest"` (default) or `"popular"`
 * @example
 * const scenes = await listScenes({ sort: "popular" });
 * for (const s of scenes) console.log(s.title, s.views, s.thumbnailUrl);
 */
export function listScenes(options: { sort?: "newest" | "popular" } = {}): Promise<SceneSummary[]> {
  return request<SceneSummary[]>("GET", options.sort === "popular" ? "/api/v1/scenes?sort=popular" : "/api/v1/scenes");
}

/**
 * Count one view of a published scene (call it once when the viewer opens; a visitor counts once per scene per 30 minutes).
 *
 * @throws {CineversApiError} 404 `not_found` when the scene is not published
 * @example
 * const { views } = await countView(sceneId);
 */
export function countView(jobId: string): Promise<ViewCountResponse> {
  return request<ViewCountResponse>("POST", `/api/v1/scenes/${encodeURIComponent(jobId)}/view`);
}
