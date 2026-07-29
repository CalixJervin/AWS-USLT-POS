import { lazy, Suspense } from "react"
import { SiteHeader } from "@/components/site-header"
import { useTransactions } from "./hooks/useTransactions"
import { useInventory } from "./context/InventoryContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"

const ChartAreaInteractive = lazy(() => import("@/components/chart-area-interactive").then(m => ({ default: m.ChartAreaInteractive })))
const DataTable = lazy(() => import("@/components/data-table").then(m => ({ default: m.DataTable })))
const SectionCards = lazy(() => import("@/components/section-cards").then(m => ({ default: m.SectionCards })))
const StaffManagement = lazy(() => import("@/components/staff-management").then(m => ({ default: m.StaffManagement })))

export default function Page() {
  const { isLoading: txLoading } = useTransactions()
  const { isLoading: invLoading } = useInventory()
  const { user } = useAuth()

  if (txLoading || invLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#EDE5DA]">
      <div className="bg-[#E8DFD3] border-b border-[#D4C9BB]">
        <SiteHeader>
          <h1 className="text-sm font-bold text-[#1C1412]">Dashboard</h1>
        </SiteHeader>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-8">
            
            <Suspense fallback={<div className="px-4"><Skeleton className="h-[400px] w-full" /></div>}>
              <SectionCards />
            </Suspense>

            <div className="px-4 lg:px-6">
              <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
                <ChartAreaInteractive />
              </Suspense>
            </div>
            
            <Suspense fallback={<div className="px-4"><Skeleton className="h-[500px] w-full" /></div>}>
              <DataTable />
            </Suspense>

            {user?.role === "admin" && (
              <div className="px-4 lg:px-6">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <StaffManagement />
                </Suspense>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}
