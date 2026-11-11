import type { MetadataRoute } from "next";
import { SITE_URL } from "@/components/site/data";
import { listScenes } from "@/lib/cinevers";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const scenes = await listScenes().catch(() => []);
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "daily", priority: 0.8 },
    ...scenes.map((s) => ({ url: `${SITE_URL}/s/${s.id}`, lastModified: s.createdAt, priority: 0.6 })),
  ];
}
