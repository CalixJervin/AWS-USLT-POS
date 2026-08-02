# Master AI System Context & Rules

> **CRITICAL RULE FOR ALL AI AGENTS**:  
> You MUST read and strictly adhere to this document (`ai_context.md`) before generating new code, modifying components, or proposing architectural changes in this codebase.

---

## 1. Project Overview

This codebase is a **unified Point of Sale (POS) and Customer-Facing Kiosk Web Application** built for Takopi / AWS POS. 
It supports two main operating modes:
1. **Public Customer Kiosk (`/`)**: A self-service ordering interface designed for fast customer browsing, visual menu navigation, custom order numbers, and pay-at-counter tickets.
2. **Protected Staff & Admin POS (`/admin`)**: A comprehensive management interface for staff transaction processing, real-time pending kiosk order notifications, inventory tracking, recipe management, and dashboard analytics.

---

## 2. Tech Stack & Design System

### Technology Stack
- **Core Framework**: React 19 with Vite 7 and TypeScript.
- **Styling**: Tailwind CSS v4 with custom color tokens and utility layers.
- **UI Components**: Radix UI primitives / Shadcn UI components with Lucide icons.
- **Routing**: `react-router-dom` v7 with lazy-loaded route chunking.
- **State & Persistence**: Shared custom hooks (`useCart`, `useInventory`, `useKioskOrders`) backed by local storage and real-time event listeners.

### Strict Color Palette & Aesthetics
All UI additions and refactors MUST strictly enforce the established dark mode color system:

| Role | Color Code | Description |
| :--- | :--- | :--- |
| **Main Background** | `#0B0E14` | Deep pitch black background for application root and scroll areas |
| **Panel / Header** | `#131824` | Secondary dark background for sticky headers, sidebars, and sticky category bar |
| **Cards & Modals** | `#1E2333` | Card containers, dialog modals, dropdowns, and input backgrounds |
| **Borders & Lines** | `#232A3B` / `#2D3448` | Subtle dark borders and divider separators |
| **Primary Accent** | `#E6007E` | Vibrant pink accent for active states, primary buttons, price tags, and rings |
| **Secondary Accent**| `#00F2FE` | Neon cyan accent for order numbers, active indicators, and clocks |
| **Danger / Out of Stock** | `#FF3366` | Out-of-stock badges, delete buttons, and warnings |
| **Primary Text** | `#E2E8F0` | High-contrast off-white text |
| **Muted Text** | `#94A3B8` / `#64748B` | Secondary labels, item counts, and placeholders |

- **Corner Radius**: Product cards use `rounded-2xl` (`20px`), modal dialogs use `rounded-2xl`, category pills use `rounded-full`.
- **Theme Guarantee**: NEVER introduce light mode or white backgrounds.

---

## 3. Architecture & Routing

### Decoupled View Architecture
To prevent "kiosk escapes" and isolate public UI from admin controls, Kiosk and POS views are strictly decoupled into separate top-level files without `isKiosk` prop drilling:

- **Customer Kiosk (`/`)**:
  - Main Component: [`src/kiosk/KioskView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/kiosk/KioskView.tsx)
  - Layout Wrapper: `KioskLayout`
  - Features: Header ticket button, persistent order #042 banner, vertical scroll spy navigation, floating bottom ticket bar, bottom-up sheet drawer.

- **Staff & Admin POS (`/admin`)**:
  - Main Component: [`src/POS/AdminPOSView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/AdminPOSView.tsx)
  - Layout Wrapper: `AdminLayout` protected by `ProtectedRoute`
  - Sub-routes:
    - `/admin/dashboard` (`Admin-Dashboard.tsx`)
    - `/admin/inventory` (`InventoryPage.tsx`)
    - `/admin/menuManagement` (`menuManagement.tsx`)
  - Features: Pending Kiosk order modal, LiveClock, "+ Add Category" button, right-side desktop ticket panel, inventory table management.

---

## 4. Core UI & Behavior Rules

1. **Persistent Top Header**:
   - Main header (`SiteHeader`) MUST be locked at `sticky top-0 z-50 shrink-0 select-none bg-[#131824]`.
   - Dragging or touching near the header MUST NOT scroll or move the header frame.
   - The body element is locked (`html, body, #root { height: 100dvh; overflow: hidden; }`) to guarantee there is ONLY 1 single scrollbar on the page.

2. **Vertical Scroll-Spy Category Navigation**:
   - The category pills bar sits directly below `SiteHeader` with `sticky top-0 z-40 bg-[#0B0E14]`.
   - Category pill clicks MUST use container-isolated scrolling:
     ```tsx
     const targetTop = sectionRect.top - containerRect.top + container.scrollTop - 88;
     container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
     ```
   - Scroll spy threshold calculation MUST support short/empty unavailable categories:
     ```tsx
     const isVisibleInThreshold = topOffset <= 160 && (rect.bottom - containerTop) >= 30;
     ```

3. **Mobile-First Breakpoint Threshold (`1280px`)**:
   - `MOBILE_BREAKPOINT = 1280` in `use-mobile.ts`.
   - All iPads, iPad Pros, and tablets (< 1280px) MUST render mobile UI layouts (bottom floating action bars, overlay sheet drawers, hidden desktop sidebars).
   - Desktop layout activates strictly at `xl:` (>= 1280px).

4. **Product Card Sizing**:
   - Grid cards use set dimensions (`grid-cols-[repeat(auto-fill,minmax(165px,200px))] gap-4 sm:gap-5`).
   - Cards MUST NOT stretch into wide rectangles or shrink into squished squares.
   - Hover image zoom and scale transforms are disabled to keep card dimensions stable.

---

## 5. Instructions for AI Coding Assistant

- Always inspect existing hooks (`useCart`, `useInventory`, `useKioskOrders`) before writing new state logic.
- Run `npx tsc --noEmit` and `npm run build` after making file edits to verify compilation and production bundle build.
- Maintain documentation integrity and preserve existing docstrings.
