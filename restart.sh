#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       TokenMart — Local Restart      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Kill any existing Next.js dev server on port 3000
if lsof -ti:3000 &>/dev/null; then
  echo -e "${YELLOW}Killing existing process on port 3000...${NC}"
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Check for .env / .env.local
if [ ! -f .env ] && [ ! -f .env.local ]; then
  echo -e "${YELLOW}No .env or .env.local found. Copying from .env.example...${NC}"
  cp .env.example .env.local
  echo -e "${YELLOW}  -> Edit .env.local with your real keys before testing API routes.${NC}"
  echo ""
fi

# Install deps if node_modules missing or package.json changed
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ] 2>/dev/null; then
  echo -e "${CYAN}Installing dependencies...${NC}"
  npm install
  echo ""
fi

# Type check
echo -e "${CYAN}Running typecheck...${NC}"
if npx tsc --noEmit 2>&1; then
  echo -e "${GREEN}  Typecheck passed.${NC}"
else
  echo -e "${RED}  Typecheck failed. Fix errors above before continuing.${NC}"
  exit 1
fi
echo ""

# Clear Next.js cache
if [ -d .next ]; then
  echo -e "${YELLOW}Clearing .next cache...${NC}"
  rm -rf .next
fi

# Start dev server
echo ""
echo -e "${GREEN}Starting Next.js dev server on http://localhost:3000${NC}"
echo -e "${CYAN}  Press Ctrl+C to stop.${NC}"
echo ""
exec npm run dev
