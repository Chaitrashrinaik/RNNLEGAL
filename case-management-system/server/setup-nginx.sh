#!/bin/bash
# CaseBench — Nginx + SSL setup
# Run as root AFTER setup-vps.sh completes.
# Requires a domain pointed at this server (A record -> VPS IP).
set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-nginx.sh yourdomain.com"
  exit 1
fi

echo "Configuring Nginx for $DOMAIN"

cat > /etc/nginx/sites-available/casebench <<'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/casebench

ln -sf /etc/nginx/sites-available/casebench /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# --- SSL via Certbot ---
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --register-unsafely-without-email --agree-tos --non-interactive

# --- Auto-renewal ---
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "Done! https://$DOMAIN is live."