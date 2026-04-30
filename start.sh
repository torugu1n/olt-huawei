#!/bin/bash
set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$BASE_DIR/backend/node_modules" ]; then
  echo "✗ Backend não instalado. Execute: ./install.sh"
  exit 1
fi

cd "$BASE_DIR/backend"
mkdir -p logs

echo "Iniciando OLT Manager em http://0.0.0.0:${PORT:-8000} ..."
exec node src/server.js
