#!/usr/bin/env bash
# Install what `ath preflight` checks. Mac (Homebrew) or Debian/Ubuntu.
set -e
if command -v brew >/dev/null 2>&1; then
  brew install pandoc typst tesseract poppler qpdf
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -q
  sudo apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils qpdf wamerican wbritish
  # pandoc and typst: current releases from GitHub (distro packages lag)
  P=3.6.4; T=v0.13.1; TMP=$(mktemp -d)
  curl -sSL -o $TMP/pandoc.tgz https://github.com/jgm/pandoc/releases/download/$P/pandoc-$P-linux-amd64.tar.gz
  tar xzf $TMP/pandoc.tgz -C $TMP && sudo cp $TMP/pandoc-$P/bin/pandoc /usr/local/bin/
  curl -sSL -o $TMP/typst.txz https://github.com/typst/typst/releases/download/$T/typst-x86_64-unknown-linux-musl.tar.xz
  tar xJf $TMP/typst.txz -C $TMP && sudo cp $TMP/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/
fi
python3 -m pip install -q -r "$(dirname "$0")/requirements.txt"
"$(dirname "$0")/bin/ath" preflight
