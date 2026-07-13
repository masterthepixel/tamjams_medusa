# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Added San Francisco (SF Pro) font files to ensure flawless typography rendering on all devices (Windows, Android, Linux).
- Configured Next.js local fonts (`next/font/local`) in the root layout with `display: swap` for optimal loading and zero layout shift.

### Changed
- Updated Tailwind CSS `fontFamily.sans` to use the new local font variable (`var(--font-sf)`) as the primary font, replacing `Inter`.
