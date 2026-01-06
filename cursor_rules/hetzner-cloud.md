# Hetzner Cloud Deployment Rules

## CRITICAL - Execute Before Hetzner Cloud Operations

### Server Configuration
- ✅ Use Ubuntu 22.04 LTS or Debian 12
- ✅ Configure firewall (UFW) - allow only 22, 80, 443
- ✅ Disable root login, use SSH keys
- ✅ Create non-root user for application
- ✅ Keep system packages updated

### Domain & SSL
- ✅ Configure DNS A records pointing to server IP
- ✅ Use Let's Encrypt for SSL certificates
- ✅ Set up automatic certificate renewal
- ✅ Configure Nginx as reverse proxy
- ✅ Redirect HTTP to HTTPS
- ✅ Set proper security headers (HSTS, CSP)

### Application Deployment
- ✅ Use PM2 for process management
- ✅ Configure log rotation
- ✅ Set up monitoring and health checks
- ✅ Configure automatic restarts on failure
- ✅ Use environment variables for configuration

### Security Hardening
- ✅ Configure SSH (disable root, key-only auth)
- ✅ Install and configure Fail2Ban
- ✅ Set up automatic security updates
- ✅ Configure firewall rules
- ✅ Regular security audits

### Monitoring
- ✅ Set up uptime monitoring
- ✅ Monitor disk space and memory
- ✅ Configure log rotation
- ✅ Set up backup strategy
- ✅ Monitor application performance

### Cost Optimization
- ✅ Start with appropriate server size
- ✅ Monitor resource usage
- ✅ Use cost-optimized plans for non-critical workloads
- ✅ Implement caching to reduce load
- ✅ Scale up only when needed

### Before Deployment
- ✅ Server is accessible via SSH
- ✅ Domain DNS is configured
- ✅ SSL certificate is obtained
- ✅ Nginx is configured
- ✅ PM2 is running
- ✅ Environment variables are set
- ✅ Firewall is configured
- ✅ Backups are set up

