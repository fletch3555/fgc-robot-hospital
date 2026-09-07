# FGC Robot Hospital Scripts

This directory contains essential scripts for maintaining the FGC Kit of Parts inventory system.

## Available Scripts

### `import-fgc-inventory.js`
**Purpose:** Core database import functionality for FGC inventory data
- Imports CSV data into PostgreSQL database
- Creates and populates inventory tables
- Essential for database initialization and updates

### `focused-image-search.js`
**Purpose:** Advanced image collection tool for REV Robotics products
- Searches REV Robotics website for product images
- Uses specialized collection page targeting
- Updates CSV with discovered image URLs
- Useful for future inventory updates or missing images

## Usage

```bash
# Import inventory data to database
node scripts/import-fgc-inventory.js

# Search for missing product images
node scripts/focused-image-search.js
```

## Project Status

The FGC Robot Hospital inventory system is complete with:
- ✅ 153 total parts catalogued
- ✅ 143 parts with images (93.5% coverage)
- ✅ 0 CDN dependencies (100% local assets)
- ✅ 133 Next.js optimized image paths
- ✅ Visual BOM 2025 integration complete

All one-time migration and cleanup scripts have been removed as they are no longer needed.