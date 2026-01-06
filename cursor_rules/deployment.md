# Deployment Rules

## CRITICAL - Execute Before Every Deployment

### Build Verification
- ✅ Run `npm run build` and ensure it completes without errors
- ✅ Fix ALL TypeScript errors before deploying
- ✅ Remove console.logs in production code
- ✅ Test production build locally (`npm run build && npm start`)
- ✅ Verify no environment variable errors

### Environment Configuration
- ✅ Set all required environment variables
- ✅ Use different configs for dev/staging/production
- ✅ Never hardcode URLs or endpoints
- ✅ Document all required environment variables
- ✅ Verify `.env.example` is up to date

### Pre-Deployment Checklist
- ✅ All environment variables are set
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ No console errors in browser
- ✅ All API routes are secured
- ✅ SSL certificate is configured (for production)
- ✅ Domain DNS is properly configured
- ✅ Firewall rules are set
- ✅ Error logging is configured

### Hetzner Cloud Specific
- ✅ Server is running and accessible
- ✅ Nginx is configured correctly
- ✅ SSL certificate is valid and auto-renewing
- ✅ PM2 process is running
- ✅ Logs are being rotated
- ✅ Backups are configured

### Rollback Plan
- ✅ Know how to rollback to previous version
- ✅ Have backup of current working version
- ✅ Test rollback procedure
- ✅ Document rollback steps

