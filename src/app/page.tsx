"use client";

import { useState, useCallback, useRef } from "react";
import type { DesignItem, ArtistProfile } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "bestSelling", label: "Best Selling" },
  { value: "bestMatch", label: "Best Match" },
  { value: "newest", label: "Newest" },
  { value: "mostFavorited", label: "Most Favorited" },
];

const SUBSTRATE_OPTIONS = [
  { value: "fabric", label: "Fabric" },
  { value: "wallpaper", label: "Wallpaper" },
  { value: "home-decor", label: "Home Decor" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("bestSelling");
  const [substrate, setSubstrate] = useState("fabric");
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(
    async (searchQuery: string, pageNum: number = 1) => {
      if (!searchQuery.trim()) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          sort,
          substrate,
          page: String(pageNum),
        });
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        if (pageNum === 1) {
          setDesigns(data.designs || []);
        } else {
          setDesigns((prev) => [...prev, ...(data.designs || [])]);
        }
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
        setPage(pageNum);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [sort, substrate]
  );

  const handleArtistClick = useCallback(async (artistName: string) => {
    if (!artistName) return;
    setSelectedArtist(artistName);
    setArtistLoading(true);
    try {
      const res = await fetch(`/api/artist?name=${encodeURIComponent(artistName)}`);
      const data = await res.json();
      if (data.error) {
        setArtistProfile(null);
      } else {
        setArtistProfile(data);
      }
    } catch {
      setArtistProfile(null);
    } finally {
      setArtistLoading(false);
    }
  }, []);

  const toggleSave = useCallback((designId: string) => {
    setSavedDesigns((prev) => {
      const next = new Set(prev);
      if (next.has(designId)) next.delete(designId);
      else next.add(designId);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch(query, 1);
      }
    },
    [query, handleSearch]
  );

  const savedList = designs.filter((d) => savedDesigns.has(d.id));

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-bg">
              SF
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Spoonflower Explorer
            </h1>
          </div>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2 max-w-xl">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search designs, patterns, artists..."
              className="flex-1 h-10 px-4 rounded-lg bg-card border border-border text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={() => handleSearch(query, 1)}
              disabled={loading || !query.trim()}
              className="h-10 px-5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                </span>
              ) : (
                "Search"
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 px-3 rounded-lg bg-card border border-border text-text-secondary text-sm focus:outline-none focus:border-accent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={substrate}
              onChange={(e) => setSubstrate(e.target.value)}
              className="h-10 px-3 rounded-lg bg-card border border-border text-text-secondary text-sm focus:outline-none focus:border-accent"
            >
              {SUBSTRATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Saved count */}
          {savedDesigns.size > 0 && (
            <button
              onClick={() => setSelectedArtist("__saved__")}
              className="h-10 px-3 rounded-lg bg-accent-muted border border-accent/30 text-accent text-sm font-medium hover:bg-accent/25 transition-colors shrink-0"
            >
              Saved ({savedDesigns.size})
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {designs.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-accent"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              Discover Spoonflower Artists
            </h2>
            <p className="text-text-secondary max-w-md">
              Search for patterns, themes, or styles to find designs from indie
              artists worldwide. Type a keyword and hit Search.
            </p>
            <div className="flex gap-2 mt-6">
              {["flowers", "geometric", "watercolor", "abstract", "cats", "tropical"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setQuery(tag);
                      handleSearch(tag, 1);
                    }}
                    className="px-3 py-1.5 rounded-full bg-card border border-border text-text-secondary text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Results info */}
        {designs.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-text-secondary">
              Showing {designs.length} of {total} results for &quot;{query}&quot;
            </p>
          </div>
        )}

        {/* Design grid */}
        {designs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {designs.map((design, i) => (
              <div
                key={design.id || i}
                className="design-card fade-in-up rounded-xl bg-card border border-border overflow-hidden group cursor-pointer"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-square img-placeholder overflow-hidden">
                  {design.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.imageUrl}
                      alt={design.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary/30 text-xs">
                      No image
                    </div>
                  )}
                  {/* Save button overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(design.id);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      savedDesigns.has(design.id)
                        ? "bg-accent text-bg"
                        : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={savedDesigns.has(design.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                  {/* Favorites badge */}
                  {design.favorites && design.favorites > 0 && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/40 text-white/80 text-xs flex items-center gap-1">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      {design.favorites}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="text-sm font-medium text-text truncate"
                    title={design.name}
                  >
                    {design.name || "Untitled Design"}
                  </p>
                  <button
                    onClick={() => handleArtistClick(design.artistName)}
                    className="text-xs text-accent hover:text-accent-hover mt-1 truncate transition-colors"
                    title={design.artistName}
                  >
                    {design.artistName || "Unknown Artist"}
                  </button>
                </div>

                {/* Link to Spoonflower */}
                {design.designUrl && (
                  <a
                    href={design.designUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 pb-2 text-xs text-text-secondary/50 hover:text-text-secondary transition-colors"
                  >
                    View on Spoonflower →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
            </div>
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && designs.length > 0 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => handleSearch(query, page + 1)}
              className="px-6 py-2 rounded-lg bg-card border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </main>

      {/* Artist modal */}
      {(selectedArtist && selectedArtist !== "__saved__") && (
        <ArtistModal
          artistName={selectedArtist}
          profile={artistProfile}
          loading={artistLoading}
          onClose={() => {
            setSelectedArtist(null);
            setArtistProfile(null);
          }}
        />
      )}

      {/* Saved designs modal */}
      {selectedArtist === "__saved__" && (
        <SavedModal
          designs={savedList}
          onClose={() => setSelectedArtist(null)}
          onRemove={toggleSave}
        />
      )}
    </div>
  );
}

function ArtistModal({
  artistName,
  profile,
  loading,
  onClose,
}: {
  artistName: string;
  profile: ArtistProfile | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{artistName}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text-secondary hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
              <div className="w-3 h-3 rounded-full bg-accent pulse-dot" />
            </div>
          </div>
        ) : profile ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={artistName}
                  className="w-16 h-16 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl font-bold">
                  {artistName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-text-secondary">
                  {profile.location || "Location unknown"}
                </p>
                <p className="text-sm text-accent">
                  {profile.totalDesigns} designs
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {profile.recentDesigns.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-text-secondary mb-2">
                  Recent Designs
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {profile.recentDesigns.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden border border-border"
                    >
                      {d.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.imageUrl}
                          alt={d.name}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-square img-placeholder" />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-center py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
            >
              View Full Profile on Spoonflower
            </a>
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-8">
            Could not load artist profile.
          </p>
        )}
      </div>
    </div>
  );
}

function SavedModal({
  designs,
  onClose,
  onRemove,
}: {
  designs: DesignItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Saved Designs ({designs.length})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text-secondary hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {designs.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No saved designs yet. Click the bookmark icon on any design to save it.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {designs.map((d) => (
              <div
                key={d.id}
                className="rounded-xl bg-card border border-border overflow-hidden"
              >
                <div className="relative aspect-square img-placeholder">
                  {d.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.imageUrl}
                      alt={d.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                  <button
                    onClick={() => onRemove(d.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-danger/80 text-white flex items-center justify-center hover:bg-danger transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{d.name}</p>
                  <p className="text-xs text-accent">{d.artistName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}