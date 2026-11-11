/**
 * Cinevers public API v1: request and response types.
 *
 * Dependency-free on purpose: copy this file into any TypeScript project. Every field here exists in
 * the backend; nothing is promised that the service does not do (for example there is no image input).
 */

/**
 * How the camera behaves in the generated scene.
 * - `"static"`: the camera stays still; anything in the scene can move.
 * - `"ride"`: the camera rises smoothly, like a glass elevator.
 * - `"glide"`: EXPERIMENTAL. The camera drifts slowly forward, like walking, with no turns.
 *   Some people find it uncomfortable in a headset.
 */
export type SceneMode = "static" | "ride" | "glide";

/** Length of the generated clip in seconds. */
export type SceneLength = 5 | 10 | 15;

/**
 * Where a scene is in its life.
 * - `"queued"`: received, waiting for a human review or for the generator.
 * - `"processing"`: being generated and packaged (also: finished but not yet published).
 * - `"ready"`: published; `assetUrl` and `viewerUrl` are available.
 * - `"failed"`: not generated, or generation failed; see `error`.
 */
export type SceneStatus = "queued" | "processing" | "ready" | "failed";

/** Body of `POST /api/v1/scenes`. */
export interface CreateSceneInput {
  /** What the scene should show. Required, 8 to 400 characters. No real people, brands or links. */
  prompt: string;
  /** Camera behaviour. Optional, defaults to `"static"`. */
  mode?: SceneMode;
  /** Clip length in seconds. Optional, defaults to `5`. */
  length?: SceneLength;
}

/** Response of `POST /api/v1/scenes` (HTTP 202: accepted, a human reviews every request). */
export interface CreateSceneResponse {
  /** Opaque, unguessable id of the request. Use it with `GET /api/v1/scenes/{jobId}`. */
  jobId: string;
}

/** How the 180° video frame maps onto the viewer sphere (an equidistant fisheye). */
export interface SceneProjection {
  /** Field of view of the fisheye image circle, in degrees. */
  fovDeg: number;
  /** How far the image axis is pitched up from the horizon, in degrees. */
  pitchDeg: number;
  /** The image circle inside the (square) video frame, in pixels. */
  circle: { cx: number; cy: number; r: number; size: number };
  /** Width of the soft edge, as a fraction of the radius. */
  feather: number;
}

/** Technical facts about the video file of a scene. */
export interface SceneVideo {
  /** Frame width in pixels. */
  width: number;
  /** Frame height in pixels. */
  height: number;
  /** Frames per second. */
  fps: number;
  /** Duration in seconds. */
  durationSeconds: number;
  /** Whether the video has a sound track. */
  hasAudio: boolean;
}

/** One scene, as returned by `GET /api/v1/scenes/{jobId}`. */
export interface Scene {
  /** The id that was returned as `jobId` when the scene was requested. */
  id: string;
  /** Current status. */
  status: SceneStatus;
  /** The prompt that was submitted (after whitespace clean-up). */
  prompt?: string;
  /** Camera behaviour that was requested. */
  mode: SceneMode;
  /** Clip length in seconds. */
  length: SceneLength;
  /** URL of the 180° video file. Only present when `status` is `"ready"`. */
  assetUrl?: string;
  /** URL of the web viewer page for this scene. Only present when `status` is `"ready"`. */
  viewerUrl?: string;
  /** Display title. Only present when `status` is `"ready"`. */
  title?: string;
  /** How many times the scene was opened in the viewer. Only present when `status` is `"ready"`. */
  views?: number;
  /** URL of a still image of the scene. Only present when `status` is `"ready"`. */
  thumbnailUrl?: string;
  /** URL of a short look-around preview video. Only present when `status` is `"ready"`. */
  previewUrl?: string;
  /** URL of a contact sheet of rectilinear views of the scene. Only present when `status` is `"ready"` and one exists. */
  proofSheetUrl?: string;
  /** How the 180° video maps onto the viewer sphere. Only present when `status` is `"ready"`. */
  projection?: SceneProjection;
  /** Technical facts about the video file. Only present when `status` is `"ready"`. */
  video?: SceneVideo;
  /** Present for `"glide"` scenes: a comfort note to show before playing (the camera moves on its own). */
  comfortNotice?: string;
  /** `true` when the scene was published after a manual review overrode the automatic quality check. */
  checksOverridden?: boolean;
  /** Short public reason. Only present when `status` is `"failed"`. */
  error?: string;
  /** When the request was created, ISO 8601 (UTC). */
  createdAt: string;
  /** When the request last changed, ISO 8601 (UTC). */
  updatedAt: string;
}

/** One entry of `GET /api/v1/scenes` (published scenes only). */
export interface SceneSummary {
  /** Scene id. */
  id: string;
  /** Display title, when the scene has one. */
  title?: string;
  /** Always `"ready"` in the public list. */
  status: SceneStatus;
  /** URL of a still image of the scene. */
  thumbnailUrl?: string;
  /** URL of a short look-around preview video. */
  previewUrl?: string;
  /** The prompt the scene was made from. */
  prompt: string;
  /** Camera behaviour of the scene. */
  mode: SceneMode;
  /** How many times the scene was opened in the viewer. */
  views: number;
  /** Clip length in seconds. */
  length: SceneLength;
  /** When the request was created, ISO 8601 (UTC). */
  createdAt: string;
}

/** Response of `POST /api/v1/scenes/{id}/view`. */
export interface ViewCountResponse {
  /** The view count after this visit (a visitor counts once per scene per 30 minutes). */
  views: number;
}

/** Body of every non-2xx response. */
export interface CineversErrorBody {
  /** Stable machine-readable code, for example `"invalid_input"`, `"unauthorized"`, `"rate_limited"`, `"not_found"`. */
  code: string;
  /** Human-readable explanation. */
  message: string;
  /** Seconds to wait before retrying. Only present on rate-limit responses. */
  retryAfter?: number;
}
