#!/bin/bash
# Generic deploy helper. NOT intended to be called directly from a workflow.
# Always invoke through one of the dedicated wrappers:
#
#   script/deploy-dev.sh   -> adamwinchestersyd-web/seent-dev
#   script/deploy-prod.sh  -> adamwinchestersyd-web/seent-calendar-backend
#
# Each wrapper hard-codes its target repo so dev code can never accidentally
# be pushed to the production repo (or vice versa).

set -e

REPO_SLUG="${1:?Usage: deploy-github.sh <github-org/repo> [branch]}"
BRANCH="${2:-main}"
SOURCE_DIR="/home/runner/workspace"
REPO_URL="https://${GITHUB_PAT}@github.com/${REPO_SLUG}.git"

# Allow-list: only these two repos may receive a push from this helper.
case "$REPO_SLUG" in
  adamwinchestersyd-web/seent-dev|adamwinchestersyd-web/seent-calendar-backend)
    ;;
  *)
    echo "Error: '$REPO_SLUG' is not an allowed deploy target." >&2
    echo "       Allowed targets:" >&2
    echo "         - adamwinchestersyd-web/seent-dev" >&2
    echo "         - adamwinchestersyd-web/seent-calendar-backend" >&2
    exit 1
    ;;
esac

# Per-repo working directory so two deploys can run at the same time
# without colliding on a shared /tmp path. Slashes in the repo slug
# become double-underscores so the path is filesystem-safe.
SAFE_SLUG="${REPO_SLUG//\//__}"
DEPLOY_DIR="/tmp/github-deploy-${SAFE_SLUG}"

if [ -z "$GITHUB_PAT" ]; then
  echo "Error: GITHUB_PAT secret is not set."
  exit 1
fi

echo "=== Deploying to GitHub ==="
echo "Repo:    https://github.com/${REPO_SLUG}"
echo "Branch:  $BRANCH"
echo "Workdir: $DEPLOY_DIR"
echo ""

rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

git config --global user.email "deploy-bot@adamwinchester.com"
git config --global user.name "Deploy Bot"

if git ls-remote "$REPO_URL" &>/dev/null; then
  echo "[1/5] Cloning existing repo..."
  rm -rf "$DEPLOY_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR" 2>/dev/null || \
    git clone "$REPO_URL" "$DEPLOY_DIR"
else
  echo "[1/5] Initializing new repo..."
  cd "$DEPLOY_DIR"
  git init
  git remote add origin "$REPO_URL"
  git checkout -b "$BRANCH"
  cd "$SOURCE_DIR"
fi

# Safety guard: the cloned working tree must point at the expected remote.
cd "$DEPLOY_DIR"
ACTUAL_REMOTE="$(git config --get remote.origin.url || true)"
EXPECTED_REMOTE="https://github.com/${REPO_SLUG}.git"
# Strip the embedded PAT before comparing.
ACTUAL_REMOTE_NO_PAT="$(echo "$ACTUAL_REMOTE" | sed -E 's#https://[^@]*@#https://#')"
if [ "$ACTUAL_REMOTE_NO_PAT" != "$EXPECTED_REMOTE" ]; then
  echo "Error: clone remote ($ACTUAL_REMOTE_NO_PAT) does not match" >&2
  echo "       expected ($EXPECTED_REMOTE). Aborting before push." >&2
  exit 1
fi
cd "$SOURCE_DIR"

echo "[2/5] Syncing files..."

find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

cd "$SOURCE_DIR"
for item in *; do
  case "$item" in
    node_modules|dist|dist-v2|.cache|.local|.config|.upm|attached_assets|generated-icon.png|.replit|replit.nix|replit.md|.DS_Store)
      continue
      ;;
    *)
      cp -r "$item" "$DEPLOY_DIR/"
      ;;
  esac
done

for item in .[!.]*; do
  case "$item" in
    .git|.cache|.local|.config|.upm|.replit|.DS_Store)
      continue
      ;;
    *)
      cp -r "$item" "$DEPLOY_DIR/"
      ;;
  esac
done

rm -f "$DEPLOY_DIR/data/cases.json"

echo "[3/5] Staging changes..."
cd "$DEPLOY_DIR"
git add -A

if git diff --cached --quiet; then
  echo "No changes to deploy."
  rm -rf "$DEPLOY_DIR"
  exit 0
fi

echo "[4/5] Committing..."
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
git commit -m "Deploy ${REPO_SLUG} - $TIMESTAMP"

echo "[5/5] Pushing to GitHub..."
git push origin "$BRANCH"

echo ""
echo "=== Deployed successfully ==="
echo "Repo:   https://github.com/${REPO_SLUG}"
echo "Branch: $BRANCH"

rm -rf "$DEPLOY_DIR"
