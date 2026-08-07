import { lazy, Suspense, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { useTransactions } from "./hooks/useTransactions"
import { useInventory } from "./context/InventoryContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RotateCcw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

const ChartAreaInteractive = lazy(() => import("@/components/chart-area-interactive").then(m => ({ default: m.ChartAreaInteractive })))
const DataTable = lazy(() => import("@/components/data-table").then(m => ({ default: m.DataTable })))
const SectionCards = lazy(() => import("@/components/section-cards").then(m => ({ default: m.SectionCards })))
const StaffManagement = lazy(() => import("@/components/staff-management").then(m => ({ default: m.StaffManagement })))

export default function Page() {
  const { isLoading: txLoading } = useTransactions()
  const { isLoading: invLoading } = useInventory()
  const { user } = useAuth()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const handleResetKioskCounter = async () => {
    try {
      localStorage.removeItem("timpla_kiosk_order_counter")

      try {
        const bc = new BroadcastChannel("timpla_kiosk_channel")
        bc.postMessage({ type: "RESET_KIOSK_COUNTER" })
        bc.close()
      } catch (e) {
        console.warn("BroadcastChannel not supported", e)
      }

      // Persist counter reset to Supabase app_settings so all physical devices reset counter
      try {
        await supabase.from("app_settings").upsert({ key: "kiosk_order_counter", value: { counter: 1, resetAt: new Date().toISOString() } }, { onConflict: "key" })
      } catch (e) {}

      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new Event("timpla_kiosk_counter_reset"))

      toast.success("Kiosk ticket counter reset to #001!")
    } catch (err) {
      console.error("Failed to reset kiosk counter:", err)
      toast.error("Failed to reset kiosk counter")
    } finally {
      setIsResetDialogOpen(false)
    }
  }

  if (txLoading || invLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0B0E14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6007E]"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-[#0B0E14] relative">
      <div className="sticky top-0 z-50 bg-[#131824] border-b border-[#232A3B] shrink-0 select-none">
        <SiteHeader>
          <div className="flex w-full items-center justify-between">
            <h1 className="text-sm font-bold text-[#E2E8F0]">Dashboard</h1>

            {user?.role === "admin" && (
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs gap-1.5 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Kiosk Counter</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#131824] border-[#232A3B] text-[#E2E8F0] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Reset Kiosk Ticket Counter?
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm pt-2">
                      Are you sure? This resets the Kiosk ticket counter to <strong className="text-white font-mono">#001</strong> for launch day operations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2 text-xs text-red-300/80 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                    ⚠️ This action clears the saved kiosk counter in local storage and broadcasts a reset signal to active kiosk tabs.
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setIsResetDialogOpen(false)}
                      className="text-[#94A3B8] hover:text-white hover:bg-[#1E2333]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={handleResetKioskCounter}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                      Confirm Reset
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </SiteHeader>
      </div>
      {/* Scrollable Dashboard Body */}
      <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar overscroll-contain touch-pan-y">
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
