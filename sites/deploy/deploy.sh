#!/bin/sh
# Puts the four bookshops at https://edwardthomas.quest/projects/bookshops/ behind a password.
# On your Mac: unzip, open Terminal in this folder, run:  sh deploy.sh
set -e
cd "$(dirname "$0")"
command -v npx >/dev/null || { echo "Install Node.js first: https://nodejs.org (the LTS button), then run this again."; exit 1; }
npm install --silent
npx wrangler whoami >/dev/null 2>&1 || npx wrangler login
npx wrangler deploy --dry-run
echo
echo "Choose the password people will type to see the shops:"
npx wrangler secret put PREVIEW_PASSWORD
npx wrangler deploy
echo
echo "Live: https://edwardthomas.quest/projects/bookshops/  (send the password separately)"
