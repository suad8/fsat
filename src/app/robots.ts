import type { MetadataRoute } from "next";

import { siteUrl } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // صفحات شخصية أو إدارية لا قيمة لفهرستها
        disallow: ["/admin", "/admin/", "/api/", "/cart", "/checkout"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
