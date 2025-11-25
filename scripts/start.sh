#!/bin/bash
# Start script for Moodboard App
# Usage: ./scripts/start.sh [dev|build|start]

set -e

cd "$(dirname "$0")/.."

MODE="${1:-dev}"

case "$MODE" in
  dev)
    echo "Starting development server..."
    npm run dev
    ;;
  build)
    echo "Building production bundle..."
    npm run build
    ;;
  start)
    echo "Starting production server..."
    npm run build && npm run start
    ;;
  *)
    echo "Usage: $0 [dev|build|start]"
    echo "  dev   - Start development server (default)"
    echo "  build - Build production bundle"
    echo "  start - Build and start production server"
    exit 1
    ;;
esac
