import { useState, useEffect, useMemo, useCallback } from "react"
import { TicketSidebar } from "@/POS/Ticket"
import { useCart } from "@/hooks/useCart"
import { AddProductModal } from "@/POS/addProduct" 
import DeleteProductModal from "@/POS/deleteProduct"
import { AddCategoryModal } from "@/POS/addCategory"
import { ProductGrid } from "@/POS/items"
import { Input } from "@/components/ui/input"
import { Plus, Search, X, ShoppingBag, Clock } from "lucide-react"
import { Button } from "@/components/ui/button" 
import type { Product } from "@/hooks/useCart"
import { SiteHeader } from "@/components/site-header"

import { useInventory } from "@/hooks/useInventory"

function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-[#6B5B4E] text-[13px] font-medium mr-2">
      <Clock className="h-3.5 w-3.5" />
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}

export default function Page() {
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

  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<any>(null)

  const [activeCategory, setActiveCategory] = useState("All")
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

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

  const handleAddCategory = useCallback((newCategoryName: string, selectedProductIds: string[]) => {
    addCategory(newCategoryName)

    if (selectedProductIds.length > 0) {
      selectedProductIds.forEach(id => {
        updateProduct(id, { category: newCategoryName as any });
      });
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
    <div className="flex flex-row h-full overflow-hidden w-full bg-[#EDE5DA]">
      
      {/* --- LEFT SIDE: Header + Main Content --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* SiteHeader is now constrained inside the Left panel */}
        <div className="bg-[#E8DFD3] border-b border-[#D4C9BB]">
          <SiteHeader>
            <div className={`flex items-center gap-2 ${isMobileSearchOpen ? "hidden md:flex" : "flex"}`}>
              <h1 className="text-sm font-bold text-[#1C1412] hidden lg:block">POS</h1>
              
              <Button 
                variant="secondary"
                size="sm"
                className="flex lg:hidden items-center gap-2 rounded-full border shadow-sm px-4 h-11 cursor-pointer active:scale-95 touch-manipulation"
                onClick={() => setIsMobileTicketOpen(true)}
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="font-bold text-sm">Ticket</span>
                {totalCartItems > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full ml-1">
                    {totalCartItems}
                  </span>
                )}
              </Button>
            </div>

            <div className={`flex items-center gap-4 ${isMobileSearchOpen ? "w-full md:w-auto" : "ml-auto"}`}>
              <div className="hidden md:block">
                <LiveClock />
              </div>

              {!isMobileSearchOpen && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-8 w-8 cursor-pointer"
                  onClick={() => setIsMobileSearchOpen(true)}
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}

              <div className={`${isMobileSearchOpen ? "flex w-full animate-in fade-in slide-in-from-right-4" : "hidden md:flex"} items-center gap-2`}>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#9E8E7E] pointer-events-none" />
                  <Input 
                    type="search" 
                    placeholder="Search items..." 
                    className="h-11 bg-[#DDD5C8] w-full md:w-[200px] lg:w-[250px] pl-9 rounded-full border-[#C4B5A5] text-[#2C1F17] placeholder:text-[#9E8E7E] focus-visible:ring-1 focus-visible:ring-[#C4B5A5] touch-manipulation" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus={isMobileSearchOpen}
                  />
                </div>
                
                {isMobileSearchOpen && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden shrink-0 cursor-pointer"
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </SiteHeader>
        </div>

        {/* Scrollable Categories & Products Area */}
        <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-[#EDE5DA]">
          <div className="relative shrink-0">
            <div className="flex w-full overflow-x-auto pb-2 gap-2 scrollbar-hide bg-[#E8DFD3] p-3 rounded-xl border border-[#D4C9BB] relative">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-[#1C1412] text-white shadow-md" 
                      : "bg-transparent text-[#6B5B4E] border-[1.5px] border-[#C4B5A5] hover:bg-[#D4C9BB]"
                  }`}
                >
                  {cat}
                </button>
              ))}
              
              <button 
                onClick={() => setIsAddCategoryOpen(true)}
                className="flex items-center gap-1 whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-medium border-[1.5px] border-dashed border-[#C4B5A5] text-[#6B5B4E] hover:border-[#1C1412] hover:text-[#1C1412] transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
            {/* Fade gradient for horizontal scroll */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#E8DFD3] to-transparent pointer-events-none rounded-r-xl" />
          </div>

          <ProductGrid 
            products={filteredProducts}
            onAddToCart={handleAddToCart}
            selectedProductId={selectedProductId}
            onDeleteProduct={handleStageForDeletion}
            onAddNewClick={() => setIsAddModalOpen(true)}
          />
        </div>
      </div>

      {/* --- RIGHT SIDE: Ticket Sidebar --- */}
      {/* 2. Moved to the top level flex-row, so it takes the FULL height */}
      <div className="hidden lg:block h-full border-l border-[#CEC3B4] shrink-0 z-10 bg-[#E2D9CC]">
        <TicketSidebar 
          cart={cart}
          updateQty={updateQty}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          subtotal={subtotal}
          total={total}
        />
      </div>

      {/* --- MOBILE TICKET OVERLAY --- */}
      {isMobileTicketOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity" 
            onClick={() => setIsMobileTicketOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[85%] sm:w-[350px] bg-background shadow-2xl animate-in slide-in-from-right overflow-hidden flex flex-col">
            <TicketSidebar 
              cart={cart}
              updateQty={updateQty}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              subtotal={subtotal}
              total={total}
              onClose={() => setIsMobileTicketOpen(false)}
            />
          </div>
        </div>
      )}

      {/* MODALS */}
      <AddProductModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} onAddProduct={handleProductAdded} categories={categories} />
      <DeleteProductModal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} onDeleteProduct={handleConfirmDelete} product={productToDelete} />
      <AddCategoryModal isOpen={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen} onAddCategory={handleAddCategory} existingProducts={products} existingCategories={categories} />
    </div>
  )
}
