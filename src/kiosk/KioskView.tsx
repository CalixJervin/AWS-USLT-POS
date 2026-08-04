import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { TicketSidebar } from "@/POS/Ticket"
import { useCart } from "@/hooks/useCart"
import { ProductGrid } from "@/POS/items"
import { Input } from "@/components/ui/input"
import { Search, ShoppingBag, Store } from "lucide-react"
import { Button } from "@/components/ui/button" 
import type { Product } from "@/hooks/useCart"
import { SiteHeader } from "@/components/site-header"

import { useInventory } from "@/hooks/useInventory"
import { useKioskOrders, type PendingKioskOrder } from "@/hooks/useKioskOrders"
import { KioskOrderConfirmationModal } from "@/POS/KioskOrderConfirmationModal"
import { PreOrderModal } from "@/components/PreOrderModal"
import { motion, AnimatePresence } from "framer-motion"

import { MyPreOrdersModalButton } from "@/components/MyPreOrdersModal"

export default function KioskView() {
  const { 
    cart, addToCart, updateQty, removeFromCart, 
    clearCart, subtotal, total 
  } = useCart()

  const { products: inventoryProducts, categories } = useInventory()

  const {
    pendingOrders,
    activeKioskOrder,
    clearActiveKioskOrder,
    createPendingOrder,
  } = useKioskOrders()

  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("Featured")
  const [searchQuery, setSearchQuery] = useState("")

  // Scroll spy & smooth scroll refs
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const pillsBarRef = useRef<HTMLDivElement>(null)
  const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const isManualClickRef = useRef(false)

  // Kiosk Order Confirmation state
  const [submittedKioskOrder, setSubmittedKioskOrder] = useState<PendingKioskOrder | null>(null)

  const displayOrder = submittedKioskOrder || activeKioskOrder

  // Auto-close kiosk confirmation modal when order is finalized or cleared by staff
  useEffect(() => {
    if (submittedKioskOrder) {
      const isPendingInList = pendingOrders.some(
        o => o.id === submittedKioskOrder.id || o.orderNumber === submittedKioskOrder.orderNumber
      );
      const isMatchingActive = activeKioskOrder && (
        activeKioskOrder.id === submittedKioskOrder.id || activeKioskOrder.orderNumber === submittedKioskOrder.orderNumber
      );

      // Only auto-close if order is explicitly no longer active and no longer in pending list (finalized by staff)
      if (!isMatchingActive && !isPendingInList && activeKioskOrder === null) {
        setSubmittedKioskOrder(null);
      }
    }
  }, [activeKioskOrder, submittedKioskOrder, pendingOrders])

  const handlePayAtCounter = useCallback(async (
    cartItems: any[], 
    subTot: number, 
    tot: number, 
    paymentMethod: "counter" | "cash" | "gcash" = "counter",
    customerDetails?: { customerName?: string; customerEmail?: string; customerPhone?: string }
  ) => {
    const created = await createPendingOrder(cartItems, subTot, tot, paymentMethod, customerDetails)
    setSubmittedKioskOrder(created)
  }, [createPendingOrder])

  // Pre-Order Modal State for Merch Banners
  const [selectedMerchProduct, setSelectedMerchProduct] = useState<Product | null>(null)

  // Map inventory products to POS structure
  const allProducts: Product[] = useMemo(() => inventoryProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.variants[0]?.price || 0,
    category: p.category,
    image: p.image || undefined,
    inStock: p.inStock,
    variantId: p.variants[0]?.id as any,
    size: p.variants[0]?.size || "Regular",
    isPreOrder: p.isPreOrder || p.type === "merch" || p.category.toLowerCase().includes("merch")
  })), [inventoryProducts])

  // 1. Top Carousel: ONLY items with category === "Merch" or type === "merch" or isPreOrder === true
  const merchProducts = useMemo(() => {
    return allProducts
      .filter(p => p.isPreOrder || p.category.toLowerCase().includes("merch") || (p as any).type === "merch")
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allProducts, searchQuery]);

  // 2. Regular Menu Below: EXCLUDE merch/pre-order items (only food/beverage on-hand menu)
  const regularProducts = useMemo(() => {
    return allProducts
      .filter(p => !(p.isPreOrder || p.category.toLowerCase().includes("merch") || (p as any).type === "merch"))
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allProducts, searchQuery]);

  const allCategories = useMemo(() => ["Featured", ...categories.filter(c => !c.toLowerCase().includes("merch"))], [categories])

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const totalCartItems = useMemo(() => cart.reduce((tot, item) => tot + item.qty, 0), [cart])

  const [isTicketBouncing, setIsTicketBouncing] = useState(false)

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product)
    setSelectedProductId(product.id)
    
    setIsTicketBouncing(true)
    const bounceTimer = setTimeout(() => setIsTicketBouncing(false), 500)

    const timer = setTimeout(() => {
      setSelectedProductId(null)
    }, 150)
    return () => {
      clearTimeout(timer)
      clearTimeout(bounceTimer)
    }
  }, [addToCart])

  // Click-to-Scroll Anchor handler
  const handleCategoryPillClick = useCallback((cat: string) => {
    setActiveCategory(cat)
    isManualClickRef.current = true

    const container = mainScrollRef.current
    if (container) {
      if (cat === "Featured") {
        container.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const sectionId = `category-section-${encodeURIComponent(cat.toLowerCase().replace(/\s+/g, '-'))}`
        const sectionEl = document.getElementById(sectionId)
        if (sectionEl) {
          const containerRect = container.getBoundingClientRect()
          const sectionRect = sectionEl.getBoundingClientRect()
          const targetTop = sectionRect.top - containerRect.top + container.scrollTop - 88
          container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" })
        }
      }
    }

    setTimeout(() => {
      isManualClickRef.current = false
    }, 800)
  }, [])

  // Scroll Spy Observer effect
  useEffect(() => {
    const container = mainScrollRef.current
    if (!container) return

    const handleScroll = () => {
      if (isManualClickRef.current) return

      if (container.scrollTop < 60) {
        setActiveCategory("Featured")
        return
      }

      // If user has scrolled near the bottom of the container, auto-select the last section
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50
      const sections = container.querySelectorAll<HTMLElement>("section[data-category-name]")

      if (isAtBottom && sections.length > 0) {
        const lastSec = sections[sections.length - 1]
        const lastCat = lastSec.getAttribute("data-category-name") || ""
        if (lastCat && lastCat !== activeCategory) {
          setActiveCategory(lastCat)
          return
        }
      }

      const containerTop = container.getBoundingClientRect().top

      let currentCat = ""
      let minDistance = Infinity

      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect()
        const topOffset = rect.top - containerTop

        // Robust threshold for sections of any height (including empty/unavailable categories)
        const isVisibleInThreshold = topOffset <= 160 && (rect.bottom - containerTop) >= 30

        if (isVisibleInThreshold) {
          const dist = Math.abs(topOffset - 80)
          if (dist < minDistance) {
            minDistance = dist
            currentCat = sec.getAttribute("data-category-name") || ""
          }
        }
      })

      if (currentCat && currentCat !== activeCategory) {
        setActiveCategory(currentCat)
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [activeCategory])

  // Scroll active pill into view horizontally
  useEffect(() => {
    const activeBtn = categoryPillRefs.current[activeCategory]
    const pillsContainer = pillsBarRef.current
    if (activeBtn && pillsContainer) {
      const containerWidth = pillsContainer.clientWidth
      const btnLeft = activeBtn.offsetLeft
      const btnWidth = activeBtn.clientWidth
      const targetLeft = btnLeft - (containerWidth / 2) + (btnWidth / 2)
      pillsContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" })
    }
  }, [activeCategory])

  return (
    <div className="flex flex-row h-full overflow-hidden w-full bg-[#0B0E14]">
      {/* LEFT SIDE: Header + Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="sticky top-0 z-50 bg-[#131824] border-b border-[#232A3B] shrink-0 select-none">
          <SiteHeader isKiosk={true}>
            {/* LOGO & TITLE */}
            <div className="flex items-center gap-2">
              <img 
                src="/takopi.jpg" 
                alt="AWS Logo" 
                className="w-7 h-7 sm:w-8 sm:h-8 object-cover rounded-full border border-[#00F2FE]/40 shadow-[0_0_10px_rgba(0,242,254,0.3)] shrink-0" 
              />
              <span className="text-sm sm:text-base font-black text-[#E2E8F0] tracking-tight">
                AWS
              </span>
            </div>

            {/* RIGHT SIDE: VIEW TICKET & SEARCH INPUT */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <MyPreOrdersModalButton />

              <div className="relative flex-1 min-w-[110px] max-w-[180px] sm:max-w-[240px]">
                <Search className="absolute left-2.5 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#94A3B8] pointer-events-none" />
                <Input 
                  type="search" 
                  placeholder="Search items..." 
                  className="h-9 sm:h-11 bg-[#1E2333] w-full pl-8 sm:pl-9 rounded-full border-[#2D3448] text-[#E2E8F0] text-xs sm:text-sm placeholder:text-[#64748B] focus-visible:ring-1 focus-visible:ring-[#E6007E] touch-manipulation" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </SiteHeader>
        </div>

        {/* Scrollable Categories & Products Area */}
        <div ref={mainScrollRef} className="flex-1 flex flex-col gap-4 px-4 pt-0 pb-[40vh] overflow-y-auto custom-scrollbar bg-[#0B0E14] relative overscroll-contain touch-pan-y">
          {/* PERSISTENT ACTIVE KIOSK ORDER BANNER */}
          {activeKioskOrder && (
            <div className="bg-[#1E2333] border border-[#00F2FE]/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#E6007E]/20 text-[#E6007E]">
                  <Store className="h-4 w-4 text-[#00F2FE]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#E2E8F0] flex items-center gap-2">
                    Active Order Number:
                    <span className="text-[#00F2FE] text-base font-black tracking-tight">{activeKioskOrder.orderNumber}</span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Status: <span className="text-[#E6007E] font-bold">Unpaid (Pay at Counter)</span> • Total: ₱{activeKioskOrder.total.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setSubmittedKioskOrder(activeKioskOrder)}
                  className="h-8 text-xs font-black bg-[#E6007E] text-white hover:bg-[#FF1A96] rounded-lg shadow-sm border border-[#00F2FE]/30 cursor-pointer"
                >
                  View Order Number {activeKioskOrder.orderNumber}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearActiveKioskOrder()
                    setSubmittedKioskOrder(null)
                  }}
                  className="h-8 text-xs text-[#64748B] hover:text-[#FF3366] cursor-pointer"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* STICKY CATEGORY NAVIGATION BAR */}
          <div className="sticky top-0 z-40 bg-[#0B0E14] -mx-4 px-4 py-2 border-b border-[#232A3B] shadow-md shrink-0">
            <div className="relative shrink-0">
              <div ref={pillsBarRef} className="flex w-full overflow-x-auto pb-2 gap-2 custom-scrollbar bg-[#131824] p-3 rounded-xl border border-[#232A3B] relative">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    ref={(el) => { categoryPillRefs.current[cat] = el; }}
                    onClick={() => handleCategoryPillClick(cat)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-[#E6007E] text-white font-black shadow-md shadow-[#E6007E]/20" 
                        : "bg-transparent text-[#94A3B8] border border-[#2D3448] hover:bg-[#1E2333] hover:text-[#E2E8F0]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#131824] to-transparent pointer-events-none rounded-r-xl" />
            </div>
          </div>

          {/* 1. FEATURED PRE-ORDERS CAROUSEL (TOP OF PAGE) */}
          {merchProducts.length > 0 && (
            <div className="flex flex-col gap-2.5 my-2 shrink-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-[#E6007E]" />
                  <h3 className="text-sm font-extrabold text-[#E2E8F0] tracking-wide uppercase flex items-center gap-2">
                    Featured 
                  </h3>
                </div>
              </div>

              <div className="flex w-full overflow-x-auto gap-4 pb-3 pt-1 hide-scrollbar snap-x snap-mandatory">
                {merchProducts.map((merch) => (
                  <div
                    key={merch.id}
                    onClick={() => setSelectedMerchProduct(merch)}
                    className="min-w-[280px] sm:min-w-[320px] h-[160px] rounded-2xl bg-[#1E2333] border border-[#00F2FE]/40 hover:border-[#00F2FE] cursor-pointer snap-start relative overflow-hidden flex flex-col justify-between p-4 shadow-lg transition-all active:scale-[0.99] group shrink-0"
                  >
                    {/* Background image or gradient fallback */}
                    {merch.image ? (
                      <img 
                        src={merch.image} 
                        alt={merch.name} 
                        className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#E6007E]/25 via-transparent to-[#00F2FE]/15" />
                    )}

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="bg-[#E6007E] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                        PRE-ORDER
                      </span>
                      <span className="bg-[#131824]/90 backdrop-blur-md text-[#00F2FE] border border-[#00F2FE]/40 text-xs font-black px-2.5 py-1 rounded-full">
                        ₱{merch.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="relative z-10">
                      <h4 className="text-base font-black text-white drop-shadow-md truncate">{merch.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. REGULAR MENU (BELOW CAROUSEL - FOOD & ON-HAND ITEMS ONLY) */}
          <ProductGrid 
            products={regularProducts}
            categories={categories}
            onAddToCart={handleAddToCart}
            selectedProductId={selectedProductId}
            onDeleteProduct={() => {}}
            onAddNewClick={() => {}}
            isKiosk={true}
          />
        </div>
      </div>

      {/* FLOATING BOTTOM TICKET BUTTON - ALWAYS VISIBLE IN KIOSK */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/95 to-transparent z-30 flex pointer-events-none justify-center">
        <motion.div
          animate={isTicketBouncing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-md pointer-events-auto"
        >
          <Button 
            onClick={() => setIsMobileTicketOpen(true)}
            className={`w-full h-12 sm:h-14 rounded-2xl bg-[#E6007E] hover:bg-[#FF1A96] active:scale-[0.98] text-white font-bold border border-[#FF3366]/30 flex items-center justify-between px-4 sm:px-5 transition-all cursor-pointer touch-manipulation relative overflow-hidden ${
              isTicketBouncing ? 'shadow-[0_8px_30px_rgba(230,0,126,0.65)]' : 'shadow-[0_8px_25px_rgba(230,0,126,0.4)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                animate={isTicketBouncing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative flex items-center justify-center bg-white/20 rounded-full w-8 h-8 sm:w-9 sm:h-9 shrink-0"
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                {totalCartItems > 0 && (
                  <motion.span 
                    key={totalCartItems}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-white text-[#E6007E] text-[10px] sm:text-[11px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow"
                  >
                    {totalCartItems}
                  </motion.span>
                )}
              </motion.div>
              <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase">
                {totalCartItems > 0 ? `View Ticket (${totalCartItems} ${totalCartItems === 1 ? 'item' : 'items'})` : "View Ticket"}
              </span>
            </div>
            
            <div className="flex items-center gap-1 font-black text-sm sm:text-base">
              <span>₱{total.toFixed(2)}</span>
            </div>
          </Button>
        </motion.div>
      </div>

      {/* KIOSK TICKET OVERLAY (SLIDES FROM RIGHT SIDE) */}
      <AnimatePresence>
        {isMobileTicketOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileTicketOpen(false)}
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-[420px] sm:w-[420px] h-full bg-[#131824] border-l border-[#232A3B] shadow-2xl overflow-hidden flex flex-col z-50"
            >
              <TicketSidebar 
                cart={cart}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
                subtotal={subtotal}
                total={total}
                onClose={() => setIsMobileTicketOpen(false)}
                isKiosk={true}
                onPayAtCounter={handlePayAtCounter}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KIOSK CONFIRMATION SCREEN (#042) */}
      <KioskOrderConfirmationModal
        order={displayOrder}
        isOpen={!!submittedKioskOrder}
        onClose={() => setSubmittedKioskOrder(null)}
        onClearOrder={() => {
          clearActiveKioskOrder()
          setSubmittedKioskOrder(null)
        }}
      />

      {/* PRE-ORDER MERCH MODAL */}
      <PreOrderModal
        item={selectedMerchProduct}
        isOpen={!!selectedMerchProduct}
        onClose={() => setSelectedMerchProduct(null)}
      />
    </div>
  )
}
