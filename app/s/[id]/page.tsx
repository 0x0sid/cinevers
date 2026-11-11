import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DomeViewer from "@/components/DomeViewer";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getScene } from "@/lib/cinevers";
import { toReady, type ReadyScene } from "@/lib/ready";

/** reads the scene through the typed client; unknown, malformed and unpublished ids all end in the 404 page */
const load = async (id: string): Promise<ReadyScene | null> => {
  try {
    return toReady(await getScene(id));
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await load((await params).id);
  if (!s) return { title: "Not found", robots: { index: false } };
  const description = s.prompt.length > 180 ? s.prompt.slice(0, 177) + "…" : s.prompt;
  return {
    title: s.title,
    description,
    alternates: { canonical: `/s/${s.id}` },
    openGraph: { type: "website", title: `${s.title} · Cinevers`, description, url: `/s/${s.id}`, images: [{ url: s.thumbnailUrl, width: 640, height: 480, alt: s.title }] },
    twitter: { card: "summary_large_image", title: `${s.title} · Cinevers`, description, images: [s.thumbnailUrl] },
  };
}

export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await load((await params).id);
  if (!s) notFound();
  return (
    <>
      <SiteNav />
      <main><DomeViewer scene={s} /></main>
      <SiteFooter />
    </>
  );
}
