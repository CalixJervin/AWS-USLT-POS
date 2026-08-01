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
      <div className="flex flex-1 items-center justify-center bg-[#0B0E14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6007E]"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#0B0E14]">
      <div className="bg-[#131824] border-b border-[#232A3B]">
        <SiteHeader>
          <h1 className="text-sm font-bold text-[#E2E8F0]">Dashboard</h1>
        </SiteHeader>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 xl:gap-10 xl:py-8">
            
            <Suspense fallback={<div className="px-4"><Skeleton className="h-[400px] w-full bg-[#1E2333]" /></div>}>
              <SectionCards />
            </Suspense>

            <div className="px-4 xl:px-6">
              <Suspense fallback={<Skeleton className="h-[350px] w-full bg-[#1E2333]" />}>
                <ChartAreaInteractive />
              </Suspense>
            </div>
            
            <Suspense fallback={<div className="px-4"><Skeleton className="h-[500px] w-full bg-[#1E2333]" /></div>}>
              <DataTable />
            </Suspense>

            {user?.role === "admin" && (
              <div className="px-4 xl:px-6">
                <Suspense fallback={<Skeleton className="h-[400px] w-full bg-[#1E2333]" />}>
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
