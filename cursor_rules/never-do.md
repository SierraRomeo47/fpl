# NEVER DO - Critical Rules

## ⛔ ABSOLUTE PROHIBITIONS

### Security
- ❌ NEVER commit `.env` files or secrets
- ❌ NEVER expose API keys in client-side code
- ❌ NEVER trust client-side validation alone
- ❌ NEVER skip server-side authentication checks
- ❌ NEVER expose stack traces to users

### Code Quality
- ❌ NEVER ignore TypeScript errors
- ❌ NEVER use `any` type without good reason
- ❌ NEVER skip error handling
- ❌ NEVER commit without testing the build
- ❌ NEVER hardcode URLs or endpoints

### Deployment
- ❌ NEVER deploy without SSL/HTTPS
- ❌ NEVER skip security headers
- ❌ NEVER deploy with console.logs
- ❌ NEVER skip environment variable validation
- ❌ NEVER deploy without testing production build

### Performance
- ❌ NEVER load all data at once (use pagination)
- ❌ NEVER make unnecessary API calls
- ❌ NEVER skip image optimization
- ❌ NEVER ignore bundle size
- ❌ NEVER skip loading states

### User Experience
- ❌ NEVER show raw error messages to users
- ❌ NEVER skip loading indicators
- ❌ NEVER break mobile layout
- ❌ NEVER ignore accessibility requirements
- ❌ NEVER skip error recovery options

