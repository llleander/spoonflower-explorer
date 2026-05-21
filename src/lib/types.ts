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

export interface SearchResult {
  query: string;
  designs: DesignItem[];
  total: number;
  page: number;
  hasMore: boolean;
}

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