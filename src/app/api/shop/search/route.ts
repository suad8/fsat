import { NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPopularCategories, getSuggestions } from "@/lib/shop/suggest";

/** اقتراحات البحث السريع: GET /api/shop/search?q=كوب */
export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "shop-search"), {
    limit: 240,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { products: [], categories: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";

  try {
    if (q.length < 2) {
      return NextResponse.json({ products: [], categories: await getPopularCategories() });
    }
    return NextResponse.json(await getSuggestions(q));
  } catch (error) {
    console.error("[shop/search] فشل البحث:", error);
    return NextResponse.json({ products: [], categories: [] }, { status: 500 });
  }
}
