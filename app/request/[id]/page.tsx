import type { Metadata } from "next";
import JobStatus from "@/components/JobStatus";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export const metadata: Metadata = { title: "Your request", robots: { index: false, follow: false } };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-[min(760px,calc(100%-2rem))] pb-24 pt-14 sm:pt-20">
        <h1 className="font-serif text-5xl leading-[1.02] tracking-[-0.025em] sm:text-6xl">Your request</h1>
        <p className="mt-4 text-white/80">Keep this page open or bookmark it: it updates by itself.</p>
        <div className="mt-10"><JobStatus id={id} /></div>
      </main>
      <SiteFooter />
    </>
  );
}
