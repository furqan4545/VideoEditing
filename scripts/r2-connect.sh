#!/bin/bash
# Connect this Mac to the private Cloudflare R2 bucket that holds the sound-effects library.
# Run it yourself in a terminal: it asks for the R2 API token and stores it in rclone's config
# (~/.config/rclone/rclone.conf, readable only by you). The secret never goes in this repo or in a chat.
set -euo pipefail

REMOTE=sfx-r2
BUCKET="${1:-soundeffects}"
ACCOUNT="${2:-6a3169fa7b6a4445d0ae31f0bf2d9b02}"   # the Cloudflare account id (not a secret: it is in the dashboard URL)
command -v rclone >/dev/null || { echo "rclone is missing: run ./setup.sh first"; exit 1; }

echo "Cloudflare dashboard -> R2 -> Manage API tokens -> Create API token"
echo "  https://dash.cloudflare.com/$ACCOUNT/r2/api-tokens"
echo "  Permissions: Object Read & Write, Specify bucket: $BUCKET"
echo "Account $ACCOUNT, bucket $BUCKET. Paste the two values the token page shows (the secret stays hidden)."
read -r -p "Access Key ID: " KEY
read -r -s -p "Secret Access Key: " SECRET; echo

rclone config create "$REMOTE" s3 provider=Cloudflare env_auth=false \
  access_key_id="$KEY" secret_access_key="$SECRET" \
  endpoint="https://$ACCOUNT.r2.cloudflarestorage.com" acl=private no_check_bucket=true \
  --non-interactive >/dev/null
chmod 600 "$(rclone config file | tail -1)"
unset SECRET

probe="_connect-test-$(date +%s).txt"
if echo ok | rclone rcat "$REMOTE:$BUCKET/$probe" && rclone deletefile "$REMOTE:$BUCKET/$probe"; then
  echo "Connected: $REMOTE:$BUCKET can be written and read."
else
  echo "Could not write to $BUCKET. Check the bucket name and that the token has Object Read & Write on it."
  exit 1
fi
