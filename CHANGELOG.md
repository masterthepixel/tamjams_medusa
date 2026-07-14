# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Added dynamic XML `sitemap.ts` and `robots.ts` for complete search engine crawling.
- Added Open Graph metadata and canonical URLs to both individual product pages and the interactive shop configurator pages.
- Integrated the `RelatedProducts` component at the bottom of the shop configurator page (`/shop/[config]`) for cross-selling flavors.
- Added San Francisco (SF Pro) font files to ensure flawless typography rendering on all devices (Windows, Android, Linux).
- Configured Next.js local fonts (`next/font/local`) in the root layout with `display: swap` for optimal loading and zero layout shift.

### Changed
- Upgraded the presentation of the "About this flavor" section (Ingredients, Net weight, Storage) to use premium card UI elements with hover micro-animations.
- Updated the global `Thumbnail` component aspect ratio to `aspect-square` (1:1) instead of the default Medusa tall portrait ratio (`9/16`), better suiting the product jars.
- Updated Tailwind CSS `fontFamily.sans` to use the new local font variable (`var(--font-sf)`) as the primary font, replacing `Inter`.

### Fixed
- Fixed the `RelatedProducts` component logic to intelligently fetch and filter for actual jam flavors, replacing the default placeholder tag/collection logic.
