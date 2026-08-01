import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface SiteHeaderProps {
  children?: React.ReactNode
  isKiosk?: boolean
}

export function SiteHeader({ children, isKiosk = false }: SiteHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16 sticky top-0 z-20 bg-[#131824] border-b border-[#232A3B]">
      <div className="flex w-full items-center gap-1 px-4 xl:gap-2 xl:px-6">
        {!isKiosk && (
          <>
            <SidebarTrigger className="-ml-1 text-[#E2E8F0] hover:text-[#00F2FE]" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 bg-[#2D3448]"
            />
          </>
        )}
        
        {/* We use justify-between so the Ticket sits on the left, and Search sits on the right */}
        <div className="flex flex-1 items-center justify-between">
          {children}
        </div>
      </div>
    </header>
  )
}