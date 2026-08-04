warning: in the working copy of 'ai_context.md', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/ai_context.md b/ai_context.md[m
[1mnew file mode 100644[m
[1mindex 0000000..9b877c7[m
[1m--- /dev/null[m
[1m+++ b/ai_context.md[m
[36m@@ -0,0 +1,153 @@[m
[32m+[m[32m# Master AI System Context & Rules[m
[32m+[m
[32m+[m[32m> **CRITICAL RULE FOR ALL AI AGENTS**:[m[41m  [m
[32m+[m[32m> You MUST read and strictly adhere to this document (`ai_context.md`) before generating new code, modifying components, or proposing architectural changes in this codebase.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 1. Project Overview & Tech Stack[m
[32m+[m
[32m+[m[32m### Project Overview[m
[32m+[m[32mThis codebase is a **unified Point of Sale (POS) and Customer-Facing Kiosk Web Application** built for our student organization (**Takopi / AWS POS**).[m[41m [m
[32m+[m[32mIt supports two main operating modes:[m
[32m+[m[32m1. **Public Customer Kiosk (`/`)**: A self-service ordering interface designed for fast customer browsing, visual menu navigation with "Featured" category pill, merch pre-orders, custom order numbers, and pay-at-counter tickets.[m
[32m+[m[32m2. **Protected Staff & Admin POS (`/admin`)**: A comprehensive management interface for staff transaction processing, real-time pending kiosk order notifications, inventory tracking, recipe management, GCash verification, staff management, and dashboard analytics.[m
[32m+[m
[32m+[m[32m### Technology Stack[m
[32m+[m[32m- **Core Framework**: React 19 with Vite 7 and TypeScript.[m
[32m+[m[32m- **Styling**: Tailwind CSS v4 with custom color tokens and utility layers.[m
[32m+[m[32m- **UI Components**: Radix UI primitives / Shadcn UI components with Lucide icons & Framer Motion animations.[m
[32m+[m[32m- **Routing**: `react-router-dom` v7 with lazy-loaded route chunking via `React.lazy()` and `<Suspense>`.[m
[32m+[m[32m- **Database & Backend**: Supabase PostgreSQL (`orders`, `order_items`, `products`, `product_variants`, `ingredients`, `recipes`, `staff`, `categories`, `app_settings`).[m
[32m+[m[32m- **State & Real-Time Sync**: Shared custom hooks (`useCart`, `useInventory`, `useKioskOrders`, `useGCashSettings`, `useMyPreOrders`, `useTransactions`) backed by local storage caching and multi-tab `BroadcastChannel` bridges (`timpla_kiosk_channel`, `timpla_my_preorders_channel`, `timpla_gcash_channel`).[m
[32m+[m
[32m+[m[32m### Strict Color Palette & Aesthetics[m
[32m+[m[32mAll UI additions and refactors MUST strictly enforce the established dark mode color system:[m
[32m+[m
[32m+[m[32m| Role | Color Code | Description |[m
[32m+[m[32m| :--- | :--- | :--- |[m
[32m+[m[32m| **Main Background** | `#0B0E14` | Deep pitch black background for application root and scroll areas |[m
[32m+[m[32m| **Panel / Header** | `#131824` | Secondary dark background for sticky headers, sidebars, and sticky category bar |[m
[32m+[m[32m| **Cards & Modals** | `#1E2333` | Card containers, dialog modals, dropdowns, and input backgrounds |[m
[32m+[m[32m| **Borders & Lines** | `#232A3B` / `#2D3448` | Subtle dark borders and divider separators |[m
[32m+[m[32m| **Primary Accent** | `#E6007E` | Vibrant pink accent for active states, primary buttons, price tags, and rings |[m
[32m+[m[32m| **Secondary Accent**| `#00F2FE` | Neon cyan accent for order numbers, active indicators, and clocks |[m
[32m+[m[32m| **Danger / Warning** | `#FF3366` | Out-of-stock badges, delete buttons, and warning text |[m
[32m+[m[32m| **Primary Text** | `#E2E8F0` | High-contrast off-white text |[m
[32m+[m[32m| **Muted Text** | `#94A3B8` / `#64748B` | Secondary labels, item counts, and placeholders |[m
[32m+[m
[32m+[m[32m- **Corner Radius**: Product cards use `rounded-2xl` (`20px`), modal dialogs use `rounded-2xl`, category pills use `rounded-full`.[m
[32m+[m[32m- **Theme Guarantee**: NEVER introduce light mode or white backgrounds.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 2. Architecture & View Isolation[m
[32m+[m
[32m+[m[32m### Decoupled View Architecture & Performance Route Chunking[m
[32m+[m[32mTo prevent "kiosk escapes" and isolate public UI from admin controls, Kiosk and POS views are strictly decoupled and lazy-loaded:[m
[32m+[m
[32m+[m[32m- **Route Chunking (`src/main.tsx`)**:[m
[32m+[m[32m  - `AdminLayout`, `AdminPOSView`, `Dashboard`, `InventoryPage`, `ManageMenuPage`, and `Login` are imported via `React.lazy()` and wrapped in `<Suspense>`.[m
[32m+[m[32m  - Admin bundles (`mainLayout-*.js`, `Admin-Dashboard-*.js`, etc.) are completely split into separate chunks and NEVER bundled into the initial customer Kiosk payload (`KioskView-*.js`).[m
[32m+[m
[32m+[m[32m- **Customer Kiosk (`/`)**:[m
[32m+[m[32m  - Main Component: [`src/kiosk/KioskView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/kiosk/KioskView.tsx)[m
[32m+[m[32m  - Layout Wrapper: `KioskLayout`[m
[32m+[m[32m  - Features:[m
[32m+[m[32m    - Sticky top header (`SiteHeader`).[m
[32m+[m[32m    - Sticky category navigation bar (`sticky top-0 z-40 bg-[#0B0E14]`) starting with **"Featured"** category pill and container-isolated scroll spy.[m
[32m+[m[32m    - **Top Carousel Section**: Merch / Pre-Order items ONLY (`isPreOrder === true` or category/type `"merch"`).[m
[32m+[m[32m    - **Main Menu List Below**: Food & beverage on-hand items ONLY (excludes merch items).[m
[32m+[m[32m    - Floating bottom ticket button with subtle micro-bounce (`1.03x` scale pulse, glowing shadow boost, and animated item count badge).[m
[32m+[m[32m    - Persistent **"My Pre-Orders"** drawer button near search bar (`<MyPreOrdersModalButton />`), strictly saved per customer device.[m
[32m+[m
[32m+[m[32m- **Staff & Admin POS (`/admin`)**:[m
[32m+[m[32m  - Main Component: [`src/POS/AdminPOSView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/AdminPOSView.tsx)[m
[32m+[m[32m  - Layout Wrapper: `AdminLayout` protected by `ProtectedRoute`[m
[32m+[m[32m  - Sub-routes:[m
[32m+[m[32m    - `/admin/dashboard` (`Admin-Dashboard.tsx`) - Sales analytics charts, daily summary metrics, and **Launch Day Reset Kiosk Counter** utility.[m
[32m+[m[32m    - `/admin/inventory` (`InventoryPage.tsx`) - Ingredient stock tracking, recipe management, and reorder levels.[m
[32m+[m[32m    - `/admin/menuManagement` (`menuManagement.tsx`) - Menu item creation, category management, pricing, and merch toggle.[m
[32m+[m[32m  - Features:[m
[32m+[m[32m    - Pending Kiosk order modal badge (`<PendingOrdersModal />`), LiveClock, "+ Add Category" button, right-side transaction panel, inventory table management.[m
[32m+[m[32m    - **"Featured" Category Pill**: Default start pill replacing legacy "All" label.[m
[32m+[m[32m    - **"My Pre-Orders" button is strictly excluded** from Admin POS view.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 3. Order Types & System Workflows[m
[32m+[m
[32m+[m[32m### 1. Merchandise Pre-Order Workflow (`<PreOrderModal />`)[m
[32m+[m[32m- Clicking any merchandise item opens `<PreOrderModal />` rather than adding directly to the food cart ticket.[m
[32m+[m[32m- Features item banner preview, shirt size selector (`XS`, `S`, `M`, `L`, `XL`, `2XL`, `3XL`), required customer contact inputs (`Name`, `Phone`, `Email`), and payment method selection (`Cash`, `GCash`, `Pay Later`).[m
[32m+[m[32m- **Storage & Isolation**: Pre-orders are saved to `timpla_my_saved_preorders` for customer device persistence and inserted into Supabase `orders` with `fulfillment_status = 'pre_ordered'` and `status = 'unpaid'`.[m
[32m+[m[32m- **Pending Kiosk Orders Excluded**: Pre-orders do NOT go to `timpla_kiosk_pending_orders` or the Pending Kiosk Orders modal (`<PendingOrdersModal />`).[m
[32m+[m
[32m+[m[32m### 2. Immediate Food & Beverage Kiosk Orders & Ticket Visuals[m
[32m+[m[32m- Adding food/beverage items builds a cart ticket with product picture thumbnails rendered directly inside t