import { Outlet } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { useState, useEffect } from "react"
import { KioskProvider } from "@/context/KioskContext"

/**
 * Dedicated Layout for Customer Kiosk mode.
 * Completely removes admin sidebars, headers, and navigation links
 * to ensure a fully isolated, closed-loop kiosk experience.
 */
export default function KioskLayout() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <KioskProvider>
      <div className="h-screen w-screen overflow-hidden bg-[#0B0E14] flex flex-col">
        <Outlet />
        <Toaster 
          richColors 
          position={isMobile ? "bottom-center" : "top-right"} 
          expand={false}
        />
      </div>
    </KioskProvider>
  )
}
