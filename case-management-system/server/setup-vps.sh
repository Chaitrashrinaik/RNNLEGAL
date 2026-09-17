#!/bin/bash
# CaseBench — Hostinger VPS setup script
# Run as root on a fresh Ubuntu 22.04/24.04 VPS:
#   bash setup-vps.sh
set -e

echo "=============================="
echo " CaseBench VPS Setup"
echo "=============================="
apt-get update -y
apt-get upgrade -y

# --- Install Node.js 22 LTS ---
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git nginx build-essential
echo "Node: $(node -v), npm: $(npm -v)"

# --- Install PM2 ---
npm install -g pm2

# --- Deploy project ---
PROJECT_DIR=/var/www/casebench
mkdir -p $PROJECT_DIR
# Copy your project files here, e.g.:
#   scp -r ./case-management-system/* root@YOUR_SERVER_IP:$PROJECT_DIR/
# OR clone from a git repo.

cd $PROJECT_DIR/server
npm install --omit=dev

cd $PROJECT_DIR/client
npm install
npm run build

# --- Environment ---
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  echo ""
  echo "!! Create $PROJECT_DIR/server/.env from .env.production.example and set:"
  echo "   - JWT_SECRET (long random string)"
  echo "   - CLIENT_URL (your domain)"
  echo "   - EMAIL_PASS (gmail app password)"
  echo "   - WHATSAPP_* values when ready"
  echo ""
else
  echo ".env exists"
fi

# --- Start with PM2 ---
cd $PROJECT_DIR/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "App is now running on port 5000."
echo "Next: configure Nginx with setup-nginx.sh"