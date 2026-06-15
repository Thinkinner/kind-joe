// app/robots.ts
import { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site/public-site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ads.txt"],
        disallow: [
          "/admin",
          "/api/",
          "/kindjoe/newsletter/preview/",
          "/newsletter/preview/",
        ],
      },
    ],
    sitemap: publicSiteUrl("/sitemap.xml"),
  };
}
