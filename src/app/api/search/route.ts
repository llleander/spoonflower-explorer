import { NextRequest, NextResponse } from "next/server";

export interface DesignItem {
  id: string;
  name: string;
  imageUrl: string;
  artistName: string;
  artistUrl: string;
  artistAvatarUrl?: string;
  favorites?: number;
  orders?: number;
  designUrl: string;
  tags?: string[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const substrate = searchParams.get("substrate") || "fabric";
  const sort = searchParams.get("sort") || "bestSelling";
  const page = searchParams.get("page") || "1";

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  try {
    const pageSize = 48;
    const pageOffset = (parseInt(page, 10) - 1) * pageSize;

    const fabricMap: Record<string, string> = {
      fabric: "petal_signature_cotton",
      wallpaper: "wallpaper_peel_and_stick",
      "home-decor": "curtains",
    };
    const fabric = fabricMap[substrate] || "petal_signature_cotton";

    const productMap: Record<string, string> = {
      fabric: "Fabric",
      wallpaper: "Wallpaper",
      "home-decor": "HomeDecor",
    };
    const product = productMap[substrate] || "Fabric";

    const sortMap: Record<string, string> = {
      bestSelling: "bestSelling",
      bestMatch: "bestMatch",
      newest: "newest",
      mostFavorited: "mostFavorited",
    };
    const sortValue = sortMap[sort] || "bestSelling";

    const params = new URLSearchParams({
      terms: query,
      sort: sortValue,
      lang: "en",
      page_size: String(pageSize),
      page_offset: String(pageOffset),
      autoApply: "true",
      autoApplyMatureContent: "true",
      showMatureContent: "false",
      winnersOnly: "false",
      product,
      fabric,
      page_locale: "en",
    });

    const apiUrl = `https://pythias.spoonflower.com/search/v3/designs?${params}`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Spoonflower API returned status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const designs: DesignItem[] = (data.page_results || []).map(
      (item: Record<string, unknown>, i: number) => {
        const designId = String(item.designId || `design-${i}`);
        const name = String(item.name || "");
        const screenName = String(
          (item.user as Record<string, unknown>)?.screenName || ""
        );
        const thumbnail = String(item.thumbnail || "");
        const numFavorites = Number(item.numFavorites || 0);
        const orders = Number(item.orders || 0);
        const tags = (item.tags as string[]) || [];

        // Build image URL from thumbnail path
        let imageUrl = "";
        if (thumbnail) {
          if (thumbnail.startsWith("//") || thumbnail.startsWith("http")) {
            imageUrl = thumbnail.startsWith("//")
              ? `https:${thumbnail}`
              : thumbnail;
          } else if (thumbnail.startsWith("/")) {
            imageUrl = `https://img.spoonflower.com${thumbnail}`;
          } else {
            imageUrl = `https://img.spoonflower.com/${thumbnail}`;
          }
        }

        return {
          id: designId,
          name,
          imageUrl,
          artistName: screenName,
          artistUrl: `https://www.spoonflower.com/en/profile/${screenName}`,
          favorites: numFavorites,
          orders,
          designUrl: `https://www.spoonflower.com/en/shop/${designId}/product/${product.toLowerCase()}?fabric=${fabric}`,
          tags,
        };
      }
    );

    const total = data.query_hit_count || designs.length;

    return NextResponse.json({
      query,
      designs,
      total,
      page: parseInt(page, 10),
      hasMore: pageOffset + pageSize < total,
    });
  } catch (error) {
    console.error("Spoonflower API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Spoonflower" },
      { status: 500 }
    );
  }
}