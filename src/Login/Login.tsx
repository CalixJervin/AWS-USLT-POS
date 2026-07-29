import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Delete, ArrowLeft, ShieldAlert, Coffee, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import type { Staff } from "@/hooks/use-auth"

export default function LoginPage() {
  const navigate = useNavigate()
  const { 
    user, 
    staffList, 
    isLocked, 
    isInitialSetup, 
    login, 
    unlock, 
    addStaff,
    logout 
  } = useAuth()
  
  const [view, setView] = useState<"onboarding" | "select" | "pin">("select")
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [pin, setPin] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Onboarding State
  const [adminName, setAdminName] = useState("")
  const [adminPin, setAdminPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")

  useEffect(() => {
    if (isInitialSetup) {
      setView("onboarding")
    } else if (user && !isLocked) {
      if (user.role === "admin") {
        navigate("/dashboard")
      } else {
        navigate("/")
      }
    } else if (isLocked && user) {
      setSelectedStaff(user)
      setView("pin")
    } else {
      setView("select")
    }
  }, [isInitialSetup, user, isLocked, navigate])

  const handleKeyPress = useCallback((num: string) => {
    setPin(prev => {
      if (prev.length < 6) {
        return prev + num
      }
      return prev
    })
  }, [])

  const handleDelete = useCallback(() => setPin(prev => prev.slice(0, -1)), [])

  const handleLogin = useCallback(async () => {
    if (!selectedStaff || pin.length < 4) return
    
    setIsVerifying(true)
    try {
      const result = isLocked && user?.id === selectedStaff.id 
        ? await unlock(pin)
        : await login(selectedStaff.id, pin)
      
      if (result.success) {
        toast.success(result.message)
        setPin("")
        if (selectedStaff.role === "admin") {
          navigate("/dashboard")
        } else {
          navigate("/")
        }
      } else {
        toast.error(result.message)
        setPin("")
      }
    } catch (error) {
      toast.error("An unexpected error occurred during login")
    } finally {
      setIsVerifying(false)
    }
  }, [selectedStaff, pin, isLocked, user, unlock, login, navigate])

  // Keyboard support for PIN pad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== "pin" || isVerifying) return

      // Handle numbers
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key)
      } 
      // Handle backspace
      else if (e.key === "Backspace") {
        handleDelete()
      }
      // Handle enter (manual submit if needed, though auto-submit is active)
      else if (e.key === "Enter") {
        if (pin.length >= 4) {
          handleLogin()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [view, pin, handleKeyPress, handleDelete, handleLogin, isVerifying])

  // Auto-submit when PIN length is sufficient (assuming 4-6 digits)
  useEffect(() => {
    if (pin.length >= 4 && selectedStaff && view === "pin" && !isVerifying) {
      const timer = setTimeout(() => {
        handleLogin()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pin, selectedStaff, view, isVerifying, handleLogin])

  const handleOnboarding = async () => {
    if (!adminName.trim()) return toast.error("Please enter your name")
    if (adminPin.length < 4) return toast.error("PIN must be at least 4 digits")
    if (adminPin !== confirmPin) return toast.error("PINs do not match")

    setIsOnboarding(true)
    try {
      const result = await addStaff({
        name: adminName.trim(),
        role: "admin",
        avatarColor: "bg-primary"
      }, adminPin)

      if (result.success) {
        toast.success("Admin account created! Please login.")
        setAdminName("")
        setAdminPin("")
        setConfirmPin("")
        setView("select")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create admin account")
    } finally {
      setIsOnboarding(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 selection:bg-transparent">
      <div className="w-full max-w-2xl bg-background rounded-3xl shadow-2xl overflow-hidden border">
        
        <div className="bg-primary/5 p-6 flex items-center justify-between border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timpla Cafe</h1>
            <p className="text-sm text-muted-foreground">Point of Sale System</p>
          </div>
          <Clock className="h-6 w-6 text-muted-foreground opacity-50" />
        </div>

        <div className="p-8 relative min-h-[520px] flex flex-col">
          <AnimatePresence mode="wait">
            
            {/* ONBOARDING */}
            {view === "onboarding" && (
              <motion.div key="onboarding" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col h-full flex-1 max-w-sm mx-auto w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Welcome!</h2>
                  <p className="text-muted-foreground">Let's set up your first Admin account.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Name</label>
                    <Input 
                      placeholder="e.g. Maria" 
                      value={adminName} 
                      onChange={(e) => setAdminName(e.target.value)}
                      className="h-12"
                      disabled={isOnboarding}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Create PIN (4-6 digits)</label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••" 
                      value={adminPin} 
                      onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-12 text-center tracking-widest"
                      disabled={isOnboarding}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm PIN</label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••" 
                      value={confirmPin} 
                      onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-12 text-center tracking-widest"
                      disabled={isOnboarding}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 text-lg mt-6" 
                    onClick={handleOnboarding}
                    disabled={isOnboarding}
                  >
                    {isOnboarding ? "Creating Account..." : "Create Admin Account"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STAFF SELECTION */}
            {view === "select" && (
              <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full flex-1">
                <h2 className="text-xl font-semibold mb-6">Who is working right now?</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-fr">
                  {staffList.map((staff) => (
                    <button 
                      key={staff.id}
                      onClick={() => { setSelectedStaff(staff); setView("pin"); }}
                      className="w-full flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-transparent bg-muted/50 hover:bg-muted hover:border-primary/20 shadow-sm transition-all active:scale-95"
                    >
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm bg-primary/10 text-primary`}>
                        {staff.avatarInitials}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{staff.name}</p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center justify-center gap-1 mt-1">
                          {staff.role === 'admin' ? <ShieldAlert className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                          {staff.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PIN PAD */}
            {view === "pin" && selectedStaff && (
              <motion.div key="pin-pad" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center flex-1 max-w-sm mx-auto w-full">
                <div className="w-full flex items-center justify-between mb-8">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { logout(); setView("select"); setPin(""); }}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <span className="font-semibold text-xl">Hi, {selectedStaff.name} 👋</span>
                    <p className="text-sm text-muted-foreground">Enter your PIN</p>
                  </div>
                  <div className="w-10" />
                </div>

                <div className="flex gap-4 mb-8">
                  {[...Array(pin.length || 4)].map((_, i) => (
                    <div key={i} className={`h-4 w-4 rounded-full transition-all duration-200 ${i < pin.length ? "bg-primary scale-110 shadow-sm" : "bg-muted-foreground/20"}`} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button key={num} variant="outline" onClick={() => handleKeyPress(num.toString())} className="h-16 text-2xl font-medium rounded-2xl">
                      {num}
                    </Button>
                  ))}
                  <div />
                  <Button variant="outline" onClick={() => handleKeyPress("0")} className="h-16 text-2xl font-medium rounded-2xl">
                    0
                  </Button>
                  <Button variant="ghost" onClick={handleDelete} className="h-16 rounded-2xl">
                    <Delete className="h-6 w-6" />
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <Toaster 
        richColors 
        position={isMobile ? "bottom-center" : "top-right"} 
        expand={false}
      />
    </div>
  )
}
