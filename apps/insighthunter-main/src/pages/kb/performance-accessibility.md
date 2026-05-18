/* performance-accessibility.md */

This document defines the accessibility performance strategy for the InsightHunter Web platform.
Accessibility is treated as a performance feature, ensuring fast, clear, and inclusive experiences for all users.

------------------------------------------------------------
1. Accessibility Philosophy
------------------------------------------------------------
InsightHunter follows:
- WCAG 2.1 AA principles
- Semantic HTML
- Keyboard accessibility
- High contrast design
- Reduced motion defaults

Accessibility is integrated into the design system, not added later.

------------------------------------------------------------
2. Semantic HTML
------------------------------------------------------------
All pages use:
- <header>
- <nav>
- <main>
- <section>
- <footer>

Benefits:
- Faster parsing
- Better screen reader support
- Improved SEO

------------------------------------------------------------
3. Keyboard Navigation
------------------------------------------------------------
All interactive elements:
- Are reachable via Tab
- Have visible focus states
- Do not trap focus
- Use native HTML controls when possible

Buttons:
- Use <button> instead of <div>

Links:
- Use <a> with href attributes

------------------------------------------------------------
4. Color Contrast
------------------------------------------------------------
Contrast ratios:
- Text vs background: 4.5:1 minimum
- Large text: 3:1 minimum
- Accent elements: high contrast neon

Dark mode:
- Default
- High contrast by design

------------------------------------------------------------
5. Reduced Motion
------------------------------------------------------------
Users with reduced-motion preferences receive:
- No animations
- No transitions
- No parallax
- No glowing effects

CSS:
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none;
    transition: none;
  }
}

------------------------------------------------------------
6. Screen Reader Optimization
------------------------------------------------------------
ARIA usage:
- Only when necessary
- Never duplicate native semantics

Examples:
- aria-live for dynamic content
- aria-expanded for collapsible sections

Avoid:
- aria-label on visible text
- Overuse of roles

------------------------------------------------------------
7. Form Accessibility
------------------------------------------------------------
Forms include:
- <label> for every input
- Clear error messages
- Logical tab order
- Descriptive placeholders

Inputs:
- Use type="email", type="number", etc.
- Provide autocomplete attributes

------------------------------------------------------------
8. Performance and Accessibility
------------------------------------------------------------
Accessibility improves performance by:
- Reducing layout complexity
- Using semantic HTML
- Avoiding heavy animations
- Minimizing JS-driven UI

Screen readers load faster when:
- HTML is clean
- DOM is shallow
- CSS is lightweight

------------------------------------------------------------
9. Testing Strategy
------------------------------------------------------------
Tools:
- Lighthouse Accessibility
- Axe DevTools
- VoiceOver (macOS/iOS)
- NVDA (Windows)

Manual checks:
- Keyboard-only navigation
- Focus visibility
- Screen reader flow

------------------------------------------------------------
10. Accessibility Targets
------------------------------------------------------------
Lighthouse Accessibility: 100  
Keyboard navigation: fully supported  
Screen reader compatibility: full  
Reduced motion: fully supported  

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s accessibility strategy ensures:
- Inclusive design
- Fast rendering
- Clear interactions
- Predictable behavior

Accessibility is treated as a core performance feature.
