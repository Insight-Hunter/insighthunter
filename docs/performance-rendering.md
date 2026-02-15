/* performance-rendering.md */

This document defines the rendering optimization strategy for the InsightHunter Web platform.
The goal is to ensure smooth, responsive UI performance across all devices.

------------------------------------------------------------
1. Rendering Philosophy
------------------------------------------------------------
InsightHunter avoids:
- Heavy animations
- Layout thrashing
- Large DOM trees
- Expensive CSS effects
- JavaScript-driven layout changes

The UI is designed to render quickly and consistently.

------------------------------------------------------------
2. GPU Acceleration
------------------------------------------------------------
GPU-accelerated properties:
- transform
- opacity

Used for:
- Hover effects
- Button interactions
- Card transitions

Avoid:
- box-shadow animations
- filter: blur()
- large drop shadows on mobile

------------------------------------------------------------
3. Layout Stability
------------------------------------------------------------
The UI avoids:
- Dynamic height changes
- Content shifts
- Late-loading fonts
- Inline images without dimensions

All images include width and height attributes.

------------------------------------------------------------
4. DOM Optimization
------------------------------------------------------------
DOM structure:
- Shallow hierarchy
- Minimal wrappers
- Semantic elements
- Predictable layout

Tables:
- Lightweight
- No nested tables
- No heavy cell rendering

Cards:
- Simple structure
- Minimal nested elements

------------------------------------------------------------
5. CSS Rendering Optimization
------------------------------------------------------------
CSS avoids:
- Deep selectors
- Universal selectors
- Complex combinators
- Expensive pseudo-classes

All styles are:
- Flat
- Predictable
- Easy for the browser to compute

------------------------------------------------------------
6. JavaScript Rendering Optimization
------------------------------------------------------------
JavaScript avoids:
- Frequent DOM writes
- Forced reflows
- Large loops
- Layout reads inside loops

API responses are rendered:
- In batches
- With minimal DOM operations

------------------------------------------------------------
7. Animation Guidelines
------------------------------------------------------------
Allowed:
- Fade in/out
- Subtle scale
- Accent glow

Avoid:
- Parallax
- Scroll-linked animations
- Heavy transitions

Mobile:
- Reduced motion by default
- No large shadows

------------------------------------------------------------
8. Image Rendering Optimization
------------------------------------------------------------
Use:
- WebP for marketing
- SVG for UI icons
- CSS gradients for backgrounds

Avoid:
- PNG for large images
- JPEG without compression
- Oversized hero images

------------------------------------------------------------
9. Rendering Targets
------------------------------------------------------------
Frame rate: 60fps  
Layout shifts: 0  
Repaint cost: minimal  
Animation smoothness: consistent  

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s rendering strategy ensures:
- Smooth interactions
- Stable layouts
- Fast paint times
- Excellent performance on all devices

This rendering layer is designed to scale with the platform’s growth.
