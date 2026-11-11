import { GalleryBrowser } from "@/components/site/GalleryBrowser";
import { HeroVideo } from "@/components/site/HeroVideo";
import { PromptBox } from "@/components/site/PromptBox";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { HONEST_LINE } from "@/components/site/data";
import { buttonClass } from "@/components/ui/button";

const FAQ = [
  { q: "What exactly am I looking at?", a: HONEST_LINE },
  { q: "Do I need a VR headset?", a: "No. Drag to look around on any screen, or turn your phone. In a headset browser such as the Quest's you can press Enter VR. Headset support is still being tested." },
  { q: "What does it cost?", a: "Nothing during the preview. Every request is reviewed before anything is generated, so please be patient." },
  { q: "How long does a scene take?", a: "A few minutes once it is approved. Because every request is reviewed first, it can wait a little longer." },
  { q: "Can the scene move?", a: "Yes: people, animals and weather can move. Choose Static to keep the camera still, Ride to rise smoothly, or Glide (experimental) to drift forward." },
];

export default function Home() {
  return (
    <>
      <section id="top" className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden bg-ink">
        <HeroVideo />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/40" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
        <SiteNav overlay />
        <div className="relative z-10 mx-auto w-[min(1200px,calc(100%-2rem))] pb-20 pt-32 text-center">
          <h1 className="ss-rise mx-auto max-w-4xl text-balance font-serif text-[clamp(3rem,8vw,6.5rem)] leading-[0.98] tracking-[-0.03em] text-white">Step into your own movie.</h1>
          <p className="ss-rise mx-auto mb-10 mt-6 max-w-xl text-lg leading-relaxed text-white/85 [animation-delay:120ms] sm:text-xl">Describe a scene. Then stand inside it.</p>
          <div className="ss-rise [animation-delay:240ms]"><PromptBox /></div>
        </div>
      </section>

      <main className="bg-paper text-ink">
        <section id="gallery" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-24 sm:py-32">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif text-5xl leading-[1.02] tracking-[-0.025em] sm:text-6xl">Create your own immersion.</h2>
            <a href="/gallery" className={buttonClass({ variant: "outlineLight" }, "self-start sm:self-auto")}>See all scenes</a>
          </div>
          <GalleryBrowser limit={6} />
        </section>

        <section id="faq" className="mx-auto w-[min(820px,calc(100%-2rem))] scroll-mt-8 pb-28">
          <h2 className="mb-8 font-serif text-4xl tracking-[-0.025em] sm:text-5xl">Questions</h2>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
                  {f.q}<span aria-hidden className="text-2xl leading-none text-paper-mute transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-prose leading-relaxed text-paper-mute">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
