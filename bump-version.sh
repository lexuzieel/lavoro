#!/bin/bash

# Script to bump version and optionally add a custom commit message
# Usage:
#   ./bump-version.sh patch
#   ./bump-version.sh minor
#   ./bump-version.sh major
#   ./bump-version.sh patch "Custom commit message"

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <patch|minor|major> [message]"
  exit 1
fi

VERSION_TYPE=$1
CUSTOM_MESSAGE=$2

if [ -n "$CUSTOM_MESSAGE" ]; then
  npm version "$VERSION_TYPE" -m "$CUSTOM_MESSAGE"
else
  npm version "$VERSION_TYPE"
fi

echo ""
echo "✅ Version bumped successfully!"
echo "🏷️  Git tag created and pushed"
echo "🚀 GitHub Actions will automatically publish to npm"

