# Cinevers

**Step into your own movie.** Describe a scene, and stand inside it: text to immersive 180° video, on screen or in VR.

> AI-generated 180° video — look around with your head or drag.

Live: [www.cinevers.xyz](https://www.cinevers.xyz)

This repository is the **frontend** only: the site, the 180° viewer and a typed client for the public API. The backend and the generation engine are **proprietary and not included**. Everything the site shows comes from the hosted public API described [below](#api). See [LICENSE](LICENSE): source-available for viewing, all rights reserved.

## For judges

Try it live: https://www.cinevers.xyz/judges  
Invitation password: invitecineverstoycschool (3 generations in total, 720p).  
This repository contains the frontend only. The backend and the generation engine are proprietary and not included.

## What is in here

- **Site**: a full-bleed video hero with the prompt box, a gallery with a side panel (read the prompt, load it back into the form, open the viewer), Newest/Popular sorting, FAQ.
- **Viewer**: Three.js, drag / pinch / wheel with inertia, gyro on phones, tap-to-play, scrub bar, share, fullscreen, and WebXR (**Enter VR** in a headset browser such as the Quest's).
- **Request status page**: follows a request until its scene is ready.
- **Typed API client**: `lib/cinevers` (types + `fetch` client, no dependencies).

## Architecture

```
 browser ──► Cinevers frontend (this repository, Next.js)
                  │
                  └──► Cinevers public API   https://www.cinevers.xyz/api/v1   (hosted, not in this repository)
```

The frontend holds no secrets and no server logic. It reads scenes, counts views and submits requests only through the public API, using the typed client in `lib/cinevers`.

## Run locally

Needs Node 20+.

```bash
npm ci
cp .env.example .env.local     # NEXT_PUBLIC_CINEVERS_API_URL=https://www.cinevers.xyz
npm run dev                    # http://localhost:3000, showing the real gallery from the hosted API
```

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The one setting is `NEXT_PUBLIC_CINEVERS_API_URL`. Sending a request needs the access passcode of the hosted service (not in this repository).

## Layout

```
app/            pages: home, gallery, scene viewer, request status
components/     site UI, the viewer, small UI primitives
lib/cinevers/   public API types and typed client
lib/            shared helpers and the viewer shader
tests/          vitest suite (client, copy rules, docs, a guard that keeps server code out)
```

## API

A small public API (v1) to request scenes and read them back. It is a thin layer over what the website does: same passcode, same rate limits, same human review, same caps. Everything here is free during the preview.

### Base URL

The examples use `https://www.cinevers.xyz`. In the typed client the base URL comes from the environment:

```
NEXT_PUBLIC_CINEVERS_API_URL=https://www.cinevers.xyz
```

When neither is set, the client calls the same origin (relative URLs), which is what you want inside this site. In Node there is no same origin: set the variable. Browser clients on other origins work too: the API answers CORS preflights (`Access-Control-Allow-Origin: *`).

### Authentication

Creating a scene needs the access passcode in the `X-Cinevers-Passcode` header. Reading (`GET`) needs nothing: scene ids are unguessable, and the list only shows published scenes.

### Endpoints

#### `POST /api/v1/scenes`: request a scene

Body: `CreateSceneInput`. `prompt` is required (8 to 400 characters; no real people, brands or links). `mode` defaults to `"static"`, `length` to `5`. The clip is rendered at 720p.

```bash
curl -X POST https://www.cinevers.xyz/api/v1/scenes \
  -H "content-type: application/json" \
  -H "X-Cinevers-Passcode: $CINEVERS_PASSCODE" \
  -d '{"prompt":"a lighthouse in a storm, huge waves breaking against the rocks at night","mode":"static","length":5}'
```

```
HTTP/1.1 202 Accepted
{"jobId":"81a0e5554c85a00fe635fb64"}
```

`202` means accepted: a human reviews every request before anything is generated. Errors: `400` invalid input, `401` missing or wrong passcode, `429` rate limited (`Retry-After` header and `retryAfter` in the body).

#### `GET /api/v1/scenes/{jobId}`: read one scene

```bash
curl https://www.cinevers.xyz/api/v1/scenes/8a9c1d2f495a919808f315df
```

```json
{
  "id": "8a9c1d2f495a919808f315df",
  "status": "ready",
  "prompt": "a huge Tyrannosaurus rex walks out of a red sandstone canyon at golden hour and roars at the camera",
  "mode": "static",
  "length": 15,
  "assetUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/8a9c1d2f495a919808f315df/dome.mp4",
  "viewerUrl": "https://www.cinevers.xyz/s/8a9c1d2f495a919808f315df",
  "title": "T-rex canyon",
  "views": 41,
  "thumbnailUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/8a9c1d2f495a919808f315df/poster.jpg",
  "previewUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/8a9c1d2f495a919808f315df/preview.mp4",
  "proofSheetUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/8a9c1d2f495a919808f315df/proof_sheet.png",
  "projection": {
    "fovDeg": 200,
    "pitchDeg": 35,
    "circle": {
      "cx": 720.23,
      "cy": 723.99,
      "r": 720,
      "size": 1440
    },
    "feather": 0.05
  },
  "video": {
    "width": 1440,
    "height": 1440,
    "fps": 24,
    "durationSeconds": 15.042,
    "hasAudio": true
  },
  "createdAt": "2026-11-11T05:40:42.213Z",
  "updatedAt": "2026-11-11T05:40:42.213Z"
}
```

While the scene is not ready, `assetUrl` and `viewerUrl` are absent:

```json
{
  "id": "70807c2b570f51e4eb9e0671",
  "status": "queued",
  "prompt": "a quiet pond at dawn with mist",
  "mode": "static",
  "length": 10,
  "createdAt": "2026-11-11T12:27:28.384Z",
  "updatedAt": "2026-11-11T12:27:28.384Z"
}
```

`404` for an unknown id.

#### `GET /api/v1/scenes`: list published scenes

Newest first, published scenes only. Add `?sort=popular` to order by views.

```bash
curl "https://www.cinevers.xyz/api/v1/scenes?sort=popular"
```

```json
[
  {
    "id": "fb69bc725be15108b55a872e",
    "title": "Mammoth valley",
    "status": "ready",
    "thumbnailUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/fb69bc725be15108b55a872e/poster.jpg",
    "previewUrl": "https://sktjibtdiv7snngk.public.blob.vercel-storage.com/scenes/fb69bc725be15108b55a872e/preview.mp4",
    "prompt": "a herd of woolly mammoths walks slowly through a snowy valley at sunset, the closest one passes near the camera and raises its trunk",
    "mode": "static",
    "views": 63,
    "length": 5,
    "createdAt": "2026-11-11T05:43:33.799Z"
  }
]
```

#### `POST /api/v1/scenes/{jobId}/view`: count a view

Call it once when a viewer opens a scene. A visitor counts once per scene per 30 minutes. `404` unless the scene is published.

```bash
curl -X POST https://www.cinevers.xyz/api/v1/scenes/8a9c1d2f495a919808f315df/view
```

```json
{"views":42}
```

### Status

| `status`     | meaning |
|--------------|---------|
| `queued`     | received; waiting for the human review, or for the generator after approval |
| `processing` | being generated and packaged (also: finished but not published yet) |
| `ready`      | published: `assetUrl` and `viewerUrl` are available |
| `failed`     | not approved, or generation failed; `error` has a short public reason |

`assetUrl` is the 180° video file; `viewerUrl` opens it in the web viewer. A `ready` scene also carries its `title`, `views`, `thumbnailUrl`, `previewUrl`, the `projection` and `video` facts a viewer needs, and a `comfortNotice` for glide scenes. It reports its real clip length (rounded to 5, 10 or 15 seconds).

### Limits

- Prompt: 8 to 400 characters, no real people, brands or links.
- Rate limit: 10 requests per hour per network address (wrong passcodes are limited harder). A `429` carries `Retry-After`.
- Every request is reviewed by a human before anything is generated. Free during the preview.
- Typically 3 to 10 minutes after approval; the review itself can take longer.

### Errors

Every non-2xx response has the same body, `CineversErrorBody`:

```json
{ "code": "rate_limited", "message": "Too many requests from your network, try again later.", "retryAfter": 3600 }
```

```json
{ "code": "unauthorized", "message": "Missing or wrong passcode (header x-cinevers-passcode)." }
```

Codes: `invalid_input` (400), `unauthorized` (401), `not_found` (404), `rate_limited` (429), `unavailable` (503), `internal_error` (500).

### TypeScript types

Copied from [`lib/cinevers/types.ts`](lib/cinevers/types.ts) (dependency-free, copy the file into your project):

```ts
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
```

### Client

`lib/cinevers` has a typed client over plain `fetch` (`createScene`, `getScene`, `listScenes`, `countView`). Every non-2xx response and every network failure throws a `CineversApiError` with `status`, `code`, `message` and `retryAfter`.

```ts
import { createScene, getScene } from "@/lib/cinevers";

const { jobId } = await createScene({ prompt: "a lighthouse in a storm at night", mode: "static", length: 5 }, passcode);
let scene = await getScene(jobId);
while (scene.status === "queued" || scene.status === "processing") {
  await new Promise((r) => setTimeout(r, 5000));
  scene = await getScene(jobId);
}
console.log(scene.status === "ready" ? scene.viewerUrl : scene.error);
```

Catch `CineversApiError` to react to `429` (wait `retryAfter` seconds) or `401` (wrong passcode).

## License

Copyright (c) 2026 Cinevers. All rights reserved. Source-available for viewing, no reuse (see [LICENSE](LICENSE)). The backend and the generation engine are proprietary and not included.
