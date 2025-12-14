#!/bin/bash

# Usage: ./version.sh [patch|minor|major] ["optional summary"]
# Creates a changeset and bumps version

set -e

BUMP_TYPE=${1:-}
SUMMARY=${2:-}

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid bump type. Use 'patch', 'minor', or 'major'"
  exit 1
fi

# Prompt for summary if not provided
if [[ -z "$SUMMARY" ]]; then
  echo "Enter a summary of changes (press Enter for default):"
  read -r SUMMARY

  if [[ -z "$SUMMARY" ]]; then
    SUMMARY="Release $BUMP_TYPE version"
  fi
fi

echo "Creating $BUMP_TYPE changeset..."

# Create changeset non-interactively
cat > ".changeset/release-$(date +%s).md" <<EOF
---
"@lavoro/core": $BUMP_TYPE
"@lavoro/memory": $BUMP_TYPE
"@lavoro/postgres": $BUMP_TYPE
---

$SUMMARY
EOF

echo "Bumping versions..."
npx changeset version

echo ""
echo "✅ Versions bumped! Review the changes and run ./release.sh to publish"
