#!/bin/bash
set -e

REPO_SLUG="${1:?Usage: deploy-github.sh <github-org/repo> [branch]}"
BRANCH="${2:-main}"
DEPLOY_DIR="/tmp/github-deploy"
SOURCE_DIR="/home/runner/workspace"
REPO_URL="https://${GITHUB_PAT}@github.com/${REPO_SLUG}.git"

if [ -z "$GITHUB_PAT" ]; then
  echo "Error: GITHUB_PAT secret is not set."
  exit 1
fi

echo "=== Deploying to GitHub ==="
echo "Repo:   https://github.com/${REPO_SLUG}"
echo "Branch: $BRANCH"
echo ""

rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

git config --global user.email "deploy@replit.com"
git config --global user.name "Replit Deploy"

if git ls-remote "$REPO_URL" &>/dev/null; then
  echo "[1/5] Cloning existing repo..."
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

echo "[2/5] Syncing files..."

find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

cd "$SOURCE_DIR"
for item in *; do
  case "$item" in
    node_modules|dist|.cache|.local|.config|.upm|attached_assets|generated-icon.png|.replit|replit.nix|replit.md|.DS_Store)
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
git commit -m "Deploy from Replit - $TIMESTAMP"

echo "[5/5] Pushing to GitHub..."
git push origin "$BRANCH"

echo ""
echo "=== Deployed successfully ==="
echo "Repo:   https://github.com/${REPO_SLUG}"
echo "Branch: $BRANCH"

rm -rf "$DEPLOY_DIR"
