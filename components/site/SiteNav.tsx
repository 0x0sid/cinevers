import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { SITE_NAME } from "./data";

/** top bar. `overlay` sits on top of the hero video; otherwise it is a plain Ink bar. */
export function SiteNav({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-20" : "relative z-20 border-b border-white/10 bg-ink"}>
      <div className="mx-auto flex w-[min(1200px,calc(100%-2rem))] items-center justify-between py-4 sm:py-5">
        <Link href="/" className="font-serif text-[26px] leading-none tracking-tight text-white">{SITE_NAME}</Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm text-white/85">
          <Link href="/gallery" className="rounded-full px-4 py-2 transition-colors hover:text-white">Gallery</Link>
          <Link href="/#faq" className="hidden rounded-full px-4 py-2 transition-colors hover:text-white sm:block">FAQ</Link>
          <Link href="/#create" className={buttonClass({ variant: "outline" }, "ml-1 text-white sm:ml-2")}>Create a scene</Link>
        </nav>
      </div>
    </header>
  );
}
