#!/usr/bin/env bash
# Delete old GitHub releases and tags (keep the latest v* tag only).
# Optionally replace git history with a single commit on the current branch and
# move the kept tag to that commit (force-push required).
#
# Requires: git. GitHub CLI (`gh`) is optional: without it, tags are still cleaned via git;
# delete stale Releases yourself at github.com/<org>/<repo>/releases or install gh:
#   macOS: brew install gh && gh auth login
#
# Usage:
#   ./maintainers/purge-github-artifacts.sh --dry-run              # print plan only
#   ./maintainers/purge-github-artifacts.sh --yes                  # remote + local tags; keep latest v*
#   ./maintainers/purge-github-artifacts.sh --yes --squash-history # also orphan-reset branch, retag latest
#
# After --squash-history, push:
#   git push origin "$(git branch --show-current)" --force
#   git push origin "$(git tag -l 'v*' --sort=-version:refname | head -n1)" --force

set -euo pipefail

DRY_RUN=0
SQUASH=0
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
  --dry-run) DRY_RUN=1 ;;
  --squash-history) SQUASH=1 ;;
  --yes) YES=1 ;;
  -h | --help)
    grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    exit 1
    ;;
  esac
  shift
done

if [[ $DRY_RUN -eq 0 && $YES -eq 0 ]]; then
  echo "Refusing to run without --yes or --dry-run. Read the header in this script first." >&2
  exit 1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

need_cmd git

have_gh=0
if command -v gh >/dev/null 2>&1; then
  if [[ $DRY_RUN -eq 0 ]] && gh auth status >/dev/null 2>&1; then
    have_gh=1
  elif [[ $DRY_RUN -eq 1 ]]; then
    if gh auth status >/dev/null 2>&1; then
      have_gh=1
    fi
  fi
fi

cd "$(git rev-parse --show-toplevel)"

git fetch --tags origin 2>/dev/null || true

# Latest semantic tag among v*
LATEST="$(git tag -l 'v*' --sort=-version:refname | head -n1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "No local tags matching 'v*'. Fetch tags or create a release tag first." >&2
  exit 1
fi

echo "Keeping tag: $LATEST"

delete_remote_tag_if_not_latest() {
  local rt="$1"
  if [[ -z "$rt" || "$rt" == "$LATEST" ]]; then
    return 0
  fi
  echo "Delete remote tag $rt"
  if [[ $DRY_RUN -eq 0 ]]; then
    git push origin ":refs/tags/$rt" 2>/dev/null || true
  fi
}

if [[ $SQUASH -eq 1 ]]; then
  BR="$(git branch --show-current)"
  if [[ -z "$BR" ]]; then
    echo "Detached HEAD: checkout a branch (e.g. main) first." >&2
    exit 1
  fi
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "[dry-run] Would: backup branch, orphan-reset $BR to one commit, recreate annotated tag $LATEST"
  else
    BAK="backup/pre-squash-$(date +%Y%m%d%H%M%S)"
    git branch "$BAK" HEAD
    echo "Created safety branch: $BAK"
    TMP_BRANCH="__purge_orphan__$$"
    git checkout --orphan "$TMP_BRANCH"
    git add -A
    git commit -m "Initial commit"
    git branch -D "$BR"
    git branch -m "$BR"
    git tag -d "$LATEST" 2>/dev/null || true
    git tag -a "$LATEST" -m "Release $LATEST"
    echo "Squashed to one commit on '$BR' and retagged $LATEST"
  fi
fi

# Local tags: drop every v* except LATEST
while IFS= read -r t; do
  [[ -z "$t" || "$t" == "$LATEST" ]] && continue
  echo "Delete local tag $t"
  if [[ $DRY_RUN -eq 0 ]]; then
    git tag -d "$t"
  fi
done < <(git tag -l 'v*' --sort=-version:refname)

# GitHub releases first: deletes the release and its tag (--cleanup-tag)
if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] Would delete GitHub releases whose tag is not $LATEST"
else
  RELEASE_TAGS="$(gh release list --json tagName -q '.[].tagName' 2>/dev/null || true)"
  while IFS= read -r rel; do
    [[ -z "$rel" || "$rel" == "$LATEST" ]] && continue
    echo "Delete GitHub release (and tag if present): $rel"
    gh release delete "$rel" --yes --cleanup-tag 2>/dev/null || gh release delete "$rel" --yes
  done <<<"$RELEASE_TAGS"
fi

# Remote tags: remove anything still not LATEST (tags without a release, etc.)
if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] Would delete remote tags except $LATEST (see: git ls-remote --tags origin)"
else
  git ls-remote --tags origin 2>/dev/null |
    awk '{print $2}' |
    sed 's|refs/tags/||' |
    grep -v '\^{}$' |
    sort -u |
    while IFS= read -r rt; do
      delete_remote_tag_if_not_latest "$rt"
    done || true
fi

echo ""
echo "Done. Latest tag kept: $LATEST"
if [[ $SQUASH -eq 1 && $DRY_RUN -eq 0 ]]; then
  echo ""
  echo "Push rewritten history and tag:"
  echo "  git push origin $(git branch --show-current) --force"
  echo "  git push origin $LATEST --force"
  echo "All clones and forks must reset to the new history (or re-fork)."
fi
