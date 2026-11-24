#!/usr/bin/env bash
# Scaffold a Remotion project from this skill's templates.
# Usage: setup.sh <project-dir>
set -euo pipefail

PROJECT_DIR="${1:?Usage: setup.sh <project-dir>}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTION_VERSION="${REMOTION_VERSION:-4.0.539}"

if [ -e "$PROJECT_DIR/package.json" ]; then
  echo "Error: $PROJECT_DIR already has a package.json, refusing to overwrite." >&2
  exit 1
fi

mkdir -p "$PROJECT_DIR/src" "$PROJECT_DIR/public" "$PROJECT_DIR/out"
cp "$SKILL_DIR"/templates/*.tsx "$SKILL_DIR"/templates/index.ts "$PROJECT_DIR/src/"

cat > "$PROJECT_DIR/package.json" <<JSON
{
  "name": "$(basename "$PROJECT_DIR")",
  "private": true,
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts"
  },
  "dependencies": {
    "@remotion/cli": "$REMOTION_VERSION",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "remotion": "$REMOTION_VERSION"
  },
  "devDependencies": {
    "@types/react": "19.1.8",
    "typescript": "5.8.3"
  }
}
JSON

cat > "$PROJECT_DIR/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
JSON

printf 'node_modules/\nout/\n' > "$PROJECT_DIR/.gitignore"

cd "$PROJECT_DIR"
npm install --no-audit --no-fund
echo "Remotion project ready in $PROJECT_DIR"
