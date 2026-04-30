#!/bin/bash
set -e

echo "========================================="
echo "  OLT Huawei Manager — Instalação"
echo "========================================="

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Verificações ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "✗ Node.js não encontrado. Instale Node.js 18+ e tente novamente."
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "✗ Node.js $NODE_VER detectado. É necessário Node.js 18 ou superior."
  exit 1
fi
echo "✓ Node.js $(node --version)"

# ── Backend ────────────────────────────────────────────────────────────────────
echo ""
echo "[1/3] Instalando dependências do backend..."
cd "$BASE_DIR/backend"
npm install --silent

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  ⚠  Arquivo .env criado."
  echo "     Edite '$BASE_DIR/backend/.env' com os dados da sua OLT antes de iniciar!"
  echo ""
fi

echo "[2/3] Inicializando banco de dados..."
node src/init.js

# ── Frontend ───────────────────────────────────────────────────────────────────
echo "[3/3] Instalando e compilando o frontend..."
cd "$BASE_DIR/frontend"
npm install --silent
npm run build

echo ""
echo "========================================="
echo "  ✓ Instalação concluída!"
echo ""
echo "  Próximos passos:"
echo "  1) Edite backend/.env com os dados da OLT"
echo "  2) Execute: ./start.sh"
echo "  3) Acesse: http://localhost:8000"
echo "  4) Login: admin / admin123  (troque a senha!)"
echo "========================================="
