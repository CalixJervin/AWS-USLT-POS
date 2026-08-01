import { lazy, Suspense } from "react"

const KioskView = lazy(() => import("@/kiosk/KioskView"))
const AdminPOSView = lazy(() => import("@/POS/AdminPOSView"))

export default function POS({ isKiosk = false }: { isKiosk?: boolean }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-[#0B0E14]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6007E]"></div></div>}>
      {isKiosk ? <KioskView /> : <AdminPOSView />}
    </Suspense>
  )
}
