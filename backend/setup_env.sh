#!/usr/bin/env bash
# Recreates the Python env used by backend scripts/tests.
# Usage: bash backend/setup_env.sh [venv_path]   (default: ~/venvs/revguard)
set -euo pipefail
VENV="${1:-$HOME/venvs/revguard}"
python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --prefer-binary -r "$(dirname "$0")/requirements.txt"
echo "venv ready: $VENV"
