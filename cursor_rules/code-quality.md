# Code Quality Rules

## CRITICAL - Execute Before Every Code Change

### TypeScript
- ✅ Fix ALL TypeScript errors before committing
- ✅ Avoid `any` type - use proper types or `unknown`
- ✅ Use interfaces for object shapes
- ✅ Enable strict mode in tsconfig.json
- ✅ Type all function parameters and return values

### Code Organization
- ✅ Keep components small and focused (single responsibility)
- ✅ Use proper folder structure (Next.js App Router conventions)
- ✅ Separate concerns (UI, logic, data)
- ✅ Reuse components where possible
- ✅ Follow existing code patterns

### Git Practices
- ✅ Write clear, descriptive commit messages
- ✅ Don't commit sensitive data
- ✅ Use `.gitignore` properly
- ✅ Review changes before committing
- ✅ Keep commits atomic and focused

### Testing
- ✅ Test critical paths manually
- ✅ Verify error handling works
- ✅ Test on different browsers (Chrome, Firefox, Safari)
- ✅ Test responsive design
- ✅ Verify API integrations work

### Before Committing
- ✅ Run `npm run lint` and fix errors
- ✅ Run `npm run build` and ensure success
- ✅ Check for console errors
- ✅ Verify no unused imports
- ✅ Ensure consistent code formatting

