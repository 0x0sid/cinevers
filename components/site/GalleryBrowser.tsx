"use client";
/* eslint-disable @next/next/no-img-element -- scene stills come from the API as plain URLs */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { listScenes, type SceneSummary } from "@/lib/cinevers";
import { buttonClass } from "@/components/ui/button";
import { LOAD_PROMPT_EVENT, modeName, type LoadPromptDetail } from "./data";

type Sort = "newest" | "popular";
const SKELETONS = [0, 1, 2, 3, 4, 5];

/** the gallery grid: scenes from the public API (typed client), Newest/Popular, skeletons, empty and error states, and the side panel */
export function GalleryBrowser({ limit }: { limit?: number }) {
  const [sort, setSort] = useState<Sort>("newest");
  const [scenes, setScenes] = useState<SceneSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<SceneSummary | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const request = useRef(0);

  const load = useCallback(async (next: Sort) => {
    const id = ++request.current;                                   // ignore answers that arrive after a newer request
    setScenes(null);
    setFailed(false);
    try {
      const list = await listScenes({ sort: next });
      if (id === request.current) setScenes(list);
    } catch {
      if (id === request.current) { setFailed(true); setScenes([]); }
    }
  }, []);
  useEffect(() => { void load("newest"); }, [load]);

  const shown = scenes ? (limit ? scenes.slice(0, limit) : scenes) : null;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div role="group" aria-label="Sort" className="inline-flex rounded-full border border-black/10 p-1">
          {(["newest", "popular"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={sort === s} onClick={() => { if (sort !== s) { setSort(s); void load(s); } }}
              className={cn("rounded-full px-4 py-1.5 text-sm capitalize transition-colors focus-visible:outline-2 focus-visible:outline-signal", sort === s ? "bg-ink font-medium text-white" : "text-paper-mute hover:text-ink")}>{s}</button>
          ))}
        </div>
        <p className="text-sm text-paper-mute" aria-live="polite">{scenes === null ? "Loading…" : failed ? "" : `${scenes.length} ${scenes.length === 1 ? "scene" : "scenes"}`}</p>
      </div>

      {shown === null ? (
        <Grid>{SKELETONS.map((i) => <Skeleton key={i} />)}</Grid>
      ) : failed ? (
        <Empty title="The gallery is not available right now." body="Please try again in a moment." />
      ) : shown.length === 0 ? (
        <Empty title="No scenes yet." body="Be the first: describe a place and it will appear here once it is ready." cta />
      ) : (
        <Grid>{shown.map((s) => <Card key={s.id} scene={s} onOpen={(el) => { opener.current = el; setOpen(s); }} />)}</Grid>
      )}

      {open && <Panel scene={open} onClose={() => { setOpen(null); opener.current?.focus(); }} />}
    </div>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => <div id="grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;

function Skeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-black/[0.06]" />
      <div className="space-y-3 p-5"><div className="h-6 w-2/3 animate-pulse rounded bg-black/[0.06]" /><div className="h-4 w-1/3 animate-pulse rounded bg-black/[0.06]" /></div>
    </div>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="empty rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center">
      <p className="font-serif text-3xl tracking-tight text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-paper-mute">{body}</p>
      {cta && <Link href="/#create" className={buttonClass({}, "mt-6")}>Create a scene</Link>}
    </div>
  );
}

/** a card opens the side panel (it is a button, not a link) */
function Card({ scene, onOpen }: { scene: SceneSummary; onOpen: (el: HTMLElement) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const play = () => { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) video.current?.play().catch(() => undefined); };
  const stop = () => video.current?.pause();
  return (
    <button type="button" aria-haspopup="dialog" onClick={(e) => onOpen(e.currentTarget)} onMouseEnter={play} onMouseLeave={stop} onFocus={play} onBlur={stop}
      className="scene group block w-full overflow-hidden rounded-2xl border border-black/10 bg-white text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-graphite">
        {scene.thumbnailUrl && <img src={scene.thumbnailUrl} alt="" width={640} height={480} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />}
        {scene.previewUrl && <video ref={video} src={scene.previewUrl} muted loop playsInline preload="none" aria-hidden tabIndex={-1} className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />}
        <span className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-signal text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Play className="size-4 translate-x-px fill-current" aria-hidden />
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-2xl leading-tight tracking-tight text-ink">{scene.title}</h3>
          <p className="mt-1 text-sm text-paper-mute">{scene.length} s · {modeName(scene.mode)}</p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-xs text-paper-mute"><Eye className="size-3.5" aria-hidden />{scene.views}</span>
      </div>
    </button>
  );
}

/** side panel (bottom sheet on a phone): full prompt, Load this prompt, Open viewer */
function Panel({ scene, onClose }: { scene: SceneSummary; onClose: () => void }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("ss-lock");
    const id = requestAnimationFrame(() => setShown(true));
    closeBtn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && root.current) {                                                  // keep the focus inside the dialog
        const f = [...root.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { cancelAnimationFrame(id); document.documentElement.classList.remove("ss-lock"); document.removeEventListener("keydown", key); };
  }, [onClose]);

  const load = () => {
    const detail: LoadPromptDetail = { prompt: scene.prompt, mode: scene.mode, length: scene.length };
    if (document.getElementById("prompt")) {                                                  // the prompt box is on this page: fill it and scroll up to it
      window.dispatchEvent(new CustomEvent(LOAD_PROMPT_EVENT, { detail }));
      onClose();
      document.getElementById("create")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    } else {
      router.push(`/?${new URLSearchParams({ prompt: detail.prompt, mode: detail.mode, length: String(detail.length) })}#create`);
    }
  };

  return (
    <div ref={root} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div onClick={onClose} className={cn("absolute inset-0 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")} />
      <aside className={cn("absolute bottom-0 right-0 flex max-h-[92svh] w-full flex-col overflow-y-auto rounded-t-3xl bg-paper text-ink shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.5)] transition-transform duration-300 motion-reduce:transition-none sm:inset-y-0 sm:max-h-none sm:w-[460px] sm:rounded-none sm:rounded-l-3xl",
        shown ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full sm:translate-y-0")}>
        <div className="relative aspect-[4/3] shrink-0 bg-graphite">
          {scene.thumbnailUrl && <img src={scene.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />}
          {scene.previewUrl && <video src={scene.previewUrl} muted loop playsInline autoPlay aria-hidden tabIndex={-1} className="absolute inset-0 size-full object-cover" />}
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-signal"><X className="size-5" aria-hidden /></button>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <h2 id="panel-title" className="font-serif text-4xl leading-tight tracking-tight">{scene.title}</h2>
          <p className="mt-2 text-sm text-paper-mute">{modeName(scene.mode)} · {scene.length} s · {scene.views} {scene.views === 1 ? "view" : "views"}</p>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-paper-mute">Prompt</p>
          <p className="mt-1.5 whitespace-pre-wrap leading-relaxed" id="panel-prompt">{scene.prompt}</p>
          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
            <button type="button" onClick={load} className={buttonClass({ size: "lg" }, "flex-1")}>Load this prompt</button>
            <Link href={`/s/${scene.id}`} className={buttonClass({ variant: "outlineLight", size: "lg" }, "flex-1")}>Open viewer</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
