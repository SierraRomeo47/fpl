# Safety Rules

## CRITICAL - Execute Before Every Code Change

### Error Handling
- ✅ Wrap async operations in try-catch blocks
- ✅ Never expose stack traces to users in production
- ✅ Provide user-friendly error messages
- ✅ Log errors server-side for debugging
- ✅ Handle edge cases (null/undefined checks)

### Input Validation
- ✅ Validate ALL inputs on server-side
- ✅ Sanitize data before rendering (prevent XSS)
- ✅ Use TypeScript types for validation
- ✅ Check for edge cases (empty strings, null, undefined)

### Resource Management
- ✅ Clean up useEffect hooks (return cleanup functions)
- ✅ Cancel pending requests on component unmount
- ✅ Use AbortController for fetch requests
- ✅ Remove event listeners in cleanup
- ✅ Clear intervals/timeouts in cleanup

### API Calls
- ✅ Implement retry logic with exponential backoff
- ✅ Handle network failures gracefully
- ✅ Set proper timeout values
- ✅ Don't make unnecessary API calls
- ✅ Cache responses when appropriate

### Memory Leaks Prevention
- ✅ Check for missing cleanup in useEffect
- ✅ Verify event listeners are removed
- ✅ Ensure intervals are cleared
- ✅ Check for circular references

