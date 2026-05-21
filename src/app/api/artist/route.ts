import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface ArtistProfile {
  name: string;
  bio: string;
  avatarUrl: string;
  location: string;
  totalDesigns: number;
  profileUrl: string;
  recentDesigns: {
    name: string;
    imageUrl: string;
    designUrl: string;
  }[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artistName = searchParams.get("name") || "";

  if (!artistName) {
    return NextResponse.json(
      { error: "Artist name is required" },
      { status: 400 }
    );
  }

  try {
    const url = `https://www.spoonflower.com/en/profile/${encodeURIComponent(artistName)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Artist profile returned status ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Avatar: look for profile-specific data-testid or image patterns
    const avatarUrl =
      $("img[data-testid*='avatar'], img[data-testid*='profileImage']").first().attr("src") ||
      $("[class*='ProfileHero'] img, [class*='ProfileImage'] img, [class*='Avatar'] img").first().attr("src") ||
      $("img[src*='avatar'], img[src*='profile']").first().attr("src") ||
      "";

    // Bio
    const bio =
      $("[data-testid*='bio'], [class*='ProfileBio'], [class*='bio'], [class*='about']").first().text().trim();

    // Location
    const location =
      $("[data-testid*='location'], [class*='ProfileLocation'], [class*='location']").first().text().trim();

    // Total designs
    const totalDesignsText =
      $("[data-testid*='designCount'], [class*='designCount'], [class*='DesignCount']").first().text().trim();
    const totalDesigns = parseInt(totalDesignsText.replace(/[^\d]/g, ""), 10) || 0;

    // Recent designs: use data-testid selectors first, then CSS module fallback
    const recentDesigns: ArtistProfile["recentDesigns"] = [];

    $('[data-testid="productCard-image"]').each((_i, el) => {
      if (_i >= 12) return false;
      const $img = $(el);
      const imageUrl = $img.attr("src") || $img.attr("data-src") || "";
      const $card = $img.closest('[class*="ProductCard"]');
      const $titleLink = $card.find('[data-testid="productCard-title"]');
      const $imageLink = $img.closest('[data-testid="productCard-image-link"]');

      const name = $titleLink.text().trim() || $img.attr("alt") || "";
      const designUrl = $imageLink.attr("href") || $titleLink.attr("href") || "";

      if (imageUrl) {
        recentDesigns.push({
          name,
          imageUrl: normalizeUrl(imageUrl),
          designUrl: normalizeUrl(designUrl),
        });
      }
    });

    // Fallback: spoonflower CDN images
    if (recentDesigns.length === 0) {
      $("img[src*='img.spoonflower.com']").each((_i, el) => {
        if (_i >= 12) return false;
        const $img = $(el);
        const imageUrl = $img.attr("src") || "";
        const name = $img.attr("alt") || "";
        const designUrl = $img.closest("a").attr("href") || "";

        if (imageUrl) {
          recentDesigns.push({
            name,
            imageUrl: normalizeUrl(imageUrl),
            designUrl: normalizeUrl(designUrl),
          });
        }
      });
    }

    const profile: ArtistProfile = {
      name: artistName,
      bio,
      avatarUrl: normalizeUrl(avatarUrl),
      location,
      totalDesigns,
      profileUrl: url,
      recentDesigns,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Artist profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist profile" },
      { status: 500 }
    );
  }
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.spoonflower.com${url}`;
  return url;
}