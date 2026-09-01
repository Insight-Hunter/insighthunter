#!/usr/bin/env bash
#
# scripts/sync-main-filetree.sh
#
# Synchronizes apps/insighthunter-main with the visual tree in:
# apps/insighthunter-main/FILETREE.md
#
# Safe behavior:
# - Never deletes a file unless it has been successfully moved to its exact
#   destination path.
# - Never overwrites a non-empty destination file.
# - Moves only when exactly one same-named source file is found elsewhere.
# - Creates an empty placeholder only when no matching existing file exists.
# - Does not touch FILETREE.md, .git, node_modules, dist, .astro, or backups.
#
# Usage:
#   ./scripts/sync-main-filetree.sh --dry-run
#   ./scripts/sync-main-filetree.sh
#

set -euo pipefail

DRY_RUN=false

case "${1:-}" in
  "")
    ;;
  --dry-run)
    DRY_RUN=true
    ;;
  *)
    echo "Usage: $0 [--dry-run]" >&2
    exit 64
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_ROOT="$REPO_ROOT/apps/insighthunter-main"
FILETREE="$APP_ROOT/FILETREE.md"

log() {
  printf '%s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

if [[ ! -d "$APP_ROOT" ]]; then
  echo "ERROR: Missing app folder: $APP_ROOT" >&2
  exit 66
fi

if [[ ! -f "$FILETREE" ]]; then
  echo "ERROR: Missing tree specification: $FILETREE" >&2
  exit 66
fi

log "Insight Hunter Main file-tree synchronization"
log "Repository: $REPO_ROOT"
log "App root: $APP_ROOT"
log "Specification: $FILETREE"
log "Mode: $([[ "$DRY_RUN" == true ]] && echo "dry-run" || echo "apply")"
log ""

TMP_MANIFEST="$(mktemp "${TMPDIR:-/tmp}/insighthunter-main-filetree.XXXXXX")"

cleanup() {
  rm -f "$TMP_MANIFEST"
}

trap cleanup EXIT

python3 - "$FILETREE" > "$TMP_MANIFEST" <<'PYTHON'
import re
import sys
from pathlib import Path

filetree_file = Path(sys.argv[1])
markdown = filetree_file.read_text(encoding="utf-8")

start = re.search(r"^```text\s*$", markdown, re.MULTILINE)

if not start:
    raise SystemExit("ERROR: No opening ```text code block found in FILETREE.md.")

remaining = markdown[start.end():]
end = re.search(r"^```\s*$", remaining, re.MULTILINE)

# Support an unfinished FILETREE.md code fence during editing.
tree_text = remaining[:end.start()] if end else remaining
lines = tree_text.splitlines()

root_index = None
root_indent = None

for index, raw_line in enumerate(lines):
    match = re.match(r"^(?P<prefix>(?:    |│   )*)[└├]──\s+insighthunter-main/\s*$", raw_line)

    if match:
        root_index = index
        root_indent = len(match.group("prefix"))
        break

if root_index is None:
    raise SystemExit(
        "ERROR: Could not find the `insighthunter-main/` root in FILETREE.md."
    )

stack = []
entries = []

for raw_line in lines[root_index + 1:]:
    line = raw_line.rstrip()

    if not line.strip():
        continue

    if line.startswith("```"):
        break

    match = re.match(
        r"^(?P<prefix>(?:    |│   )*)[└├]──\s+(?P<name>.+?)\s*$",
        line,
    )

    if not match:
        continue

    prefix = match.group("prefix")
    raw_name = match.group("name").strip()

    # Ignore prose accidentally included after an unclosed code fence.
    if raw_name.startswith(("#", ">", "|", "---", "```")):
        continue

    # Tree item names only. Allows dots, hyphens, braces, brackets, and slashes.
    if not re.fullmatch(r"[A-Za-z0-9._@{}\-\\[\\]/]+", raw_name):
        continue

    absolute_depth = len(prefix) // 4
    relative_depth = absolute_depth - (root_indent // 4) - 1

    if relative_depth < 0:
        continue

    is_directory = raw_name.endswith("/")
    name = raw_name.rstrip("/")

    if not name:
        continue

    while len(stack) > relative_depth:
        stack.pop()

    if len(stack) < relative_depth:
        continue

    relative_path = "/".join(stack + [name])

    # Keep the synchronizer from touching its own instructions.
    if relative_path != "FILETREE.md":
        entries.append(
            (relative_path, "dir" if is_directory else "file")
        )

    if is_directory:
        stack.append(name)

if not entries:
    raise SystemExit(
        "ERROR: Parsed zero paths below insighthunter-main/. "
        "Check the visual tree format in FILETREE.md."
    )

seen = set()

for relative_path, item_type in entries:
    item = (relative_path, item_type)

    if item not in seen:
        seen.add(item)
        print(f"{relative_path}\t{item_type}")
PYTHON

if [[ ! -s "$TMP_MANIFEST" ]]; then
  echo "ERROR: The parser generated no expected paths." >&2
  exit 65
fi

log "Parsed intended paths:"

while IFS=$'\t' read -r relative_path item_type; do
  [[ -z "$relative_path" ]] && continue
  log "  - $relative_path"
done < "$TMP_MANIFEST"

log ""
log "Synchronizing files..."

while IFS=$'\t' read -r relative_path item_type; do
  [[ -z "$relative_path" ]] && continue

  case "$relative_path" in
    FILETREE.md|\
    apps|apps/*|\
    insighthunter-main|insighthunter-main/*|\
    .git|.git/*|\
    node_modules|node_modules/*|\
    dist|dist/*|\
    .astro|.astro/*|\
    .filetree-manifest|.filetree-manifest/*|\
    .filetree-backups|.filetree-backups/*|\
    ../*|*/../*|/*)
      log "SKIP PROTECTED $relative_path"
      continue
      ;;
  esac

  target="$APP_ROOT/$relative_path"

  if [[ "$item_type" == "dir" ]]; then
    if [[ -d "$target" ]]; then
      log "KEEP DIR     $relative_path"
    else
      log "CREATE DIR   $relative_path"
      run mkdir -p "$target"
    fi

    continue
  fi

  target_dir="$(dirname "$target")"
  file_name="$(basename "$relative_path")"

  if [[ -f "$target" && -s "$target" ]]; then
    log "KEEP FILE    $relative_path"
    continue
  fi

  mapfile -t matches < <(
    find "$APP_ROOT" \
      -type f \
      -name "$file_name" \
      ! -path "$target" \
      ! -path "$FILETREE" \
      ! -path "$APP_ROOT/.git/*" \
      ! -path "$APP_ROOT/node_modules/*" \
      ! -path "$APP_ROOT/dist/*" \
      ! -path "$APP_ROOT/.astro/*" \
      ! -path "$APP_ROOT/.filetree-manifest/*" \
      ! -path "$APP_ROOT/.filetree-backups/*" \
      -print
  )

  if [[ "${#matches[@]}" -eq 1 ]]; then
    source_file="${matches}"
    source_relative="${source_file#"$APP_ROOT/"}"

    log "MOVE FILE    $source_relative"
    log "  ->         $relative_path"

    if [[ ! -d "$target_dir" ]]; then
      log "CREATE DIR   ${target_dir#"$APP_ROOT/"}"
      run mkdir -p "$target_dir"
    fi

    # `mv` only occurs when source is unique and destination is not a real file.
    # This removes the old file only after the target path succeeds.
    run mv "$source_file" "$target"
    continue
  fi

  if [[ "${#matches[@]}" -gt 1 ]]; then
    log "SKIP AMBIGUOUS $relative_path"
    log "  Found ${#matches[@]} matching files named $file_name"

    for source_file in "${matches[@]}"; do
      log "  - ${source_file#"$APP_ROOT/"}"
    done

    continue
  fi

  if [[ ! -d "$target_dir" ]]; then
    log "CREATE DIR   ${target_dir#"$APP_ROOT/"}"
    run mkdir -p "$target_dir"
  fi

  if [[ ! -e "$target" ]]; then
    log "CREATE FILE  $relative_path"
    run touch "$target"
  else
    log "KEEP FILE    $relative_path"
  fi
done < "$TMP_MANIFEST"

log ""
log "Complete."

if [[ "$DRY_RUN" == true ]]; then
  log "Dry run only: no files were created, copied, moved, or deleted."
else
  log "Missing files were created; uniquely matched misplaced files were moved."
  log "No existing destination file was overwritten."
fi
