import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface DesignItem {
  id: string;
  name: string;
  imageUrl: string;
  artistName: string;
  artistUrl: string;
  artistAvatarUrl?: string;
  favorites?: number;
  designUrl: string;
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
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.spoonflower.com/en/shop?sort=${sort}&on=${substrate}&viewAs=product&fabric=petal_signature_cotton&q=${encodedQuery}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Spoonflower returned status ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const designs: DesignItem[] = [];

    // Primary: use data-testid selectors (Spoonflower uses CSS Modules with hashed names)
    $('[data-testid="productCard-image"]').each((_i, el) => {
      const $img = $(el);
      const imageUrl = $img.attr("src") || $img.attr("data-src") || "";
      if (!imageUrl) return;

      // Walk up to the card container
      const $card = $img.closest('[class*="ProductCard"]');
      const $imageLink = $img.closest('[data-testid="productCard-image-link"]');
      const $titleLink = $card.find('[data-testid="productCard-title"]');
      const $artistLink = $card.find('[data-testid="productCard-screenName"]');

      const name = $titleLink.text().trim() || $img.attr("alt") || extractNameFromImageUrl(imageUrl);
      const designUrl = $imageLink.attr("href") || $titleLink.attr("href") || "";
      const artistName = $artistLink.text().trim() || "";
      const artistHref = $artistLink.attr("href") || "";

      const id = extractDesignIdFromUrl(imageUrl) || extractDesignIdFromUrl(designUrl) || `design-${_i}`;

      designs.push({
        id,
        name,
        imageUrl: normalizeImageUrl(imageUrl),
        artistName,
        artistUrl: artistHref.startsWith("/")
          ? `https://www.spoonflower.com${artistHref}`
          : artistHref || `https://www.spoonflower.com/en/profile/${artistName}`,
        favorites: 0,
        designUrl: designUrl.startsWith("/")
          ? `https://www.spoonflower.com${designUrl}`
          : designUrl,
      });
    });

    // Fallback: images with spoonflower CDN src that weren't already captured
    if (designs.length === 0) {
      $("img[src*='img.spoonflower.com']").each((_i, el) => {
        const $img = $(el);
        const imageUrl = $img.attr("src") || $img.attr("data-src") || "";
        const alt = $img.attr("alt") || "";
        const parentLink = $img.closest("a");
        const designUrl = parentLink.attr("href") || "";

        // Try to find artist info near the image
        const $parent = $img.parent().parent().parent();
        const artistName = $parent.find("a[href*='/profile/']").first().text().trim();

        const name = alt || extractNameFromImageUrl(imageUrl);

        if (imageUrl) {
          designs.push({
            id: extractDesignIdFromUrl(imageUrl) || `img-${_i}`,
            name,
            imageUrl: normalizeImageUrl(imageUrl),
            artistName,
            artistUrl: artistName
              ? `https://www.spoonflower.com/en/profile/${artistName}`
              : "",
            favorites: 0,
            designUrl: designUrl.startsWith("/")
              ? `https://www.spoonflower.com${designUrl}`
              : "",
          });
        }
      });
    }

    // Parse total count from pagination or header
    const totalText = $(".pagination-info, .total-count, .result-count, [class*='Pagination']").first().text().trim();
    const totalMatch = totalText.match(/(\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : designs.length;

    return NextResponse.json({
      query,
      designs,
      total: total || designs.length,
      page: parseInt(page, 10),
      hasMore: designs.length >= 24,
    });
  } catch (error) {
    console.error("Spoonflower fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Spoonflower" },
      { status: 500 }
    );
  }
}

function extractDesignIdFromUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : "";
}

function extractNameFromImageUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/\/([^\/]+)\.(jpg|png|jpeg|webp)/);
  if (!match) return "";
  return match[1]
    .replace(/%20/g, " ")
    .replace(/_/g, " ")
    .replace(/\+/g, " ")
    .trim();
}

function normalizeImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.spoonflower.com${url}`;
  return url;
}