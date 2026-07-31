import { useState, useEffect, useMemo, useCallback } from "react"
import { TicketSidebar } from "@/POS/Ticket"
import { useCart } from "@/hooks/useCart"
import { AddProductModal } from "@/POS/addProduct" 
import DeleteProductModal from "@/POS/deleteProduct"
import { AddCategoryModal } from "@/POS/addCategory"
import { ProductGrid } from "@/POS/items"
import { Input } from "@/components/ui/input"
import { Plus, Search, X, ShoppingBag, Clock, Store } from "lucide-react"
import { Button } from "@/components/ui/button" 
import type { Product } from "@/hooks/useCart"
import { SiteHeader } from "@/components/site-header"

import { useInventory } from "@/hooks/useInventory"
import { useKioskOrders, type PendingKioskOrder } from "@/hooks/useKioskOrders"
import { KioskOrderConfirmationModal } from "@/POS/KioskOrderConfirmationModal"
import { PendingOrdersModal } from "@/components/PendingOrdersModal"

function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-[#E6007E] text-[13px] font-semibold mr-2">
      <Clock className="h-3.5 w-3.5 text-[#E6007E]" />
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}

export default function Page({ isKiosk = false }: { isKiosk?: boolean }) {
  const { 
    cart, addToCart, updateQty, removeFromCart, 
    clearCart, subtotal, total 
  } = useCart()

  const { 
    products: inventoryProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    categories,
    addCategory
  } = useInventory()

  const {
    pendingOrders,
    activeKioskOrder,
    clearActiveKioskOrder,
    createPendingOrder,
    finalizePendingOrder,
    cancelPendingOrder,
    clearAllPendingOrders
  } = useKioskOrders()

  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<any>(null)

  const [activeCategory, setActiveCategory] = useState("All")
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  // Kiosk Confirmation state & Staff Pending Orders modal state
  const [submittedKioskOrder, setSubmittedKioskOrder] = useState<PendingKioskOrder | null>(null)
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false)

  const displayOrder = submittedKioskOrder || activeKioskOrder;

  // Auto-close kiosk confirmation modal if order is finalized/cleared by staff
  useEffect(() => {
    if (submittedKioskOrder && !activeKioskOrder) {
      setSubmittedKioskOrder(null);
    }
  }, [activeKioskOrder, submittedKioskOrder]);

  const handlePayAtCounter = useCallback(async (cartItems: any[], subTot: number, tot: number, paymentMethod: "counter" | "cash" | "gcash" = "counter") => {
    const created = await createPendingOrder(cartItems, subTot, tot, paymentMethod)
    setSubmittedKioskOrder(created)
  }, [createPendingOrder])

  // Map inventory products to POS structure
  const products: Product[] = useMemo(() => inventoryProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.variants[0]?.price || 0,
    category: p.category,
    image: p.image || undefined,
    inStock: p.inStock,
    variantId: p.variants[0]?.id as any, // ID from product_variants table
    size: p.variants[0]?.size || "Regular"
  })), [inventoryProducts])

  const handleProductAdded = useCallback(async (productData: any) => {
    await addProduct(productData)
  }, [addProduct])

  const handleStageForDeletion = useCallback((id: string, _name: string) => {
    const product = products.find(p => p.id === id) || null;
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  }, [products]);

  const handleConfirmDelete = useCallback(async (id: string) => {
    try {
      await deleteProduct(id);
      setProductToDelete(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  }, [deleteProduct]);

  const handleAddCategory = useCallback(async (newCategoryName: string, selectedProductIds: string[]) => {
    await addCategory(newCategoryName)

    if (selectedProductIds.length > 0) {
      await Promise.all(selectedProductIds.map(id => 
        updateProduct(id, { category: newCategoryName as any })
      ));
    }
  }, [addCategory, updateProduct])

  const allCategories = useMemo(() => ["All", ...categories], [categories]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  }), [products, activeCategory, searchQuery]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const totalCartItems = useMemo(() => cart.reduce((total, item) => total + item.qty, 0), [cart]);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    setSelectedProductId(product.id);
    
    const timer = setTimeout(() => {
      setSelectedProductId(null);
    }, 150); 
    return () => clearTimeout(timer);
  }, [addToCart]);
    
  return (
    // 1. The main container is now a ROW first
    <div className="flex flex-row h-full overflow-hidden w-full bg-[#0B0E14]">
      
      {/* --- LEFT SIDE: Header + Main Content --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* SiteHeader is now constrained inside the Left panel */}
        <div className="bg-[#131824] border-b border-[#232A3B]">
          <SiteHeader isKiosk={isKiosk}>
            <div className={`flex items-center gap-2 ${isMobileSearchOpen ? "hidden md:flex" : "flex"}`}>
              <h1 className="text-sm font-bold text-[#E2E8F0] hidden lg:block">
                {isKiosk ? "Kiosk" : "POS"}
              </h1>
              {isKiosk && (
                <span className="bg-[#E6007E]/20 text-[#E6007E] text-[10px] font-bold px-2 py-0.5 rounded border border-[#E6007E]/30 hidden lg:inline-block">
                  KIOSK MODE
                </span>
              )}
              
              <Button 
                variant="secondary"
                size="sm"
                className="flex lg:hidden items-center gap-2 rounded-full border border-[#2D3448] bg-[#1E2333] text-[#E2E8F0] shadow-sm px-4 h-11 cursor-pointer active:scale-95 touch-manipulation"
                onClick={() => setIsMobileTicketOpen(true)}
              >
                <ShoppingBag className="h-4 w-4 text-[#E6007E]" />
                <span className="font-bold text-sm">Ticket</span>
                {totalCartItems > 0 && (
                  <span className="bg-[#E6007E] text-white text-xs font-black h-5 w-5 flex items-center justify-center rounded-full ml-1">
                    {totalCartItems}
                  </span>
                )}
              </Button>
            </div>

            <div className={`flex items-center gap-4 ${isMobileSearchOpen ? "w-full md:w-auto" : "ml-auto"}`}>
              {!isKiosk && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPendingModalOpen(true)}
                  className="relative flex items-center gap-2 rounded-full border border-[#E6007E]/40 bg-[#1E2333] text-[#E6007E] hover:bg-[#E6007E]/10 px-3.5 h-9 cursor-pointer font-bold text-xs shadow-sm"
                >
                  <Store className="h-3.5 w-3.5 text-[#E6007E]" />
                  <span>Pending Kiosk</span>
                  {pendingOrders.length > 0 && (
                    <span className="bg-[#E6007E] text-white text-[10px] font-black h-4 w-4 flex items-center justify-center rounded-full ml-0.5 animate-pulse">
                      {pendingOrders.length}
                    </span>
                  )}
                </Button>
              )}

              <div className="hidden md:block">
                <LiveClock />
              </div>

              {!isMobileSearchOpen && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-8 w-8 cursor-pointer text-[#E2E8F0]"
                  onClick={() => setIsMobileSearchOpen(true)}
                >
                  <Search className="h-4 w-4 text-[#94A3B8]" />
                </Button>
              )}

              <div className={`${isMobileSearchOpen ? "flex w-full animate-in fade-in slide-in-from-right-4" : "hidden md:flex"} items-center gap-2`}>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                  <Input 
                    type="search" 
                    placeholder="Search items..." 
                    className="h-11 bg-[#1E2333] w-full md:w-[200px] lg:w-[250px] pl-9 rounded-full border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-1 focus-visible:ring-[#E6007E] touch-manipulation" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus={isMobileSearchOpen}
                  />
                </div>
                
                {isMobileSearchOpen && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden shrink-0 cursor-pointer text-[#E2E8F0]"
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-5 w-5 text-[#94A3B8]" />
                  </Button>
                )}
              </div>
            </div>
          </SiteHeader>
        </div>

        {/* Scrollable Categories & Products Area */}
        <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-[#0B0E14]">
          {/* PERSISTENT ACTIVE KIOSK ORDER BANNER */}
          {isKiosk && activeKioskOrder && (
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
                    clearActiveKioskOrder();
                    setSubmittedKioskOrder(null);
                  }}
                  className="h-8 text-xs text-[#64748B] hover:text-[#FF3366] cursor-pointer"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="relative shrink-0">
            <div className="flex w-full overflow-x-auto pb-2 gap-2 scrollbar-hide bg-[#131824] p-3 rounded-xl border border-[#232A3B] relative">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-[#E6007E] text-white font-black shadow-md shadow-[#E6007E]/20" 
                      : "bg-transparent text-[#94A3B8] border border-[#2D3448] hover:bg-[#1E2333] hover:text-[#E2E8F0]"
                  }`}
                >
                  {cat}
                </button>
              ))}
              
              {!isKiosk && (
                <button 
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="flex items-center gap-1 whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-semibold border border-dashed border-[#2D3448] text-[#94A3B8] hover:border-[#E6007E] hover:text-[#E6007E] transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </button>
              )}
            </div>
            {/* Fade gradient for horizontal scroll */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#131824] to-transparent pointer-events-none rounded-r-xl" />
          </div>

          <ProductGrid 
            products={filteredProducts}
            onAddToCart={handleAddToCart}
            selectedProductId={selectedProductId}
            onDeleteProduct={handleStageForDeletion}
            onAddNewClick={() => setIsAddModalOpen(true)}
            isKiosk={isKiosk}
          />
        </div>
      </div>

      {/* --- RIGHT SIDE: Ticket Sidebar --- */}
      <div className="hidden lg:block h-full border-l border-[#232A3B] shrink-0 z-10 bg-[#131824]">
        <TicketSidebar 
          cart={cart}
          updateQty={updateQty}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          subtotal={subtotal}
          total={total}
          isKiosk={isKiosk}
          onPayAtCounter={handlePayAtCounter}
        />
      </div>

      {/* --- MOBILE TICKET OVERLAY --- */}
      {isMobileTicketOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity" 
            onClick={() => setIsMobileTicketOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[85%] sm:w-[350px] bg-[#131824] border-l border-[#232A3B] shadow-2xl animate-in slide-in-from-right overflow-hidden flex flex-col">
            <TicketSidebar 
              cart={cart}
              updateQty={updateQty}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              subtotal={subtotal}
              total={total}
              onClose={() => setIsMobileTicketOpen(false)}
              isKiosk={isKiosk}
              onPayAtCounter={handlePayAtCounter}
            />
          </div>
        </div>
      )}

      {/* MODALS */}
      <AddProductModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} onAddProduct={handleProductAdded} categories={categories} />
      <DeleteProductModal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} onDeleteProduct={handleConfirmDelete} product={productToDelete} />
      <AddCategoryModal isOpen={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen} onAddCategory={handleAddCategory} existingProducts={products} existingCategories={categories} />

      {/* KIOSK CONFIRMATION SCREEN (#042) */}
      <KioskOrderConfirmationModal
        order={displayOrder}
        isOpen={!!submittedKioskOrder}
        onClose={() => setSubmittedKioskOrder(null)}
        onClearOrder={() => {
          clearActiveKioskOrder();
          setSubmittedKioskOrder(null);
        }}
      />

      {/* STAFF PENDING KIOSK ORDERS INTERFACE */}
      <PendingOrdersModal
        isOpen={isPendingModalOpen}
        onOpenChange={setIsPendingModalOpen}
        pendingOrders={pendingOrders}
        onFinalizeOrder={finalizePendingOrder}
        onCancelOrder={cancelPendingOrder}
        onClearAllOrders={clearAllPendingOrders}
      />
    </div>
  )
}
