import { StrictMode, lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import KioskLayout from "@/KioskLayout"
import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { InventoryProvider } from "@/context/InventoryContext"

const AdminLayout = lazy(() => import("@/mainLayout"))
const KioskView = lazy(() => import("./kiosk/KioskView"))
const AdminPOSView = lazy(() => import("./POS/AdminPOSView"))
const Dashboard = lazy(() => import("./Admin-Dashboard"))
const Login = lazy(() => import("./Login/Login"))
const InventoryPage = lazy(() => import("./InventoryPage"))
const ManageMenuPage = lazy(() => import("./POS/menuManagement"))

// --- SECURITY GUARD FOR ADMIN & STAFF POS ---
const ProtectedRoute = () => {
  const { user, isLocked } = useAuth()
  const location = useLocation()
  
  if (!user || isLocked) {
    return <Navigate to="/login" replace />
  }

  // Granular Access Control for Admin Sub-routes
  if (location.pathname === "/admin/inventory" && !(user.role === "admin" || user.canManageInventory)) {
    return <Navigate to="/admin" replace />
  }

  if (location.pathname === "/admin/menuManagement" && !(user.role === "admin" || user.canManageMenu)) {
    return <Navigate to="/admin" replace />
  }

  // Dashboard access (Admin only)
  if (location.pathname === "/admin/dashboard" && user.role !== "admin") {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <InventoryProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <TooltipProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                <Routes>
                  
                  {/* DEFAULT KIOSK ROUTE (/) - PUBLIC CUSTOMER INTERFACE */}
                  <Route element={<KioskLayout />}>
                    <Route path="/" element={<KioskView />} />
                  </Route>

                  {/* STAFF LOGIN ROUTE */}
                  <Route path="/login" element={<Login />} />

                  {/* PROTECTED ADMIN POS SYSTEM (/admin) */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<AdminPOSView />} />
                      <Route path="/admin/dashboard" element={<Dashboard />} />
                      <Route path="/admin/inventory" element={<InventoryPage />} />
                      <Route path="/admin/menuManagement" element={<ManageMenuPage />} />
                    </Route>
                  </Route>

                  {/* REDIRECT DEPRECATED / LEGACY ROUTES */}
                  <Route path="/kiosk" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/inventory" element={<Navigate to="/admin/inventory" replace />} />
                  <Route path="/menuManagement" element={<Navigate to="/admin/menuManagement" replace />} />

                  {/* FALLBACK ROUTE TO KIOSK */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </InventoryProvider>
    </AuthProvider>
  </StrictMode>
)
