#!/usr/bin/env bash
# Only this site's static files are replaced; no Nginx reload or other services.
set -Eeuo pipefail

STAGING_DIR="${1:?Missing staging directory}"
TARGET_DIR=/var/www/personal-site
BACKUP_ROOT=/var/www/personal-site-backups

[[ "$STAGING_DIR" =~ ^/tmp/personal-site-deploy-[0-9]+-[0-9]+$ ]]
[[ "$(readlink -f -- "$STAGING_DIR")" == "$STAGING_DIR" ]]
[[ "$(readlink -f -- "$TARGET_DIR")" == "$TARGET_DIR" ]]
test -f "$STAGING_DIR/index.html"
test -f "$STAGING_DIR/projects/index.html"
test -f "$STAGING_DIR/about/index.html"
test -f "$STAGING_DIR/contact/index.html"
test -f "$STAGING_DIR/notes/index.html"
test -f "$STAGING_DIR/sitemap.xml"
test -d "$STAGING_DIR/_astro"
test ! -e "$STAGING_DIR/USER_CONTEXT.md"
test ! -d "$STAGING_DIR/src"
test ! -d "$STAGING_DIR/node_modules"

mkdir -p "$BACKUP_ROOT"
[[ "$(readlink -f -- "$BACKUP_ROOT")" == "$BACKUP_ROOT" ]]
BACKUP_DIR="$(mktemp -d "$BACKUP_ROOT/personal-site-$(date +%Y%m%d-%H%M%S)-XXXXXX")"
rsync -a "$TARGET_DIR/" "$BACKUP_DIR/"
echo "Old site backup: $BACKUP_DIR"

rollback() {
  local exit_code=$?
  trap - ERR
  echo "Publication failed; restoring $BACKUP_DIR" >&2
  if rsync -a --delete --exclude='.well-known/' "$BACKUP_DIR/" "$TARGET_DIR/"; then
    echo 'Previous site restored.' >&2
  else
    echo 'Automatic restore failed; retained backup requires manual recovery.' >&2
  fi
  exit "$exit_code"
}
trap rollback ERR

# Keep certificate challenge files if this server uses webroot renewal.
rsync -a --delay-updates --delete-delay --exclude='.well-known/' "$STAGING_DIR/" "$TARGET_DIR/"
find "$TARGET_DIR" -type d -exec chmod 755 {} +
find "$TARGET_DIR" -type f -exec chmod 644 {} +
cmp "$STAGING_DIR/index.html" "$TARGET_DIR/index.html"

# Verify the existing HTTPS virtual host against the exact uploaded HTML.
curl --fail --silent --show-error --max-time 20 --retry 2 \
  --resolve yuxinlei.cloud:443:127.0.0.1 https://yuxinlei.cloud/ \
  --output "$STAGING_DIR/codex_live_home.html"
cmp "$STAGING_DIR/index.html" "$STAGING_DIR/codex_live_home.html"
for route in projects about contact projects/image-denoising projects/magic-resume projects/product-analysis projects/personal-site projects/new-api-relay notes notes/ssh-sshd notes/tls-1-3 notes/ubuntu-operations notes/wireshark-protocols notes/hydra-kali; do
  curl --fail --silent --show-error --max-time 20 --retry 2 \
    --resolve yuxinlei.cloud:443:127.0.0.1 "https://yuxinlei.cloud/$route/" \
    --output /dev/null
done

trap - ERR
echo "Publication verified: https://yuxinlei.cloud/"
echo "Rollback backup: $BACKUP_DIR"
rm -rf -- "$STAGING_DIR"
