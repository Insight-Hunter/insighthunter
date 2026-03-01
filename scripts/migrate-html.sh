#!/bin/bash
# Converts a raw .html file to a .astro stub
# Usage: ./scripts/migrate-html.sh public/dashboard.html
FILE=$1
DEST="${FILE%.html}.astro"
echo "---" > "$DEST"
echo "// TODO: migrated from $FILE" >> "$DEST"
echo "---" >> "$DEST"
cat "$FILE" >> "$DEST"
echo "Stub created: $DEST"
