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
  CommandIcon
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  return (
    <Sidebar {...props} className="border-r-[rgba(255,255,255,0.06)]">
      <SidebarHeader className="flex h-16 flex-row items-center gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 bg-[#140F0D]">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white/10 text-white shadow-sm">
          <CommandIcon className="size-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-white">Timpla Cafe</span>
      </SidebarHeader>

      <SidebarContent className="bg-[#1C1412]">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === "/"}
                className={`text-[13px] font-medium transition-all ${
                  location.pathname === "/" 
                    ? "bg-white/8 text-white border-l-[3px] border-[#D4A574] rounded-none!" 
                    : "text-[#C4A882] hover:text-white hover:bg-white/5"
                }`}
              >
                <Link to="/" onClick={() => setOpenMobile(false)}>
                  <ShoppingCart className={`size-4 ${location.pathname === "/" ? "text-white" : "text-[#C4A882]"}`} />
                  <span>POS</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {user?.role === "admin" && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/dashboard"}
                  tooltip="Dashboard"
                  className={`text-[13px] font-medium transition-all ${
                    location.pathname === "/dashboard" 
                      ? "bg-white/8 text-white border-l-[3px] border-[#D4A574] rounded-none!" 
                      : "text-[#C4A882] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Link to="/dashboard" onClick={() => setOpenMobile(false)}>
                    <LayoutDashboard className={`size-4 ${location.pathname === "/dashboard" ? "text-white" : "text-[#C4A882]"}`} />
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
                  className={`text-[13px] font-medium transition-all ${
                    location.pathname === "/inventory" 
                      ? "bg-white/8 text-white border-l-[3px] border-[#D4A574] rounded-none!" 
                      : "text-[#C4A882] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Link to="/inventory" onClick={() => setOpenMobile(false)}>
                    <Package className={`size-4 ${location.pathname === "/inventory" ? "text-white" : "text-[#C4A882]"}`} />
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
                  className={`text-[13px] font-medium transition-all ${
                    location.pathname === "/menuManagement" 
                      ? "bg-white/8 text-white border-l-[3px] border-[#D4A574] rounded-none!" 
                      : "text-[#C4A882] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Link to="/menuManagement" onClick={() => setOpenMobile(false)}>
                    <Settings className={`size-4 ${location.pathname === "/menuManagement" ? "text-white" : "text-[#C4A882]"}`} />
                    <span>Edit Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[rgba(255,255,255,0.07)] p-2 bg-[#1C1412]">
        <NavUser onAccountClick={() => setIsAccountOpen(true)} />
      </SidebarFooter>
      
      <SidebarRail />

      <AccountModal isOpen={isAccountOpen} onOpenChange={setIsAccountOpen} />
    </Sidebar>
  )
}