import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabaseServer";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://krib.ng";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Include approved listings as public pages
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, updated_at")
    .eq("status", "approved");

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map(
    (listing) => ({
      url: `${baseUrl}/student/listings/${listing.id}`,
      lastModified: listing.updated_at
        ? new Date(listing.updated_at)
        : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  return [...staticRoutes, ...listingRoutes];
}
