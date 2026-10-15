#!/usr/bin/env bash
set -eo pipefail

echo "==========================================="
echo "   Kong Manager - Local CI Quality Gate   "
echo "==========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📂 Project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo ""
echo "▶️ [1/6] Formatting & Vetting Backend (Go)..."
cd "$ROOT_DIR/backend"
gofmt -w .
go vet ./...

echo ""
echo "▶️ [2/6] Running Backend Unit Tests (Go)..."
go test -v -cover ./...

echo ""
echo "▶️ [3/6] Testing Backend Build Compilation..."
CGO_ENABLED=0 go build -o /dev/null ./cmd/api

echo ""
echo "▶️ [4/6] Linting Frontend (ESLint & TypeScript)..."
cd "$ROOT_DIR/frontend"
npx tsc --noEmit
npm run lint

echo ""
echo "▶️ [5/6] Running Frontend Unit Tests (Vitest)..."
npm run test

echo ""
echo "▶️ [6/6] Testing Frontend Next.js Production Build..."
npm run build

echo ""
echo "==========================================="
echo "🎉 ALL LOCAL CI CHECKS PASSED SUCCESSFULLY!"
echo "==========================================="
