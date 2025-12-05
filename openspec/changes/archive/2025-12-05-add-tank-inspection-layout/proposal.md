# Proposal: Add Tank Inspection Layout

## Why

The Next.js application needs a consistent layout matching the existing Angular Tank Inspection application to ensure visual and functional parity across platforms. This establishes the foundational UI structure for the AI-powered tank inspection features.

## What Changes

- **Add Tank Inspection color scheme** - Update globals.css with dark theme OKLCH colors (#363636 background, #000000 black elements, #FF594F coral accent)
- **Add main layout structure** - Grid-based layout with sidebar rail and main content area
- **Add sidebar rail component** - Vertical navigation with menu, home, avatar, and logout
- **Add top bar component** - Header with logo, title, and live clock
- **Add inspector container** - Flex layout with viewer placeholder and collapsible chat sidebar
- **Add chat panel** - AI chat interface using ai-elements library components
- **Add voice button placeholder** - Floating voice mode button (UI only)

## Impact

### Specs Affected
- `layout` - New capability defining the application layout structure

### Code Affected
- `src/app/globals.css` - Color scheme updates
- `src/app/layout.tsx` - Dark mode and metadata
- `src/app/page.tsx` - Main page structure
- `src/components/layout/*` - New layout components
- `src/components/inspector/*` - New inspector components
