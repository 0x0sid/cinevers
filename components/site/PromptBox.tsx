"use client";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { createScene, CineversApiError, type SceneMode } from "@/lib/cinevers";
import { Button } from "@/components/ui/button";
import { LENGTHS, LOAD_PROMPT_EVENT, MODES, PASSCODE_KEY, type LoadPromptDetail } from "./data";

const IDEAS = ["woolly mammoths at sunset", "a neon night market in the rain", "inside a coral reef at dawn", "a lighthouse in a storm"];
const MAX = 400;
const isMode = (v: unknown): v is SceneMode => MODES.some((m) => m.id === v);
const passcodeMemo = {
  get: () => { try { return sessionStorage.getItem(PASSCODE_KEY) ?? ""; } catch { return ""; } },
  set: (v: string) => { try { sessionStorage.setItem(PASSCODE_KEY, v); } catch { /* private mode: type it again */ } },
};

/** the hero's centrepiece. Light frosted blur lives ONLY here. Requests go through the typed API client. */
export function PromptBox() {
  const router = useRouter();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const passcodeInput = useRef<HTMLInputElement>(null);
  const options = useRef<HTMLDetailsElement>(null);
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<SceneMode>("static");
  const [length, setLength] = useState<number>(5);
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = MODES.find((m) => m.id === mode)!;
  const showCaret = !prompt && !focused;

  useEffect(() => {
    setPasscode(passcodeMemo.get());
    // "Load this prompt" from the gallery: on this page through an event, from another page through the query string
    const apply = (d: Partial<LoadPromptDetail>) => {
      if (typeof d.prompt === "string") setPrompt(d.prompt.slice(0, MAX));
      if (isMode(d.mode)) setMode(d.mode);
      if (typeof d.length === "number" && (LENGTHS as readonly number[]).includes(d.length)) setLength(d.length);
    };
    const onLoad = (e: Event) => { apply((e as CustomEvent<LoadPromptDetail>).detail); textarea.current?.focus({ preventScroll: true }); };
    window.addEventListener(LOAD_PROMPT_EVENT, onLoad);
    const q = new URLSearchParams(window.location.search);
    if (q.get("prompt")) {
      apply({ prompt: q.get("prompt") ?? "", mode: q.get("mode") as SceneMode, length: Number(q.get("length")) });
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
    return () => window.removeEventListener(LOAD_PROMPT_EVENT, onLoad);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (prompt.trim().length < 8) { setError("Describe the scene in a few more words."); textarea.current?.focus(); return; }
    if (!passcode) {
      if (options.current) options.current.open = true;
      setError("Enter the passcode in Options to send a request.");
      passcodeInput.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const { jobId } = await createScene({ prompt, mode, length: length as 5 | 10 | 15 }, passcode);
      passcodeMemo.set(passcode);
      router.push(`/request/${jobId}`);
    } catch (err) {
      setError(err instanceof CineversApiError && err.status === 429 && err.retryAfter ? `${err.message} (about ${Math.ceil(err.retryAfter / 60)} min)` : err instanceof Error ? err.message : "The request failed.");
      setBusy(false);
    }
  }

  return (
    <div id="create" className="mx-auto w-full max-w-[720px] scroll-mt-24">
      <form onSubmit={submit} className="rounded-[28px] border border-white/10 bg-black/35 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-4">
        <div className="relative">
          <label htmlFor="prompt" className="sr-only">Describe your scene</label>
          {showCaret && <span aria-hidden className="ss-caret pointer-events-none absolute left-5 top-[22px] h-6 w-0.5 bg-white" />}
          <textarea
            id="prompt" name="prompt" ref={textarea} value={prompt} onChange={(e) => setPrompt(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxLength={MAX} rows={3}
            placeholder="a herd of woolly mammoths walks slowly toward you through a snowy valley at sunset"
            className={cn("block w-full resize-none rounded-2xl bg-transparent px-5 py-5 text-lg leading-relaxed text-white caret-white placeholder:text-white/70 focus:outline-none sm:text-xl", showCaret && "indent-3")}
          />
        </div>

        <div className="flex flex-col gap-3 px-2 pb-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <fieldset className="min-w-0">
            <legend className="sr-only">Camera</legend>
            <div className="inline-flex rounded-full border border-white/10 p-1">
              {MODES.map((m) => (
                <label key={m.id} className={cn("cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal", mode === m.id ? "bg-white font-medium text-ink" : "text-white/85 hover:text-white")}>
                  <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                  {m.name}{m.exp && <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">Exp</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">{busy ? "Sending…" : "Generate"} {!busy && <ArrowRight className="size-4" aria-hidden />}</Button>
        </div>

        <p className="px-4 pb-1 pt-3 text-sm text-white/80" aria-live="polite">{current.note}</p>
        {error && <p role="alert" className="mx-2 mt-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white">{error}</p>}

        <details ref={options} className="group mt-1 border-t border-white/10 px-2 pt-2">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
            <span>Options <span className="text-white/70">· {length} s</span></span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-4 px-2 pb-3 pt-3 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-1.5 text-sm text-white/85">Length</legend>
              <div className="inline-flex rounded-full border border-white/10 p-1">
                {LENGTHS.map((n) => (
                  <label key={n} className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal", length === n ? "bg-white font-medium text-ink" : "text-white/85 hover:text-white")}>
                    <input type="radio" name="length" value={n} checked={length === n} onChange={() => setLength(n)} className="sr-only" />
                    {n} s
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="passcode" className="mb-1.5 block text-sm text-white/85">Passcode</label>
              <input id="passcode" name="passcode" ref={passcodeInput} type="password" autoComplete="off" value={passcode} onChange={(e) => setPasscode(e.target.value)}
                className="h-10 w-full rounded-full border border-white/10 bg-transparent px-4 text-sm text-white placeholder:text-white/60 focus:border-signal focus:outline-none focus-visible:outline-2 focus-visible:outline-signal" placeholder="Required" />
            </div>
          </div>
        </details>
        <p id="estimate" className="px-4 pb-2 pt-1 text-xs text-white/70">Free during preview · every request is reviewed</p>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {IDEAS.map((i) => (
          <button key={i} type="button" onClick={() => setPrompt(i)} className="rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-signal">{i}</button>
        ))}
      </div>
    </div>
  );
}
