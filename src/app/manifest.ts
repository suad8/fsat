import type { MetadataRoute } from "next";

import { brand, palette } from "@/config/brand";

/** manifest.webmanifest — يتيح تثبيت الموقع على شاشة الجوال الرئيسية. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.nameShort,
    description: brand.description,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: palette.plum,
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
