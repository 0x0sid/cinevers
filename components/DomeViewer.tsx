"use client";
// Viewer: a Three.js sphere seen from inside with an equidistant fisheye shader (lib/domeShader.ts). Drag/touch to look (inertia), wheel/pinch zoom (FOV 40-100), tap-to-play, scrub bar, mute,
// WebXR (head rotation only, the sphere follows the head position).
import { Check, Link2, Maximize2, Pause, Play, Share2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { DOME_FRAG, DOME_VERT, SPHERE_RADIUS, domeUniforms } from "@/lib/domeShader";
import { buttonClass } from "@/components/ui/button";
import { HONEST_LINE, modeName } from "@/components/site/data";
import { countView } from "@/lib/cinevers";
import type { ReadyScene } from "@/lib/ready";

export type ViewerScene = ReadyScene;

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const FOV_MIN = 40, FOV_MAX = 100, PITCH_LIMIT = 85;
const fmt = (t: number) => `${Math.floor(Math.max(0, t || 0) / 60)}:${String(Math.floor(Math.max(0, t || 0) % 60)).padStart(2, "0")}`;

type Api = { start: () => Promise<void>; togglePlay: () => void; toggleMute: () => void; seek: (f: number) => void; toggleGyro: () => void; fullscreen: () => void };

export default function DomeViewer({ scene }: { scene: ViewerScene }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const vrRef = useRef<HTMLSpanElement>(null);
  const api = useRef<Api | null>(null);
  const [tap, setTap] = useState(true);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState({ t: 0, d: scene.video.durationSeconds });
  const [gyroAvail, setGyroAvail] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const [fallback, setFallback] = useState("");

  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);

  useEffect(() => {                                                // one view per visit (the server also counts a visitor once per half hour)
    try { if (sessionStorage.getItem(`ss.viewed.${scene.id}`)) return; sessionStorage.setItem(`ss.viewed.${scene.id}`, "1"); } catch { /* count anyway */ }
    countView(scene.id).catch(() => undefined);
  }, [scene.id]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: scene.title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* cancelled, or the browser refused: nothing to do */ }
  }

  useEffect(() => {
    const stage = stageRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("no WebGL context");
    } catch {
      setFallback("WebGL failed");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);
    const cv = renderer.domElement;
    const onLost = () => setFallback("WebGL context lost");
    cv.addEventListener("webglcontextlost", onLost);

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.poster = scene.thumbnailUrl;
    video.src = scene.assetUrl;
    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const three = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
    camera.rotation.order = "YXZ";
    const mat = new THREE.ShaderMaterial({ uniforms: domeUniforms(THREE, tex, { fov_deg: scene.projection.fovDeg, pitch_deg: scene.projection.pitchDeg, circle: scene.projection.circle }), vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 96, 64), mat);
    three.add(dome);

    const st = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, fov: 75, gyro: false, dq: new THREE.Quaternion() };
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, fov0 = 0, lastMove = 0;
    const size = () => {
      const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const applyCamera = () => {
      camera.fov = st.fov;
      camera.updateProjectionMatrix();
      if (st.gyro) camera.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -st.yaw * DEG)).multiply(st.dq);
      else camera.rotation.set(st.pitch * DEG, -st.yaw * DEG, 0, "YXZ");          // yaw > 0 looks right, pitch > 0 looks up
    };
    const down = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      st.vyaw = st.vpitch = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        fov0 = st.fov;
      }
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) st.fov = clamp((fov0 * pinch0) / d, FOV_MIN, FOV_MAX);
        return;
      }
      const k = st.fov / (cv.clientHeight || 600);          // degrees per pixel
      st.yaw -= dx * k;
      st.pitch = clamp(st.pitch + dy * k, -PITCH_LIMIT, PITCH_LIMIT);
      st.vyaw = -dx * k;
      st.vpitch = dy * k;
      lastMove = performance.now();
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (performance.now() - lastMove > 80) st.vyaw = st.vpitch = 0;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); st.fov = clamp(st.fov + e.deltaY * 0.05, FOV_MIN, FOV_MAX); };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("resize", size);

    // device orientation (phones)
    const zee = new THREE.Vector3(0, 0, 1), eul = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      const orient = ((screen.orientation && screen.orientation.angle) || 0) * DEG;
      eul.set(e.beta * DEG, e.alpha * DEG, -e.gamma * DEG, "YXZ");
      st.dq.setFromEuler(eul).multiply(q1).multiply(q0.setFromAxisAngle(zee, -orient));
    };
    if ("DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches) setGyroAvail(true);

    const setPlayState = () => setPaused(video.paused);
    video.addEventListener("play", setPlayState);
    video.addEventListener("pause", setPlayState);

    const start = async () => {
      setTap(false);
      video.muted = false;
      setMuted(false);
      try { await video.play(); } catch {
        video.muted = true;
        setMuted(true);
        try { await video.play(); } catch { /* needs another tap */ }
      }
      setPaused(video.paused);
    };
    api.current = {
      start,
      togglePlay: () => { if (video.paused) void start(); else video.pause(); },
      toggleMute: () => { video.muted = !video.muted; setMuted(video.muted); },
      seek: (f) => { video.currentTime = f * (video.duration || scene.video.durationSeconds); },
      toggleGyro: async () => {
        if (st.gyro) { st.gyro = false; window.removeEventListener("deviceorientation", onOrient); setGyroOn(false); return; }
        try {
          const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
          if (typeof D.requestPermission === "function" && (await D.requestPermission()) !== "granted") return;
          window.addEventListener("deviceorientation", onOrient);
          st.gyro = true;
          setGyroOn(true);
        } catch { /* stay on drag */ }
      },
      fullscreen: () => { if (document.fullscreenElement) void document.exitFullscreen(); else void (frameRef.current ?? document.documentElement).requestFullscreen?.(); },
    };

    // WebXR: head rotation only (3DoF); the dome follows the head POSITION, like the APK
    renderer.xr.enabled = true;
    renderer.xr.addEventListener("sessionstart", () => { void start(); });
    const vrBtn = VRButton.createButton(renderer);
    vrRef.current?.appendChild(vrBtn);
    const head = new THREE.Vector3();

    const frame = () => {
      if (!renderer.xr.isPresenting) {
        st.yaw += st.vyaw;
        st.pitch = clamp(st.pitch + st.vpitch, -PITCH_LIMIT, PITCH_LIMIT);
        st.vyaw *= 0.93; st.vpitch *= 0.93;
        if (Math.abs(st.vyaw) < 0.002) st.vyaw = 0;
        if (Math.abs(st.vpitch) < 0.002) st.vpitch = 0;
        applyCamera();
        dome.position.set(0, 0, 0);
      } else {
        head.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
        dome.position.copy(head);
      }
      renderer.render(three, camera);
    };
    size();
    applyCamera();
    renderer.setAnimationLoop(frame);
    const clock = setInterval(() => setTime({ t: video.currentTime, d: video.duration || scene.video.durationSeconds }), 250);

    // hooks for automated browser tests; harmless in production
    (window as unknown as { __viewer: unknown }).__viewer = {
      video, ready: true,
      setSize(w: number, h: number) { renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
      setView(yaw: number, pitch: number, fov: number) { st.yaw = yaw; st.pitch = pitch; st.fov = fov; st.vyaw = st.vpitch = 0; applyCamera(); },
      stop() { renderer.setAnimationLoop(null); },
      snapshot() { tex.needsUpdate = true; renderer.render(three, camera); return renderer.domElement.toDataURL("image/png"); },
    };

    return () => {
      clearInterval(clock);
      renderer.setAnimationLoop(null);
      cv.removeEventListener("webglcontextlost", onLost);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
      cv.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", size);
      window.removeEventListener("deviceorientation", onOrient);
      video.pause();
      video.removeAttribute("src");
      video.load();
      tex.dispose();
      mat.dispose();
      dome.geometry.dispose();
      renderer.dispose();
      vrBtn.remove();
      cv.remove();
      delete (window as unknown as { __viewer?: unknown }).__viewer;
    };
  }, [scene]);

  if (fallback) {
    return (
      <section className="mx-auto flex w-[min(900px,calc(100%-2rem))] flex-col items-center gap-4 py-16 text-center">
        <p className="text-white/85">The look-around view is not available here ({fallback}). This is a flat preview of the scene.</p>
        <video src={scene.previewUrl} poster={scene.thumbnailUrl} controls loop muted playsInline className="max-h-[70svh] max-w-full rounded-2xl" />
        <Link className={buttonClass({ variant: "outline" })} href="/gallery">Back to the gallery</Link>
      </section>
    );
  }
  const ctl = "grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-signal";
  return (
    <div className="mx-auto w-full max-w-[1400px] sm:px-4 sm:pt-4">
      <div ref={frameRef} className="relative h-[68svh] min-h-[340px] overflow-hidden bg-black sm:rounded-3xl lg:h-[74svh]">
        <div className="stage absolute inset-0 [&>canvas]:block [&>canvas]:size-full [&>canvas]:cursor-grab [&>canvas]:touch-none" ref={stageRef} />
        {tap && (
          <button className="tap absolute left-1/2 top-1/2 inline-flex h-16 -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-signal px-8 text-lg font-medium text-white hover:bg-signal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" type="button" id="tap" onClick={() => api.current?.start()}>
            <Play className="size-5 fill-current" aria-hidden /> Tap to play
          </button>
        )}
        <div className="controls absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 sm:px-4">
          <button type="button" id="play" className={ctl} aria-label={paused ? "Play" : "Pause"} onClick={() => api.current?.togglePlay()}>{paused ? <Play className="size-4 fill-current" aria-hidden /> : <Pause className="size-4 fill-current" aria-hidden />}</button>
          <input type="range" min={0} max={1000} value={Math.round((1000 * time.t) / (time.d || 1))} aria-label="Seek" className="h-11 min-w-0 flex-1 accent-[#2d5bff]" onChange={(e) => api.current?.seek(Number(e.target.value) / 1000)} />
          <span className="time hidden whitespace-nowrap text-sm tabular-nums text-white/85 sm:block">{fmt(time.t)} / {fmt(time.d)}</span>
          <button type="button" className={ctl} aria-label={muted ? "Unmute" : "Mute"} onClick={() => api.current?.toggleMute()}>{muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}</button>
          {gyroAvail && <button type="button" aria-pressed={gyroOn} className={`${ctl} w-auto px-4 text-sm ${gyroOn ? "!bg-signal" : ""}`} onClick={() => api.current?.toggleGyro()}>Gyro</button>}
          <button type="button" className={ctl} aria-label="Fullscreen" onClick={() => api.current?.fullscreen()}><Maximize2 className="size-4" aria-hidden /></button>
          <span className="vrslot ss-vr" ref={vrRef} />
        </div>
      </div>

      <section className="mx-auto w-[min(820px,calc(100%-2rem))] pb-24 pt-10 sm:pt-14">
        <p className="text-sm text-white/70">{modeName(scene.mode)} · {Math.round(scene.video.durationSeconds)} s · {scene.views} {scene.views === 1 ? "view" : "views"}</p>
        <h1 className="mt-2 text-balance font-serif text-5xl leading-[1.02] tracking-[-0.025em] sm:text-6xl">{scene.title}</h1>
        <p className="label mt-4 text-sm text-white/80">{HONEST_LINE}{scene.comfortNotice ? " (Glide, experimental)" : ""}</p>
        {scene.comfortNotice && <p className="comfort mt-3 max-w-prose rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/85" id="comfort">{scene.comfortNotice}</p>}
        {scene.checksOverridden && <p className="mt-3 max-w-prose text-sm text-white/70">This scene was published after a manual review: the automatic camera check was overridden.</p>}
        <h2 className="mt-10 text-xs font-medium uppercase tracking-wide text-white/70">Prompt</h2>
        <p className="prompt mt-2 whitespace-pre-wrap text-lg leading-relaxed text-white/90">{scene.prompt}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" id="share" onClick={() => void share()} className={buttonClass({ variant: "outline" }, "text-white")}>
            {copied ? <Check className="size-4" aria-hidden /> : canShare ? <Share2 className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            {copied ? "Link copied" : "Share"}
          </button>
          <Link href={`/?${new URLSearchParams({ prompt: scene.prompt, mode: scene.mode, length: String(scene.length) })}#create`} className={buttonClass({})}>Make your own</Link>
          <Link href="/gallery" className={buttonClass({ variant: "ghost" })}>Gallery</Link>
        </div>
        <p className="hint mt-8 text-sm text-white/70">Drag to look around · wheel or pinch to zoom{scene.proofSheetUrl ? <> · <a className="text-white underline underline-offset-4 hover:text-white/80" href={scene.proofSheetUrl} target="_blank" rel="noopener">proof sheet</a></> : null}</p>
        <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>
      </section>
    </div>
  );
}
