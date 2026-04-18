# FPL DnD - Hetzner Cloud Deployment Guide

## Prerequisites

1. Hetzner Cloud account ([Sign up here](https://www.hetzner.com/cloud/))
2. Domain name (optional but recommended)
3. SSH key pair
4. Basic knowledge of Linux server administration

## Production checklist

- **Environment**: Start from [`.env.example`](.env.example) and create `.env.production` on the server with real values. Never commit secrets.
- **Public env vars**: Prefer server-only keys (for example `NEWS_API_KEY`). Anything prefixed with `NEXT_PUBLIC_` is exposed to the browser bundle.
- **Sessions**: The default session store writes to `sessions.json` via [`lib/session-store.ts`](lib/session-store.ts). That works for a **single** Node/PM2 process on one machine. For multiple instances, serverless, or horizontal scaling, replace it with Redis or a shared database.
- **Debug APIs**: `/api/test-cookies` is disabled when `NODE_ENV=production` (404). Audit other routes under `app/api/` before launch and gate or remove anything that is dev-only.
- **Build**: Deploy only after `npm run build` succeeds; run the same in CI if possible.
- **HTTPS**: Terminate TLS at Nginx (or your reverse proxy) so secure cookies from the auth routes behave correctly.

## Step 1: Create Hetzner Cloud Server

### Recommended Server Configuration

Based on [Hetzner Cloud pricing](https://www.hetzner.com/cloud/):

- **For Development/Testing:** Shared Cost-Optimized (from €3.49/month)
  - 1 vCPU, 2 GB RAM, 20 GB NVMe SSD
- **For Production (Low-Medium Traffic):** Shared Regular Performance (from €4.99/month)
  - 2 vCPU, 4 GB RAM, 40 GB NVMe SSD
- **For Production (High Traffic):** Dedicated General Purpose (from €12.49/month)
  - 2 vCPU (dedicated), 8 GB RAM, 80 GB NVMe SSD

### Server Setup Steps

1. Log in to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create a new project
3. Click "Add Server"
4. Choose:
   - **Location:** Germany (Nuremberg/Falkenstein) or Finland (Helsinki) for EU
   - **Image:** Ubuntu 22.04 or Debian 12
   - **Type:** Select based on your needs (see above)
   - **SSH Key:** Add your public SSH key
   - **Firewall:** Create/select firewall (allow SSH, HTTP, HTTPS)
   - **Networks:** Optional
   - **Backups:** Enable for production
5. Click "Create & Buy Now"

## Step 2: Initial Server Configuration

### Connect to Server

```bash
ssh root@YOUR_SERVER_IP
```

### Update System

```bash
apt update && apt upgrade -y
```

### Create Non-Root User

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Configure Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### Install Required Software

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

## Step 3: Deploy Application

### Clone Repository

```bash
cd /home/deploy
git clone https://github.com/SierraRomeo47/fpl.git
cd fpl
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

```bash
nano .env.production
```

Add your production environment variables (see [`.env.example`](.env.example) for all optional keys):

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PORT=3000
# NEWS_API_KEY=...   # server-only recommended
# FOOTBALL_DATA_API_KEY=...
```

### Build Application

```bash
npm run build
```

### Test Production Build

```bash
npm start
# Visit http://YOUR_SERVER_IP:3000 to test
# Press Ctrl+C to stop
```

## Step 4: Configure PM2

### Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'fpl-dnd',
    script: 'npm',
    args: 'start',
    cwd: '/home/deploy/fpl',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/deploy/fpl/logs/err.log',
    out_file: '/home/deploy/fpl/logs/out.log',
    log_file: '/home/deploy/fpl/logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Create Logs Directory

```bash
mkdir -p logs
```

### Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the instructions to enable PM2 on system boot
```

### PM2 Useful Commands

```bash
pm2 status          # Check status
pm2 logs            # View logs
pm2 restart fpl-dnd # Restart app
pm2 stop fpl-dnd    # Stop app
pm2 delete fpl-dnd  # Remove from PM2
```

## Step 5: Configure Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/fpl-dnd
```

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Proxy Settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/fpl-dnd /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Step 6: Configure Domain & SSL

### DNS Configuration

1. Go to your domain registrar
2. Add A record:
   - **Name:** @ (or yourdomain.com)
   - **Type:** A
   - **Value:** Your Hetzner server IP
   - **TTL:** 3600
3. Add A record for www:
   - **Name:** www
   - **Type:** A
   - **Value:** Your Hetzner server IP
   - **TTL:** 3600

Wait for DNS propagation (can take up to 48 hours, usually much faster).

### Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will:
- Automatically configure SSL in Nginx
- Set up automatic renewal

### Verify SSL Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 7: Security Hardening

### Update SSH Configuration

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

### Set Up Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Updates

Set up automatic security updates:

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 8: Monitoring & Maintenance

### Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/fpl-dnd
```

```
/home/deploy/fpl/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
}
```

### Monitor Server Resources

```bash
# Install htop for monitoring
sudo apt install htop -y
htop
```

### Set Up Uptime Monitoring

Use external services like:
- UptimeRobot (free tier available)
- Pingdom
- HetrixTools

## Step 9: Backup Strategy

### Application Backup

```bash
# Create backup script
nano /home/deploy/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/fpl-dnd-$DATE.tar.gz /home/deploy/fpl --exclude='node_modules' --exclude='.next'

# Keep only last 7 days of backups
find $BACKUP_DIR -name "fpl-dnd-*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /home/deploy/backup.sh
```

### Schedule Daily Backups

```bash
crontab -e
```

Add:
```
0 2 * * * /home/deploy/backup.sh
```

## Step 10: Deployment Workflow

### Update Application

```bash
cd /home/deploy/fpl
git pull origin main
npm install
npm run build
pm2 restart fpl-dnd
```

### Rollback (if needed)

```bash
cd /home/deploy/fpl
git checkout <previous-commit-hash>
npm install
npm run build
pm2 restart fpl-dnd
```

## Troubleshooting

### Check Application Logs

```bash
pm2 logs fpl-dnd
tail -f /home/deploy/fpl/logs/combined.log
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check System Resources

```bash
df -h          # Disk space
free -h        # Memory
htop           # CPU and processes
```

### Restart Services

```bash
sudo systemctl restart nginx
pm2 restart fpl-dnd
```

## Cost Optimization Tips

1. **Start Small:** Begin with Shared Regular Performance (€4.99/month)
2. **Monitor Usage:** Use `htop` and monitoring tools
3. **Scale Up When Needed:** Easy to upgrade server type in Hetzner Cloud
4. **Use Backups Wisely:** Hetzner backups cost extra, use manual backups for non-critical data
5. **Optimize Application:** Implement caching to reduce server load

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication only
- [ ] Root login disabled
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Fail2Ban installed
- [ ] Automatic updates enabled
- [ ] Non-root user for application
- [ ] Environment variables secured
- [ ] Regular backups configured

## References

- [Hetzner Cloud Documentation](https://docs.hetzner.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Last Updated:** 2025-01-XX
**Server Provider:** Hetzner Cloud
**Application:** FPL DnD

