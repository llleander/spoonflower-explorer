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

    const avatarUrl =
      $(".profile-avatar img, .avatar img, .user-image img").first().attr("src") ||
      $("img[src*='avatar'], img[src*='profile']").first().attr("src") ||
      "";

    const bio =
      $(".profile-bio, .bio, .description, .about").first().text().trim();

    const location =
      $(".profile-location, .location, .user-location").first().text().trim();

    const totalDesignsText =
      $(".design-count, .total-designs, [data-design-count]").first().text().trim();
    const totalDesigns = parseInt(totalDesignsText.replace(/[^\d]/g, ""), 10) || 0;

    const recentDesigns: ArtistProfile["recentDesigns"] = [];

    $(".design-card, .product-card, .grid-item, .user-designs .item").each(
      (_i, el) => {
        if (_i >= 12) return false;
        const $el = $(el);
        const name = $el.find(".design-name, .title, h3, h4").first().text().trim() || $el.find("a").first().attr("title") || "";
        const imageUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
        const designUrl = $el.find("a").first().attr("href") || "";

        if (imageUrl) {
          recentDesigns.push({
            name,
            imageUrl: imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl.startsWith("/") ? `https://www.spoonflower.com${imageUrl}` : imageUrl,
            designUrl: designUrl.startsWith("/") ? `https://www.spoonflower.com${designUrl}` : designUrl.startsWith("http") ? designUrl : "",
          });
        }
      }
    );

    const profile: ArtistProfile = {
      name: artistName,
      bio,
      avatarUrl: avatarUrl.startsWith("//") ? `https:${avatarUrl}` : avatarUrl.startsWith("/") ? `https://www.spoonflower.com${avatarUrl}` : avatarUrl,
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