#!/usr/bin/env bash
# Create a storyboard-video project from the template.
# Usage: new-project.sh <project-dir>
set -euo pipefail
DIR="${1:?Usage: new-project.sh <project-dir>}"
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
[ -e "$DIR/package.json" ] && { echo "Error: $DIR already has a package.json" >&2; exit 1; }
mkdir -p "$DIR"
cp -R "$SKILL/template/." "$DIR/"
cd "$DIR"
npm ci --no-audit --no-fund --loglevel=error
echo "Project ready: $DIR"
echo "Next: put images in $DIR/public/, write a storyboard JSON, then run add-storyboard.py"
