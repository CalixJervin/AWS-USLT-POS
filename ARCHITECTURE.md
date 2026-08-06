# 🏗️AWS POS System Architecture & Folder Directory Breakdown

This document provides a comprehensive overview of the **Takopi / AWS POS** project architecture, its core design patterns, folder directory structure, component responsibilities, and database schema mappings.

---

## 📂 Folder Directory Breakdown

### 📁 Root Directory
- [`package.json`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/package.json) — Project dependencies, build scripts (`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`).
- [`vite.config.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/vite.config.ts) — Vite builder configuration & `@` path aliases.
- [`ai_context.md`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/ai_context.md) — Master AI context reference document with strict dark-mode color guidelines, database schema rules, and storage keys.
- [`components.json`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/components.json) — Shadcn UI configuration file.

---

### 📁 `src/` (Main Application Source)

#### 1. Entry & Layouts
- [`main.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/main.tsx) — Root application entry point. Defines `BrowserRouter` routes, lazy-loaded page chunks, `ProtectedRoute` security guard, and top-level providers (`AuthProvider`, `ConnectionProvider`, `InventoryProvider`).
- [`KioskLayout.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/KioskLayout.tsx) — Clean layout wrapper for the public customer kiosk view.
- [`mainLayout.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/mainLayout.tsx) — Sidebar and header layout wrapper for protected staff and admin routes.
- [`Admin-Dashboard.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/Admin-Dashboard.tsx) — Sales overview analytics dashboard displaying total revenue, orders count, and sales trends.
- [`InventoryPage.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/InventoryPage.tsx) — Staff view for managing ingredients, inventory levels, stock warnings, and recipes.

---

#### 2. 📁 `src/kiosk/` (Public Customer Interface)
- [`KioskView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/kiosk/KioskView.tsx) — The main customer-facing view. Contains sticky category navigation ("Featured", drinks, food), a Merchandise Pre-Order hero banner, food item ordering, floating ticket drawer, and local pre-order button.

---

#### 3. 📁 `src/POS/` (Staff & Cashier Views)
- [`AdminPOSView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/AdminPOSView.tsx) — Main POS cashier terminal where staff directly place orders for walk-in customers or process incoming kiosk tickets.
- [`Ticket.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/Ticket.tsx) — Active order ticket panel showing cart items, thumbnail images, product variants, price calculations, and cash/GCash checkout actions.
- [`menuManagement.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/menuManagement.tsx) — Menu management page to edit product prices, stock status, categories, merchandise toggles, and images.
- [`items.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/items.tsx) — Product grid display for staff cashier selection.
- **Modals**:
  - `addCategory.tsx` — Category creation modal.
  - `addProduct.tsx` — Menu product creation modal.
  - `editProduct.tsx` — Menu product editor modal.
  - `deleteProduct.tsx` — Product deletion confirmation dialog.

---

#### 4. 📁 `src/components/` (Reusable Components)
- **`ui/`**: Low-level, unstyled/styled Radix UI primitives (`Button`, `Card`, `Dialog`, `Drawer`, `Select`, `Table`, `Sheet`, `Sidebar`, `Sonner` toast, etc.).
- **`inventory/`**: Modular sub-components for inventory management:
  - [`InventoryTable.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/inventory/InventoryTable.tsx) — Raw stock levels and reorder alerts.
  - [`RecipeBuilder.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/inventory/RecipeBuilder.tsx) — Maps menu products to required raw ingredients.
  - [`AddProductWizard.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/inventory/AddProductWizard.tsx) — Multi-step wizard to create products with attached recipes.
  - [`ReportsPanel.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/inventory/ReportsPanel.tsx) — Stock usage logs and reports.
- **Top-Level Components**:
  - [`PendingOrdersModal.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/PendingOrdersModal.tsx) — Real-time pop-up notification modal in Admin POS for reviewing and finalizing customer kiosk orders.
  - [`PreOrderModal.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/PreOrderModal.tsx) — Customer form for submitting merchandise pre-orders (size options, customer contact info, payment method).
  - [`MyPreOrdersModal.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/MyPreOrdersModal.tsx) — Persistent drawer allowing customers to track their pre-order statuses on their own device.
  - [`data-table.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/data-table.tsx) — Interactive transactions table with inline payment status mutation (`Paid`, `Pending Verification`, `Cash Pending`, `Unpaid`).
  - [`chart-area-interactive.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/chart-area-interactive.tsx) — Daily sales interactive charts.
  - [`staff-management.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/components/staff-management.tsx) — Staff account creation and permission controls.

---

#### 5. 📁 `src/hooks/` (State & Business Logic)
- [`useKioskOrders.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/hooks/useKioskOrders.ts) — Handles generating sequential 3-digit order numbers (`#001`), syncing active kiosk orders across browser tabs, sending pending orders to Supabase, and finalizing counter payments.
- [`useTransactions.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/hooks/useTransactions.ts) — Manages transaction logs, filtering, status updates, and calculating strict paid-only sales metrics.
- [`useCart.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/hooks/useCart.ts) — Shopping cart item state (adds, removes, quantity adjustments).
- [`use-auth.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/hooks/use-auth.tsx) — Staff authentication context, session storage lock, and role-based permissions (`admin`, `cashier`).
- [`useGCashSettings.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/hooks/useGCashSettings.ts) — Real-time fetching and updating of GCash QR code images and account numbers.

---

#### 6. 📁 `src/context/` (React Context Providers)
- [`InventoryContext.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/context/InventoryContext.tsx) — Centralized state provider for ingredients, recipe mapping, stock deduction on sale, and low-stock alerts.
- [`ConnectionContext.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/context/ConnectionContext.tsx) — Monitors browser online status and backend database connectivity, showing connection banners and retry prompts when network issues arise.

---

#### 7. 📁 `src/lib/` & `src/types/` (Utilities & Type Definitions)
- [`supabase.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/lib/supabase.ts) — Supabase JS client instantiation.
- [`storage.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/lib/storage.ts) — Helpers for uploading product images to Supabase storage buckets.
- [`rateLimiter.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/lib/rateLimiter.ts) — Client-side rate-limiting helper for form submissions.
- [`inventory.ts`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/types/inventory.ts) — TypeScript interfaces for ingredients, recipes, stock logs, and menu products.

---

### 📁 `supabase/` (Database & Schema)
- **`migrations/`**: Contains version-controlled SQL scripts for setting up PostgreSQL tables:
  - `orders` & `order_items` — Stores all customer tickets and merchandise pre-orders.
  - `products`, `product_variants`, `categories` — Menu items & pricing.
  - `ingredients` & `recipes` — Raw material tracking & automatic stock deduction logic.
  - `staff` & `app_settings` — Staff user credentials, roles, and global settings (GCash credentials).

---

## ⚡ Summary Matrix

| Folder | Primary Responsibility |
| :--- | :--- |
| `src/kiosk` | Public self-service customer kiosk UI |
| `src/POS` | Staff cashier checkout terminal & menu controls |
| `src/components` | UI building blocks, modals, tables, and analytics charts |
| `src/hooks` | Order processing, cart state, transaction metrics & auth logic |
| `src/context` | Application-wide inventory state & connection status monitoring |
| `src/lib` | Supabase API connection, storage uploads, and helper utilities |
| `supabase` | Database schema migrations & Row Level Security (RLS) policies |
