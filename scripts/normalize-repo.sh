#!/usr/bin/env bash
set -euo pipefail
find . -name ".DS_Store" -delete
find . -name "*.tsbuildinfo" -delete
pnpm cf:types
