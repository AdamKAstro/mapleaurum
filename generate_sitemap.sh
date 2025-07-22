#!/bin/bash

# Base URL
BASE_URL="https://mapleaurum.com"

# Output sitemap file
OUTPUT_FILE="public/sitemap.xml"

# Current date for lastmod
CURRENT_DATE=$(date -u +"%Y-%m-%d")

# Static routes to include (excluding private, auth, admin, and 404 routes)
STATIC_ROUTES=(
  "/" "/companies" "/filter" "/scoring-advanced" "/scatter-chart"
  "/scatter-score-pro" "/subscribe" "/hook" "/hook-filtered"
  "/help" "/help/metrics" "/help/filters" "/help/scoring"
  "/help/scatter-chart" "/help/scatter-score-pro" "/help/tiers" "/help/general"
)

# Start sitemap
echo '<?xml version="1.0" encoding="UTF-8"?>' > $OUTPUT_FILE
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> $OUTPUT_FILE

# Add static routes to sitemap
for route in "${STATIC_ROUTES[@]}"; do
  # Set priority and changefreq based on route
  if [ "$route" == "/" ]; then
    PRIORITY="1.0"
    CHANGEFREQ="weekly"
  elif [[ "$route" == "/help"* ]]; then
    PRIORITY="0.6"
    CHANGEFREQ="monthly"
  else
    PRIORITY="0.8"
    CHANGEFREQ="weekly"
  fi

  echo "  <url>" >> $OUTPUT_FILE
  echo "    <loc>${BASE_URL}${route}</loc>" >> $OUTPUT_FILE
  echo "    <lastmod>${CURRENT_DATE}</lastmod>" >> $OUTPUT_FILE
  echo "    <changefreq>${CHANGEFREQ}</changefreq>" >> $OUTPUT_FILE
  echo "    <priority>${PRIORITY}</priority>" >> $OUTPUT_FILE
  echo "  </url>" >> $OUTPUT_FILE
done

# Add representative company URLs from company_urls.txt
if [ -f "company_urls.txt" ]; then
  while IFS= read -r url; do
    echo "  <url>" >> $OUTPUT_FILE
    echo "    <loc>${url}</loc>" >> $OUTPUT_FILE
    echo "    <lastmod>${CURRENT_DATE}</lastmod>" >> $OUTPUT_FILE
    echo "    <changefreq>weekly</changefreq>" >> $OUTPUT_FILE
    echo "    <priority>0.7</priority>" >> $OUTPUT_FILE
    echo "  </url>" >> $OUTPUT_FILE
  done < company_urls.txt
fi

# Close sitemap
echo '</urlset>' >> $OUTPUT_FILE

echo "Sitemap generated at $OUTPUT_FILE"