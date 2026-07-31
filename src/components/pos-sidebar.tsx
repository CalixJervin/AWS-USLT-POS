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
  CommandIcon,
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
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#E6007E] text-white shadow-md font-bold">
          <CommandIcon className="size-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-[#E2E8F0]">Timpla Cafe</span>
      </SidebarHeader>

      <SidebarContent className="bg-[#1E2333]">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === "/"}
                className={`text-[13px] font-semibold transition-all ${
                  location.pathname === "/" 
                    ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                    : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                }`}
              >
                <Link to="/" onClick={() => setOpenMobile(false)}>
                  <ShoppingCart className={`size-4 ${location.pathname === "/" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                  <span>POS</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === "/kiosk"}
                tooltip="Kiosk Mode"
                className={`text-[13px] font-semibold transition-all ${
                  location.pathname === "/kiosk" 
                    ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                    : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                }`}
              >
                <Link to="/kiosk" onClick={() => setOpenMobile(false)}>
                  <Store className={`size-4 ${location.pathname === "/kiosk" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                  <span>Kiosk Mode</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {user?.role === "admin" && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/dashboard"}
                  tooltip="Dashboard"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/dashboard" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/dashboard" onClick={() => setOpenMobile(false)}>
                    <LayoutDashboard className={`size-4 ${location.pathname === "/dashboard" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {(user?.role === "admin" || user?.canManageInventory) && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/inventory"}
                  tooltip="Inventory"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/inventory" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/inventory" onClick={() => setOpenMobile(false)}>
                    <Package className={`size-4 ${location.pathname === "/inventory" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Inventory</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {(user?.role === "admin" || user?.canManageMenu) && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/menuManagement"}
                  tooltip="Edit Menu"
                  className={`text-[13px] font-semibold transition-all ${
                    location.pathname === "/menuManagement" 
                      ? "bg-[#E6007E]/15 text-[#E6007E] border-l-[3px] border-[#E6007E] rounded-none!" 
                      : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]"
                  }`}
                >
                  <Link to="/menuManagement" onClick={() => setOpenMobile(false)}>
                    <Settings className={`size-4 ${location.pathname === "/menuManagement" ? "text-[#E6007E]" : "text-[#94A3B8]"}`} />
                    <span>Edit Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#232A3B] p-2 bg-[#1E2333]">
        <NavUser onAccountClick={() => setIsAccountOpen(true)} />
      </SidebarFooter>
      
      <SidebarRail />

      <AccountModal isOpen={isAccountOpen} onOpenChange={setIsAccountOpen} />
    </Sidebar>
  )
}