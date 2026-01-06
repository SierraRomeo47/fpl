# Security Rules

## CRITICAL - Execute Before Every Code Change

### Environment Variables
- ✅ NEVER commit `.env` files or any file containing secrets
- ✅ Always use environment variables for API keys, tokens, secrets
- ✅ Validate all environment variables exist before using them
- ✅ Use `.env.local` for development, `.env.production` for production

### API Security
- ✅ Validate and sanitize ALL user inputs before processing
- ✅ Implement rate limiting on API routes (`/api/*`)
- ✅ Use HTTPS for all external API calls
- ✅ Never expose sensitive endpoints without authentication
- ✅ Check CORS configuration for API routes

### Session & Authentication
- ✅ Use secure, HttpOnly cookies for sessions
- ✅ Always validate sessions server-side
- ✅ Never store sensitive data in localStorage/sessionStorage
- ✅ Implement proper logout that clears sessions
- ✅ Check user permissions server-side, never trust client

### Data Protection
- ✅ Sanitize all user inputs before database operations
- ✅ Never trust client-side validation alone
- ✅ Encrypt sensitive data in transit (HTTPS)
- ✅ Check for SQL injection risks if using database

### Before Committing
- ✅ Scan code for hardcoded secrets, API keys, passwords
- ✅ Ensure `.env*` files are in `.gitignore`
- ✅ Verify no sensitive data in console.logs
- ✅ Check that error messages don't expose internal details

