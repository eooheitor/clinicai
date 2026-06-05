#!/bin/bash
# Rodar UMA VEZ na VPS como root para configurar o ambiente
set -e

echo "==> Instalando Node.js 20 via nvm..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm alias default 20

echo "==> Instalando PM2..."
npm install -g pm2
pm2 startup

echo "==> Clonando o repositório..."
mkdir -p /var/www
cd /var/www
git clone https://github.com/eooheitor/fluxo-ia-zap.git fluxo-ia-zap
cd fluxo-ia-zap

echo "==> Criando arquivo .env (preencha os valores depois)..."
cp .env.example .env
echo "EDITE o arquivo /var/www/fluxo-ia-zap/.env antes de continuar"

echo "==> Criando .env.local do painel..."
cat > web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

echo ""
echo "==> Próximos passos:"
echo "  1. Preencher /var/www/fluxo-ia-zap/.env"
echo "  2. Rodar: cd /var/www/fluxo-ia-zap && npm ci && npm run build && npx prisma migrate deploy"
echo "  3. Rodar: cd web && npm ci && npm run build"
echo "  4. Iniciar: pm2 start dist/index.js --name fluxo-ia-backend"
echo "  5. Iniciar: pm2 start 'npm run start' --name fluxo-ia-web --cwd /var/www/fluxo-ia-zap/web"
echo "  6. Salvar: pm2 save"
