# Design Rules

## CRITICAL - Execute Before Every UI Change

### Responsive Design
- ✅ Use Tailwind responsive classes (`md:`, `lg:`, `xl:`)
- ✅ Test on mobile (320px+), tablet (768px+), desktop (1024px+)
- ✅ Ensure touch targets are at least 44x44px on mobile
- ✅ Use relative units (rem, em) instead of fixed pixels
- ✅ Test with different screen sizes

### Accessibility
- ✅ Use semantic HTML elements
- ✅ Provide alt text for all images
- ✅ Ensure color contrast meets WCAG AA (4.5:1 minimum)
- ✅ Test keyboard navigation
- ✅ Use ARIA labels where needed
- ✅ Ensure focus indicators are visible

### Performance
- ✅ Use Next.js Image component for images
- ✅ Implement lazy loading for heavy components
- ✅ Use React.memo for expensive components
- ✅ Minimize bundle size
- ✅ Optimize API calls (batch, cache)

### User Experience
- ✅ Show loading states for async operations
- ✅ Provide error messages with retry options
- ✅ Use consistent spacing and typography
- ✅ Maintain consistent color scheme
- ✅ Provide clear navigation and feedback

### Mobile Optimization
- ✅ Test on actual mobile devices
- ✅ Ensure text is readable without zooming
- ✅ Check that buttons are easily tappable
- ✅ Verify forms work on mobile keyboards
- ✅ Test landscape and portrait orientations

