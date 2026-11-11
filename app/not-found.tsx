import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-[60svh] w-[min(760px,calc(100%-2rem))] flex-col justify-center py-20">
        <p className="text-sm text-white/70">404</p>
        <h1 className="mt-2 font-serif text-6xl leading-[1.02] tracking-[-0.03em] sm:text-7xl">Nothing here.</h1>
        <p className="mt-5 max-w-md text-lg text-white/85">This page does not exist, or the scene has not been published.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/gallery" className={buttonClass({ size: "lg" })}>Browse the gallery</Link>
          <Link href="/" className={buttonClass({ variant: "outline", size: "lg" }, "text-white")}>Home</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
