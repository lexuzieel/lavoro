#!/bin/bash

set -e

cd packages

for package in */; do
  echo "Publishing $package..."
  cd "$package"
  npm publish
  cd ..
done

cd ..

echo ""
echo "✅ All packages published!"
