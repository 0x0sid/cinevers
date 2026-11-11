"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getScene, CineversApiError, type Scene, type SceneStatus } from "@/lib/cinevers";
import { modeName } from "@/components/site/data";

const STEPS: [SceneStatus, string][] = [
  ["queued", "Requested, waiting for review and the generator"],
  ["processing", "Generating and building your scene"],
  ["ready", "Ready"],
];
const HEADLINE: Record<SceneStatus, string> = { queued: "Waiting for review", processing: "Generating", ready: "Your scene is ready", failed: "Not generated" };

/** polls the public API (typed client) every 3 seconds until the scene is ready or failed */
export default function JobStatus({ id }: { id: string }) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await getScene(id);
        if (stop) return;
        setScene(s);
        setErr("");
        if (s.status === "ready" || s.status === "failed") return;
      } catch (e) {
        if (e instanceof CineversApiError && e.status === 404) { setErr("This request does not exist."); return; }
        if (!stop) setErr("Connection problem, retrying…");
      }
      timer = setTimeout(tick, 3000);
    };
    void tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [id]);

  if (err && !scene) return <p className="rounded-2xl border border-white/15 bg-graphite p-6 text-white" role="alert">{err}</p>;
  if (!scene) return <div aria-hidden className="h-64 animate-pulse rounded-3xl bg-graphite" />;
  const idx = STEPS.findIndex(([s]) => s === scene.status);
  const failed = scene.status === "failed";
  return (
    <div className="rounded-3xl border border-white/10 bg-graphite p-6 sm:p-8" data-status={scene.status}>
      <div className="flex flex-wrap items-center gap-3">
        <span id="status" data-status={scene.status} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm text-white">
          <span aria-hidden className={cn("size-2 rounded-full", scene.status === "ready" ? "bg-signal" : failed ? "bg-stone" : "animate-pulse bg-signal")} />
          {HEADLINE[scene.status]}
        </span>
        <span className="text-sm text-stone">{modeName(scene.mode)} · {scene.length} s</span>
      </div>
      {scene.prompt && <p className="mt-5 text-lg leading-relaxed text-white/90">{scene.prompt}</p>}

      <ol className="mt-8 space-y-3" aria-label="Progress">
        {STEPS.map(([s, label], i) => {
          const done = failed ? i === 0 : i < idx || scene.status === "ready";
          const now = !failed && i === idx && scene.status !== "ready";
          return (
            <li key={s} className={cn("flex items-center gap-3 text-sm", done || now ? "text-white" : "text-stone")} aria-current={now ? "step" : undefined}>
              <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[10px]", done ? "border-signal bg-signal text-white" : now ? "border-signal text-signal" : "border-white/20")}>{done ? "✓" : ""}</span>
              {label}
            </li>
          );
        })}
      </ol>

      {scene.status === "queued" && <p className="mt-6 text-sm text-white/80">Free during preview · every request is reviewed. Nothing is generated until it is approved.</p>}
      {failed && <p className="mt-6 text-white" role="alert">{scene.error ?? "Generation failed."}</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {scene.status === "ready" && <Link className={buttonClass({ size: "lg" })} href={`/s/${scene.id}`}>Open the scene</Link>}
        {(failed || scene.status === "ready") && <Link className={buttonClass({ variant: "outline", size: "lg" }, "text-white")} href="/#create">Describe another scene</Link>}
      </div>
    </div>
  );
}
