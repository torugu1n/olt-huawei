#!/bin/sh
set -eu

cd /app/backend
mkdir -p logs

if [ ! -f "${DATABASE_PATH:-./olt_manager.db}" ]; then
  echo "Inicializando banco de dados..."
fi

node src/init.js

echo "Iniciando OLT Manager em http://0.0.0.0:${PORT:-8000}"
exec node src/server.js
