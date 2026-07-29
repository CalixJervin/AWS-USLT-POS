import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/pos-sidebar"
import { useAuth } from "@/hooks/use-auth"
import { Toaster } from "@/components/ui/sonner"
import { useState, useEffect } from "react"

export default function MainLayout() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <SidebarProvider defaultOpen={isAdmin}>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        <Outlet /> 
      </SidebarInset>
      <Toaster 
        richColors 
        position={isMobile ? "bottom-center" : "top-right"} 
        expand={false}
      />
    </SidebarProvider>
  )
}