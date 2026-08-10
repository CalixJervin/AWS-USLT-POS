import * as React from "react"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"
import { AccountModal } from "@/Login/accountModal"
import { useState } from "react"
import { 
  Settings, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Store
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  return (
    <Sidebar {...props} className="border-r border-[#232A3B]">
      <SidebarHeader className="flex h-16 flex-row items-center gap-3 border-b border-[#232A3B] px-4 bg-[#131824]">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#00F2FE]/40 shadow-[0_0_10px_rgba(0,242,254,0.3)] shrink-0 flex items-center justify-center">
          <img 
            src="/takopi.jpg" 
            alt="AWS Logo" 
            className="w-full h-full object-cover scale-135" 
          />
        </div>
        <span className="text-base font-bold tracking-tight text-[#E2E8F0]">AWS</span>
      </SidebarHeader>

      <SidebarContent className="bg-[#1E2333]">
        <SidebarGroup>
          <SidebarMenu>
            {/* POS HOME */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === "/admin"}
                className={`text-[13px] font-semibold transition-all ${
                  location.pathname === "/admin" 
                    ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                    : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                }`}
              >
                <Link to="/admin" onClick={() => setOpenMobile(false)}>
                  <ShoppingCart className={`size-4 ${location.pathname === "/admin" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                  <span>POS</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* DASHBOARD */}
            {user?.role === "admin" && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/admin/dashboard"}
                  tooltip="Dashboard"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/admin/dashboard" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/admin/dashboard" onClick={() => setOpenMobile(false)}>
                    <LayoutDashboard className={`size-4 ${location.pathname === "/admin/dashboard" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* INVENTORY */}
            {(user?.role === "admin" || user?.canManageInventory) && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/admin/inventory"}
                  tooltip="Inventory"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/admin/inventory" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/admin/inventory" onClick={() => setOpenMobile(false)}>
                    <Package className={`size-4 ${location.pathname === "/admin/inventory" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Inventory</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* EDIT MENU */}
            {(user?.role === "admin" || user?.canManageMenu) && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/admin/menuManagement"}
                  tooltip="Edit Menu"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/admin/menuManagement" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/admin/menuManagement" onClick={() => setOpenMobile(false)}>
                    <Settings className={`size-4 ${location.pathname === "/admin/menuManagement" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Edit Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#232A3B] p-2 bg-[#1E2333]">
        <SidebarMenuButton 
                asChild 
                isActive={false}
                tooltip="Open Customer Kiosk"
                className="text-[13px] font-semibold transition-all text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
              >
                <Link to="/" target="_blank" onClick={() => setOpenMobile(false)}>
                  <Store className="size-4 text-[#00F2FE]" />
                  <span>Customer Kiosk</span>
                </Link>
              </SidebarMenuButton>
        <NavUser onAccountClick={() => setIsAccountOpen(true)} />
      </SidebarFooter>
      
      <SidebarRail />

      <AccountModal isOpen={isAccountOpen} onOpenChange={setIsAccountOpen} />
    </Sidebar>
  )
}