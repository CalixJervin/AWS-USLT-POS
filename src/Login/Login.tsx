import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Delete, ArrowLeft, ShieldAlert, Coffee, Clock} from "lucide-react"
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
      setIsMobile(window.innerWidth < 1280)
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
        navigate("/admin/dashboard")
      } else {
        navigate("/admin")
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
          navigate("/admin/dashboard")
        } else {
          navigate("/admin")
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
      // Handle enter
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
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 selection:bg-[#E6007E] selection:text-white relative overflow-hidden">

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-2xl bg-[#131824] rounded-3xl shadow-[0_0_50px_rgba(230,0,126,0.15)] overflow-hidden border-2 border-[#E6007E]/30 relative z-10">
        
        {/* HEADER WITH VIVID PINK BRANDING & NEON BLUE TOUCHES */}
        <div className="bg-[#1E2333] p-6 flex items-center justify-between border-b border-[#232A3B]">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl  text-white font-bold">
              <img 
                  src="takopi.jpg" 
                  alt="AWS Logo" 
                  className="size-15 object-contain" 
                />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#E2E8F0]">
                AWS-SBG              </h1>
              <p className="text-xs font-semibold text-[#00F2FE] tracking-wide uppercase">
                POS & Kiosk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#131824] px-3.5 py-1.5 rounded-full border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-bold shadow-inner">
            <Clock className="h-4 w-4 text-[#E6007E]" />
            <span>POS SYSTEM</span>
          </div>
        </div>

        <div className="p-8 relative min-h-[520px] flex flex-col bg-[#0B0E14]/50">
          <AnimatePresence mode="wait">
            
            {/* ONBOARDING */}
            {view === "onboarding" && (
              <motion.div key="onboarding" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col h-full flex-1 max-w-sm mx-auto w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-[#E2E8F0]">Welcome!</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">Let's set up your first Admin account.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Admin Name</label>
                    <Input 
                      placeholder="e.g. Maria" 
                      value={adminName} 
                      onChange={(e) => setAdminName(e.target.value)}
                      className="h-12 bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] focus-visible:ring-[#E6007E]"
                      disabled={isOnboarding}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Create PIN (4-6 digits)</label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••" 
                      value={adminPin} 
                      onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-12 text-center tracking-widest bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] focus-visible:ring-[#00F2FE]"
                      disabled={isOnboarding}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Confirm PIN</label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••" 
                      value={confirmPin} 
                      onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-12 text-center tracking-widest bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] focus-visible:ring-[#00F2FE]"
                      disabled={isOnboarding}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 text-base font-black mt-6 bg-[#E6007E] hover:bg-[#FF1A96] text-white shadow-[0_0_20px_rgba(230,0,126,0.4)] border border-[#00F2FE]/40 cursor-pointer" 
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-[#E2E8F0] tracking-wide">Who is working right now?</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-fr">
                  {staffList.map((staff) => (
                    <button 
                      key={staff.id}
                      onClick={() => { setSelectedStaff(staff); setView("pin"); }}
                      className="w-full flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-[#2D3448] bg-[#1E2333] hover:bg-[#282E42] hover:border-[#E6007E] shadow-lg hover:shadow-[0_0_20px_rgba(230,0,126,0.25)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-md bg-[#E6007E]/20 text-[#E6007E] border border-[#E6007E]/40 group-hover:border-[#00F2FE] group-hover:text-[#00F2FE] group-hover:bg-[#00F2FE]/20 transition-all">
                        {staff.avatarInitials}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-base text-[#E2E8F0] group-hover:text-[#00F2FE] transition-colors">{staff.name}</p>
                        <p className="text-xs text-[#94A3B8] capitalize flex items-center justify-center gap-1.5 mt-1 font-semibold">
                          {staff.role === 'admin' ? <ShieldAlert className="h-3.5 w-3.5 text-[#00F2FE]" /> : <Coffee className="h-3.5 w-3.5 text-[#E6007E]" />}
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
                <div className="w-full flex items-center justify-between mb-6">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full text-[#94A3B8] hover:text-[#00F2FE] hover:bg-[#1E2333] cursor-pointer" 
                    onClick={() => { logout(); setView("select"); setPin(""); }}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <span className="font-black text-xl text-[#E2E8F0]">Hi, {selectedStaff.name} 👋</span>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Enter your PIN to sign in</p>
                  </div>
                  <div className="w-10" />
                </div>

                {/* PIN DOTS WITH VIVID PINK GLOW */}
                <div className="flex gap-4 mb-8">
                  {[...Array(pin.length || 4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-4 w-4 rounded-full transition-all duration-200 ${
                        i < pin.length 
                          ? "bg-[#E6007E] scale-110 shadow-[0_0_12px_#E6007E]" 
                          : "bg-[#2D3448] border border-[#1E2333]"
                      }`} 
                    />
                  ))}
                </div>

                {/* NUMERIC KEYPAD WITH NEON BLUE BORDER HOVER */}
                <div className="grid grid-cols-3 gap-3.5 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button 
                      key={num} 
                      variant="outline" 
                      onClick={() => handleKeyPress(num.toString())} 
                      className="h-14 text-2xl font-black rounded-xl bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] hover:border-[#00F2FE] hover:text-[#00F2FE] hover:bg-[#282E42] hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
                    >
                      {num}
                    </Button>
                  ))}
                  <div />
                  <Button 
                    variant="outline" 
                    onClick={() => handleKeyPress("0")} 
                    className="h-14 text-2xl font-black rounded-xl bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] hover:border-[#00F2FE] hover:text-[#00F2FE] hover:bg-[#282E42] hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
                  >
                    0
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleDelete} 
                    className="h-14 rounded-xl text-[#FF3366] hover:bg-[#FF3366]/15 cursor-pointer"
                  >
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
