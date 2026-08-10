import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronRight, ChevronLeft } from "lucide-react"

interface TakopiMascotHintProps {
  containerRef?: React.RefObject<HTMLElement | null>
}

interface HintItem {
  id: string
  title: string
  difficulty: string
  color: string
  badgeBg: string
  text: string
  codeSnippet?: string
}

const HINTS: HintItem[] = [
  {
    id: "intro",
    title: "Pupu! Welcome Secret Hunter!",
    difficulty: "OVERVIEW",
    color: "from-[#00F2FE] to-[#4FACFE]",
    badgeBg: "bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/40",
    text: "You found me all the way down here! Did you know this system holds forgotten secrets that gives out rewards? Only curious minds who look beyond what is visible will find them...",
  },
  {
    id: "1",
    title: "Secret #1",
    difficulty: "1",
    color: "from-emerald-400 to-green-500",
    badgeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    text: "Hint: What you see on your screen is just a surface reflection. Behind the walls of code, something is whispered in secret comments... How would you inspect the secret?",
  },
  {
    id: "2",
    title: "Secret #2",
    difficulty: "2",
    color: "from-amber-400 to-orange-500",
    badgeBg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    text: "Hint: Are you searching for the deep-sea delicacy? It's strictly off-menu! The true name of the dish is buried in the reef, but somehow it looks weird?",
  },
  {
    id: "3",
    title: "Secret #3",
    difficulty: "3",
    color: "from-[#E6007E] to-[#FF1A96]",
    badgeBg: "bg-[#E6007E]/20 text-[#FF1A96] border-[#E6007E]/40",
    text: "Hint: A good octopus knows how to camouflage and hide away from predators and I need to be extra careful as I may know some secrets. I don't want to die!!",
  },
  
]

export function TakopiMascotHint({ containerRef }: TakopiMascotHintProps) {
  const [isFullyAtBottom, setIsFullyAtBottom] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentHintIndex, setCurrentHintIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")

  // Scroll detection callback
  const checkScroll = useCallback(() => {
    if (containerRef?.current) {
      const el = containerRef.current
      const scrollPosition = el.scrollTop + el.clientHeight
      const targetBottom = el.scrollHeight
      // Trigger when user is within 40px of absolute bottom
      const atBottom = scrollPosition >= targetBottom - 40
      setIsFullyAtBottom(atBottom)
    } else {
      const scrollY = window.scrollY || window.pageYOffset
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      const atBottom = scrollY + windowHeight >= docHeight - 40
      setIsFullyAtBottom(atBottom)
    }
  }, [containerRef])

  useEffect(() => {
    checkScroll()

    const el = containerRef?.current
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true })
      return () => el.removeEventListener("scroll", checkScroll)
    } else {
      window.addEventListener("scroll", checkScroll, { passive: true })
      return () => window.removeEventListener("scroll", checkScroll)
    }
  }, [containerRef, checkScroll])

  // Typewriter effect when hint changes or modal opens
  useEffect(() => {
    if (!isOpen) return
    setDisplayedText("")
    const currentText = HINTS[currentHintIndex].text
    let index = 0
    const timer = setInterval(() => {
      if (index < currentText.length) {
        setDisplayedText(currentText.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, 15)
    return () => clearInterval(timer)
  }, [currentHintIndex, isOpen])

  const handleNext = () => {
    setCurrentHintIndex((prev) => (prev + 1) % HINTS.length)
  }

  const handlePrev = () => {
    setCurrentHintIndex((prev) => (prev - 1 + HINTS.length) % HINTS.length)
  }

  const currentHint = HINTS[currentHintIndex]

  return (
    <>
      {/* 1. SLIGHTLY APPEARING MASCOT AT THE MOST BOTTOM RIGHT (ONLY AT VERY BOTTOM) */}
      <AnimatePresence>
        {isFullyAtBottom && !isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-0 right-3 sm:right-6 z-40 flex flex-col items-end group cursor-pointer pointer-events-auto"
            onClick={() => setIsOpen(true)}
          >

            {/* Peeking Mascot Container (Only top portion visible at very bottom right) */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 translate-y-6 sm:translate-y-7 hover:translate-y-2 transition-transform duration-300">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.5)] bg-[#131824] p-0.5 relative group-hover:scale-105 transition-transform">
                <img
                  src="/takopi.jpg"
                  alt="Takopi Mascot"
                  className="w-full h-full object-cover rounded-full scale-125"
                />
              </div>
              {/* Subtle Indicator Ring */}
              <span className="absolute top-1 right-1 w-3 h-3 bg-[#E6007E] rounded-full border-2 border-[#0B0E14] animate-ping" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-[#E6007E] rounded-full border-2 border-[#0B0E14]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TALKING CHARACTER DIALOGUE TEXTBOX MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsOpen(false)}
            />

            {/* Dialogue Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-lg bg-[#131824] border-2 border-[#00F2FE]/60 rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(0,242,254,0.25)] flex flex-col gap-4 z-10 overflow-hidden"
            >
              {/* Background Accent Lines */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00F2FE]/10 to-[#E6007E]/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Header: Character Info & Close */}
              <div className="flex items-center justify-between border-b border-[#232A3B] pb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.4)] shrink-0 bg-[#0B0E14]">
                    <img
                      src="/takopi.jpg"
                      alt="Takopi"
                      className="w-full h-full object-cover scale-125"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                        Tako
                      </h3>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#1E2333] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hint Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {HINTS.map((hint, idx) => (
                  <button
                    key={hint.id}
                    onClick={() => setCurrentHintIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentHintIndex === idx
                        ? `bg-gradient-to-r ${hint.color} text-white shadow-md font-black scale-[1.02]`
                        : "bg-[#1E2333] text-[#94A3B8] hover:text-white border border-[#2D3448]"
                    }`}
                  >
                    <span>{hint.difficulty}</span>
                  </button>
                ))}
              </div>

              {/* SIMULATED TALKING CHARACTER TEXTBOX (Visual Novel Style) */}
              <div className="relative bg-[#0B0E14] border border-[#232A3B] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-h-[140px] shadow-inner">
                {/* Active Hint Tag */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${currentHint.badgeBg}`}>
                    {currentHint.title}
                  </span>
                </div>

                {/* Animated Speech Text */}
                <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-relaxed min-h-[60px]">
                  {displayedText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-[#00F2FE] animate-pulse align-middle" />
                </p>

                {/* Code Snippet / Action Box if present */}
                {currentHint.codeSnippet && (
                  <div className="mt-1 bg-[#131824] border border-[#00F2FE]/30 rounded-xl p-2.5 font-mono text-[11px] text-[#00F2FE] flex items-center justify-between gap-2 overflow-x-auto">
                    <span>{currentHint.codeSnippet}</span>
                  </div>
                )}
              </div>

              {/* Bottom Dialogue Action Controls */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handlePrev}
                  className="px-3.5 py-2 rounded-xl bg-[#1E2333] hover:bg-[#2A3147] text-white text-xs font-bold flex items-center gap-1 border border-[#2D3448] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Hint</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {HINTS.map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentHintIndex === i
                          ? "bg-[#00F2FE] w-5"
                          : "bg-[#2D3448]"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#E6007E] hover:opacity-95 text-white text-xs font-black flex items-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <span>Next Hint</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
