import { NextRequest, NextResponse } from "next/server";

export interface ArtistProfile {
  name: string;
  screenName: string;
  bio: string;
  avatarUrl: string;
  location: string;
  totalDesigns: number;
  profileUrl: string;
  recentDesigns: {
    id: string;
    name: string;
    imageUrl: string;
    designUrl: string;
    favorites: number;
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
    // Use Pythias API to fetch artist's designs
    const params = new URLSearchParams({
      sort: "bestSelling",
      lang: "en",
      page_size: "12",
      page_offset: "0",
      screenName: artistName,
      product: "Fabric",
      fabric: "petal_signature_cotton",
    });

    const apiUrl = `https://pythias.spoonflower.com/search/v3/designs?${params}`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `API returned status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const totalDesigns = data.query_hit_count || 0;
    const pageResults = data.page_results || [];

    // Extract artist info from the first design result
    const firstItem = pageResults[0] as Record<string, unknown> | undefined;
    const user = firstItem?.user as Record<string, unknown> | undefined;

    const firstName = String(user?.firstName || "");
    const lastName = String(user?.lastName || "");
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || artistName;

    const recentDesigns = pageResults.map(
      (item: Record<string, unknown>, i: number) => {
        const designId = String(item.designId || `design-${i}`);
        const name = String(item.name || "");
        const thumbnail = String(item.thumbnail || "");
        const numFavorites = Number(item.numFavorites || 0);

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
          designUrl: `https://www.spoonflower.com/en/shop/${designId}`,
          favorites: numFavorites,
        };
      }
    );

    const profile: ArtistProfile = {
      name: fullName,
      screenName: artistName,
      bio: "",
      avatarUrl: "",
      location: "",
      totalDesigns,
      profileUrl: `https://www.spoonflower.com/en/profile/${artistName}`,
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