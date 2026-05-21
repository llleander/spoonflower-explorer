# Spoonflower Explorer

Search and explore Spoonflower artists, designs, and patterns. Collect inspiration from indie makers worldwide.

## Features

- **Search**: Find designs by keyword, style, or theme
- **Filters**: Sort by Best Selling, Best Match, Newest, Most Favorited; filter by substrate (Fabric, Wallpaper, Home Decor)
- **Artist Profiles**: Click on an artist name to view their profile, bio, location, and recent designs
- **Save Designs**: Bookmark designs you like with the save button
- **Responsive**: Works on desktop and mobile

## Tech Stack

- Next.js 16 (React 19) + TypeScript
- Tailwind CSS 4
- Cheerio (server-side HTML parsing for Spoonflower data)
- Vercel deployment ready

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 with your browser.

## Project Structure

```
src/
  app/
    api/
      search/route.ts    — Search API (fetches & parses Spoonflower shop pages)
      artist/route.ts    — Artist profile API (fetches & parses artist profile pages)
    globals.css          — Custom dark theme styling
    layout.tsx           — Root layout with metadata
    page.tsx             — Main UI (search, grid, artist modal, saved designs)
  lib/
    types.ts             — Shared TypeScript types
```

## Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel will auto-detect Next.js and deploy

Or link to your existing Vercel account:

```bash
npx vercel
```

## API Endpoints

### `/api/search?q=flowers&sort=bestSelling&substrate=fabric&page=1`

Returns design search results from Spoonflower.

### `/api/artist?name=username`

Returns artist profile details from Spoonflower.