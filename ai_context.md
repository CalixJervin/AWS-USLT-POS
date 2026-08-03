# Master AI System Context & Rules

> **CRITICAL RULE FOR ALL AI AGENTS**:  
> You MUST read and strictly adhere to this document (`ai_context.md`) before generating new code, modifying components, or proposing architectural changes in this codebase.

---

## 1. Project Overview & Tech Stack

### Project Overview
This codebase is a **unified Point of Sale (POS) and Customer-Facing Kiosk Web Application** built for our student organization (**Takopi / AWS POS**). 
It supports two main operating modes:
1. **Public Customer Kiosk (`/`)**: A self-service ordering interface designed for fast customer browsing, visual menu navigation, merch pre-orders, custom order numbers, and pay-at-counter tickets.
2. **Protected Staff & Admin POS (`/admin`)**: A comprehensive management interface for staff transaction processing, real-time pending kiosk order notifications, inventory tracking, recipe management, GCash verification, staff management, and dashboard analytics.

### Technology Stack
- **Core Framework**: React 19 with Vite 7 and TypeScript.
- **Styling**: Tailwind CSS v4 with custom color tokens and utility layers.
- **UI Components**: Radix UI primitives / Shadcn UI components with Lucide icons & Framer Motion animations.
- **Routing**: `react-router-dom` v7 with lazy-loaded route chunking.
- **Database & Backend**: Supabase PostgreSQL (`orders`, `order_items`, `products`, `product_variants`, `ingredients`, `recipes`, `staff`, `app_settings`).
- **State & Real-Time Sync**: Shared custom hooks (`useCart`, `useInventory`, `useKioskOrders`, `useGCashSettings`, `useMyPreOrders`, `useTransactions`) backed by local storage caching and multi-tab `BroadcastChannel` bridges (`timpla_kiosk_channel`, `timpla_my_preorders_channel`, `timpla_gcash_channel`).

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
| **Danger / Warning** | `#FF3366` | Out-of-stock badges, delete buttons, and warning text |
| **Primary Text** | `#E2E8F0` | High-contrast off-white text |
| **Muted Text** | `#94A3B8` / `#64748B` | Secondary labels, item counts, and placeholders |

- **Corner Radius**: Product cards use `rounded-2xl` (`20px`), modal dialogs use `rounded-2xl`, category pills use `rounded-full`.
- **Theme Guarantee**: NEVER introduce light mode or white backgrounds.

---

## 2. Architecture & View Isolation

### Decoupled View Architecture
To prevent "kiosk escapes" and isolate public UI from admin controls, Kiosk and POS views are strictly decoupled into separate top-level files:

- **Customer Kiosk (`/`)**:
  - Main Component: [`src/kiosk/KioskView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/kiosk/KioskView.tsx)
  - Layout Wrapper: `KioskLayout`
  - Features:
    - Sticky top header (`SiteHeader`).
    - Sticky category navigation bar (`sticky top-0 z-40 bg-[#0B0E14]`) with container-isolated scroll spy.
    - **Top Carousel Section**: Merch / Pre-Order items ONLY (`isPreOrder === true` or category/type `"merch"`).
    - **Main Menu List Below**: Food & beverage on-hand items ONLY (excludes merch items).
    - Floating bottom ticket bar & mobile sheet drawer.
    - Persistent **"My Pre-Orders"** drawer button near search bar (`<MyPreOrdersModalButton />`), strictly saved per customer device.

- **Staff & Admin POS (`/admin`)**:
  - Main Component: [`src/POS/AdminPOSView.tsx`](file:///C:/Users/User/Desktop/AWS%20POS/Client-Project/src/POS/AdminPOSView.tsx)
  - Layout Wrapper: `AdminLayout` protected by `ProtectedRoute`
  - Sub-routes:
    - `/admin/dashboard` (`Admin-Dashboard.tsx`) - Sales analytics charts and daily summary metrics.
    - `/admin/inventory` (`InventoryPage.tsx`) - Ingredient stock tracking, recipe management, and reorder levels.
    - `/admin/menuManagement` (`menuManagement.tsx`) - Menu item creation, category management, pricing, and merch toggle.
  - Features:
    - Pending Kiosk order modal badge (`<PendingOrdersModal />`), LiveClock, "+ Add Category" button, right-side transaction panel, inventory table management.
    - **"My Pre-Orders" button is strictly excluded** from Admin POS view.

---

## 3. Order Types & System Workflows

### 1. Merchandise Pre-Order Workflow (`<PreOrderModal />`)
- Clicking any merchandise item opens `<PreOrderModal />` rather than adding directly to the food cart ticket.
- Features item banner preview, shirt size selector (`XS`, `S`, `M`, `L`, `XL`, `2XL`, `3XL`), required customer contact inputs (`Name`, `Phone`, `Email`), and payment method selection (`Cash`, `GCash`, `Pay Later`).
- **Storage & Isolation**: Pre-orders are saved to `timpla_my_saved_preorders` for customer device persistence and inserted into Supabase `orders` with `fulfillment_status = 'pre_ordered'`.
- **Pending Kiosk Orders Excluded**: Pre-orders do NOT go to `timpla_kiosk_pending_orders` or the Pending Kiosk Orders modal (`<PendingOrdersModal />`).

### 2. Immediate Food & Beverage Kiosk Orders (`<TicketSidebar />` / `useKioskOrders`)
- Adding food/beverage items builds a cart ticket.
- Clicking "Checkout" generates a sequential 3-digit counter order ticket (e.g., `#042`).
- Saved in `timpla_kiosk_pending_orders` and Supabase `orders` with `status = 'pending_counter'` and `fulfillment_status = 'pending'`.
- Displayed in real-time in staff POS `<PendingOrdersModal />`.

### 3. Payment Methods & Verification
- **Cash / Counter**: Logs ticket with `paymentStatus: "Cash Pending"` and `status: "pending_counter"`.
- **GCash**: Displays QR Code image (synced cross-device via Supabase `app_settings`) and account number with copy button. Requires 13-digit reference number. Submitting sets status to `paymentStatus: "Pending Verification"`.
- **Pay Later**: Available strictly under GCash pre-orders. Sets `paymentStatus: "Unpaid"` and `status: "unpaid"`. Customers can pay later via their "My Pre-Orders" drawer.

### 4. Real-Time Active Ticket Clearing
- When staff clicks **"Finalize Payment"** on Admin POS (`/admin`), `finalizePendingOrder` updates the existing order to `status: "completed"`, clears `activeKioskOrder` in `localStorage`, and broadcasts a `SYNC_PENDING_ORDERS` message via `BroadcastChannel` and `storage` events.
- On the customer's Kiosk screen, the active ticket banner (e.g. `#042`) and confirmation modal automatically clear in real-time.

---

## 4. Anti-Duplication & Bidirectional Sync Engine

### 1. Duplicate Transaction Prevention
- **Database ID Synchronization**: Upon creating a pre-order in Supabase, the generated DB UUID is immediately synced to local storage pre-orders (`timpla_my_saved_preorders`).
- **No Blank Fallback Rows**: Removed empty fallback insertions (`{ total, status }`) to prevent anonymous ghost orders without customer contact details.
- **Direct Order Finalization**: `finalizePendingOrder` updates existing DB records directly preserving `customer_name`, `customer_email`, `customer_phone`, and `order_number`, eliminating duplicate `create_complete_order` RPC invocations.
- **Intelligent Transaction Deduplication**: `useTransactions.ts` deduplicates transactions by matching exact IDs or order numbers (`#PO-`), merging contact details and removing redundant generic entries (`#ORD-`).

### 2. Bidirectional Deletion Synchronization
- **Customer Cancellation $\rightarrow$ Admin Data Table**: When a customer cancels a pre-order on their device via `cancelMyPreOrder(orderId, orderNumber)`, the record is deleted from Supabase `orders` by both `order_number` and `id`. A broadcast message triggers `fetchTransactions()` on Admin POS to immediately remove it from the Data Table.
- **Admin Data Table Deletion $\rightarrow$ Customer Device**: When an admin deletes a pre-order record from the Data Table (`deleteTransaction` / `deleteSelectedTransactions` / `clearTransactions`), the order is removed from Supabase and a `PREORDER_DELETED` / `ALL_PREORDERS_CLEARED` event is broadcasted.
- **Remote Validity Sync (`checkRemoteValidity`)**: When a customer opens their "My Pre-Orders" drawer, `useMyPreOrders` verifies saved local pre-orders against Supabase `orders` and automatically purges any records that were deleted remotely by staff.

---

## 5. Storage & Channel Reference

### LocalStorage Keys Registry

| Key | Scope | Purpose |
| :--- | :--- | :--- |
| `timpla_kiosk_pending_orders` | POS / Kiosk | List of active, un-finalized food/beverage kiosk orders (`status: "pending_counter"`) |
| `timpla_my_saved_preorders` | Customer Device | Persisted list of customer's merchandise pre-orders (`#PO-XXXX`) |
| `timpla_active_kiosk_order` | Customer Tab | Active kiosk order banner persistence for current customer session |
| `timpla_kiosk_order_counter` | Kiosk | Sequential ticket number counter (resets after `#999`) |
| `timpla_cart` | Local Tab | Current active cart items state |

### BroadcastChannel Bridges

| Channel Name | Message Types | Purpose |
| :--- | :--- | :--- |
| `timpla_kiosk_channel` | `SYNC_PENDING_ORDERS` | Syncs pending kiosk order badges and clears active ticket banners across tabs |
| `timpla_my_preorders_channel` | `PREORDER_SAVED`, `PREORDER_CANCELLED`, `PREORDER_DELETED`, `ALL_PREORDERS_CLEARED` | Bidirectional real-time pre-order sync between Kiosk customer devices and Admin POS |
| `timpla_gcash_channel` | `GCASH_SETTINGS_UPDATED` | Instant cross-tab sync of GCash QR Code and account number changes |

---

## 6. Supabase SQL Schema Reference

Execute the following in Supabase SQL Editor to establish or verify system schema:

```sql
-- App Settings Table (GCash QR & Account Number)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on app_settings"
    ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Allow public insert and update on app_settings"
    ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES ('gcash_settings', '{"gcashNumber": "0917-123-4567", "gcashQrImage": ""}')
ON CONFLICT (key) DO NOTHING;

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT,
    total NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_counter',
    payment_method TEXT DEFAULT 'cash',
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    fulfillment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT,
    variant_id TEXT,
    product_name TEXT NOT NULL,
    size TEXT DEFAULT 'Regular',
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 7. Instructions for AI Coding Assistants

- Always inspect existing custom hooks (`useCart`, `useInventory`, `useKioskOrders`, `useGCashSettings`, `useMyPreOrders`, `useTransactions`) before creating new state logic.
- Run `npx tsc --noEmit` and `npm run build` after file edits to verify type safety and bundle compilation.
- Maintain documentation integrity and preserve existing docstrings.
