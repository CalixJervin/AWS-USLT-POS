import { useState } from "react"
import { Link } from "react-router-dom"
import { Edit, Plus, Trash2, Search, X } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { SiteHeader } from "@/components/site-header"

// Import your Modals and Types
import { AddProductModal } from "@/POS/addProduct"
import { EditProductModal } from "@/POS/editProduct"
import DeleteProductModal from "@/POS/deleteProduct"
import { AddCategoryModal } from "@/POS/addCategory"

import { useInventory } from "@/hooks/useInventory"
import { generateId } from "@/lib/utils"

export default function ManageMenuPage() {
  const { 
    products: inventoryProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    categories,
    addCategory,
    deleteCategory,
    renameCategory
  } = useInventory()
  const [searchQuery, setSearchQuery] = useState("")

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("products")

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([])

  // --- MODAL STATES ---
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false)
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Map inventory products to POS structure for filtered display if needed, 
  // but here we can just use inventoryProducts directly for management.
  const filteredProducts = inventoryProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // --- SELECTION HANDLERS ---
  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }
  const toggleAllProducts = (checked: boolean) => {
    setSelectedProductIds(checked ? filteredProducts.map(p => p.id) : [])
  }

  const toggleCategory = (name: string) => {
    setSelectedCategoryNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }
  const toggleAllCategories = (checked: boolean) => {
    setSelectedCategoryNames(checked ? categories : [])
  }

  // --- BULK ACTION HANDLERS ---
  const handleBulkDelete = () => {
    setIsBulkDeleteConfirmOpen(true);
  }

  const handleConfirmBulkDelete = async () => {
    try {
      if (activeTab === "products") {
        await Promise.all(selectedProductIds.map(id => deleteProduct(id)));
        setSelectedProductIds([]);
      } else {
        const updates = inventoryProducts
          .filter(p => selectedCategoryNames.includes(p.category))
          .map(p => updateProduct(p.id, { category: "Uncategorized" as any }));

        await Promise.all(updates);

        await Promise.all(selectedCategoryNames.map(name => deleteCategory(name)));
        
        setSelectedCategoryNames([]);
        toast.success(`${selectedCategoryNames.length} categories deleted.`);
      }
      setIsBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  }
  const handleBulkEdit = () => {
    if (activeTab === "products" && selectedProductIds.length === 1) {
      const product = inventoryProducts.find(p => p.id === selectedProductIds[0]);
      if (product) {
        setSelectedProduct(product);
        setIsEditProductOpen(true);
      }
    } else if (activeTab === "categories" && selectedCategoryNames.length === 1) {
      const cat = selectedCategoryNames[0];
      setSelectedCategory(cat);
      setNewCategoryName(cat);
      setIsEditCategoryOpen(true);
    }
  }

  // --- STANDARD HANDLERS ---
  const handleAddProduct = async (productData: any) => {
    await addProduct(productData)
  }
  const handleEditProduct = async (updatedProduct: any) => {
    await updateProduct(updatedProduct.id, {
      ...updatedProduct,
      variants: [{ 
        id: generateId(), 
        size: 'Regular', 
        price: updatedProduct.price, 
        recipeId: updatedProduct.recipeId 
      }]
    })
    setSelectedProductIds([]);
  }
  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id)
  }

  const handleAddCategory = async (newCategory: string, selectedIds: any[]) => {
    await addCategory(newCategory)
    if (selectedIds.length > 0) {
      await Promise.all(selectedIds.map(id => updateProduct(id, { category: newCategory as any })))
    }
  }
  
  const handleSaveCategoryEdit = async () => {
    if (!newCategoryName || newCategoryName === selectedCategory) {
      setIsEditCategoryOpen(false);
      return;
    }
    
    await renameCategory(selectedCategory, newCategoryName);
    
    setIsEditCategoryOpen(false)
    setSelectedCategoryNames([]);
    toast.success("Category renamed!")
  }

  const handleConfirmCategoryDelete = async () => {
    const updates = inventoryProducts
      .filter(p => p.category === selectedCategory)
      .map(p => updateProduct(p.id, { category: "Uncategorized" as any }));
    
    await Promise.all(updates);
    
    await deleteCategory(selectedCategory);
    setIsDeleteCategoryOpen(false)
    toast.success("Category deleted.")
  }

  const showBottomBar = (activeTab === "products" && selectedProductIds.length > 0) || 
                        (activeTab === "categories" && selectedCategoryNames.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0E14] relative">
      
      <div className="bg-[#131824] border-b border-[#232A3B]">
        <SiteHeader>
          {/* --- LEFT SIDE: Breadcrumbs --- */}
          <div className={`flex items-center gap-2 ${isMobileSearchOpen ? "hidden md:flex" : "flex"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/admin" className="text-[#94A3B8] hover:text-[#E2E8F0]">POS</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-[#2D3448]" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-bold text-[#E2E8F0]">Menu Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* --- RIGHT SIDE: Search Bar --- */}
          <div className={`flex items-center ${isMobileSearchOpen ? "w-full md:w-auto" : "ml-auto"}`}>
            {!isMobileSearchOpen && (
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 cursor-pointer text-[#E2E8F0]" onClick={() => setIsMobileSearchOpen(true)}>
                <Search className="h-4 w-4 text-[#94A3B8]" />
              </Button>
            )}

            <div className={`${isMobileSearchOpen ? "flex w-full animate-in fade-in slide-in-from-right-4" : "hidden md:flex"} items-center gap-2`}>
              <div className="relative">
                <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                <Input 
                  type="search" 
                  placeholder="Search items..." 
                  className="h-11 bg-[#1E2333] w-full md:w-[200px] lg:w-[250px] pl-9 rounded-full border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-1 focus-visible:ring-[#00F2FE] touch-manipulation" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  autoFocus={isMobileSearchOpen}
                />
              </div>
              {isMobileSearchOpen && (
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 cursor-pointer text-[#E2E8F0]" onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(""); }}>
                  <X className="h-5 w-5 text-[#94A3B8]" />
                </Button>
              )}
            </div>
          </div>
        </SiteHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24"> 
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#E6007E]" />
              <h2 className="text-lg font-bold text-[#E2E8F0]">
                {activeTab === "products" ? "Product Management" : "Category Management"}
              </h2>
            </div>
            
            <Button 
              onClick={() => activeTab === "products" ? setIsAddProductOpen(true) : setIsAddCategoryOpen(true)}
              className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] gap-2 h-10 px-5 rounded-full shadow-md font-black text-sm transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4 text-[#0B0E14]" />
              {activeTab === "products" ? "Add Product" : "Add Category"}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex h-14 bg-[#131824] p-1.5 rounded-xl mb-6 shadow-inner border border-[#232A3B]">
              <TabsTrigger value="products" className="flex-1 rounded-lg data-[state=active]:bg-[#00F2FE] data-[state=active]:text-[#0B0E14] font-black text-[#94A3B8] text-sm transition-all">Products</TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 rounded-lg data-[state=active]:bg-[#00F2FE] data-[state=active]:text-[#0B0E14] font-black text-[#94A3B8] text-sm transition-all">Categories</TabsTrigger>
            </TabsList>

            {/* PRODUCTS TAB CONTENT */}
            <TabsContent value="products" className="space-y-4 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[#1E2333] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden border border-[#2D3448]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#131824]">
                      <TableRow className="hover:bg-transparent border-b border-[#232A3B]">
                        {/* Always visible on mobile (md:hidden) */}
                        <TableHead className="w-[40px] text-center md:hidden">
                          <input 
                            type="checkbox" 
                            className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
                            checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={(e) => toggleAllProducts(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead className="w-12 text-[10px] font-bold uppercase text-[#94A3B8] text-center">Image</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8]">Product Name</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8]">Category</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase text-[#94A3B8]">Price Range</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase text-[#94A3B8] pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const prices = product.variants.map(v => v.price);
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        const priceDisplay = minPrice === maxPrice ? `₱${minPrice.toFixed(2)}` : `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;

                        return (
                          <TableRow 
                            key={product.id} 
                            className={`group transition-colors border-b border-[#232A3B] last:border-0 cursor-pointer md:cursor-default hover:bg-[#282E42] ${selectedProductIds.includes(product.id) ? "bg-[#282E42]" : ""}`}
                            onClick={() => {
                              if (selectedProductIds.length > 0) toggleProduct(product.id)
                            }}
                          >
                            {/* Always visible on mobile (md:hidden) */}
                            <TableCell className="text-center md:hidden">
                              <input 
                                type="checkbox" 
                                className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => toggleProduct(product.id)}
                                onClick={(e) => e.stopPropagation()} 
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="h-10 w-10 mx-auto rounded-lg overflow-hidden bg-[#131824] border border-[#2D3448] relative">
                                <img 
                                  src={product.image || ""} 
                                  alt={product.name} 
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover pointer-events-none" 
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-[#E2E8F0] text-sm">{product.name}</TableCell>
                            <TableCell>
                              <span className="bg-[#131824] text-[#E6007E] border border-[#E6007E]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                {product.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-black text-[#E6007E] text-sm">{priceDisplay}</TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#131824] cursor-pointer active:scale-95 touch-manipulation" 
                                  onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setIsEditProductOpen(true); }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-[#94A3B8] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer active:scale-95 touch-manipulation" 
                                  onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setIsDeleteProductOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* CATEGORIES TAB CONTENT */}
            <TabsContent value="categories" className="space-y-4 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[#1E2333] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden border border-[#2D3448]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#131824]">
                      <TableRow className="hover:bg-transparent border-b border-[#232A3B]">
                        {/* Always visible on mobile (md:hidden) */}
                        <TableHead className="w-[40px] text-center md:hidden">
                          <input 
                            type="checkbox" 
                            className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
                            checked={selectedCategoryNames.length === categories.length && categories.length > 0}
                            onChange={(e) => toggleAllCategories(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8]">Category Name</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase text-[#94A3B8]">Total Items</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase text-[#94A3B8] pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => {
                        const itemCount = inventoryProducts.filter(p => p.category === category).length;
                        return (
                          <TableRow 
                            key={category} 
                            className={`group transition-colors border-b border-[#232A3B] last:border-0 cursor-pointer md:cursor-default hover:bg-[#282E42] ${selectedCategoryNames.includes(category) ? "bg-[#282E42]" : ""}`}
                            onClick={() => {
                              if (selectedCategoryNames.length > 0) toggleCategory(category)
                            }}
                          >
                            {/* Always visible on mobile (md:hidden) */}
                            <TableCell className="text-center md:hidden">
                              <input 
                                type="checkbox" 
                                className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
                                checked={selectedCategoryNames.includes(category)}
                                onChange={() => toggleCategory(category)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-[#E2E8F0] text-sm">{category}</TableCell>
                            <TableCell className="text-right font-black text-[#E6007E] text-xs">{itemCount} items</TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#131824] cursor-pointer active:scale-95 touch-manipulation" 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCategory(category); setNewCategoryName(category); setIsEditCategoryOpen(true); }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-[#94A3B8] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer active:scale-95 touch-manipulation" 
                                  onClick={(e) => { e.stopPropagation(); setSelectedCategory(category); setIsDeleteCategoryOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* --- MOBILE FLOATING ACTION BAR --- */}
      <AnimatePresence>
        {showBottomBar && (
          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            exit={{ y: 100 }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center md:hidden"
          >
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {activeTab === "products" ? selectedProductIds.length : selectedCategoryNames.length} Selected
              </span>
              <button 
                onClick={() => activeTab === "products" ? setSelectedProductIds([]) : setSelectedCategoryNames([])}
                className="text-xs text-muted-foreground underline text-left cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
            
            <div className="flex gap-2">
              {(activeTab === "products" ? selectedProductIds.length === 1 : selectedCategoryNames.length === 1) && (
                <Button variant="outline" className="cursor-pointer" onClick={handleBulkEdit}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              )}
              <Button variant="destructive" className="cursor-pointer" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AddProductModal isOpen={isAddProductOpen} onOpenChange={setIsAddProductOpen} onAddProduct={handleAddProduct} categories={categories} />
      <EditProductModal isOpen={isEditProductOpen} onOpenChange={setIsEditProductOpen} product={selectedProduct} categories={categories} onSave={handleEditProduct} />
      <DeleteProductModal isOpen={isDeleteProductOpen} onOpenChange={setIsDeleteProductOpen} product={selectedProduct} onDeleteProduct={handleDeleteProduct} />
      <AddCategoryModal isOpen={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen} onAddCategory={handleAddCategory} existingProducts={inventoryProducts as any} existingCategories={categories} />

      {/* BULK DELETE CONFIRMATION */}
      <Dialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Deletion</DialogTitle>
            <DialogDescription className="py-4">
              {activeTab === "products" 
                ? `Are you sure you want to delete ${selectedProductIds.length} selected products? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedCategoryNames.length} selected categories? Products inside will be moved to "Uncategorized".`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkDeleteConfirmOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmBulkDelete} className="flex-1 sm:flex-none">Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Category</DialogTitle></DialogHeader>
          <div className="py-4"><Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategoryEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Category</DialogTitle></DialogHeader>
          <DialogDescription className="py-4">
            Are you sure you want to delete <strong>{selectedCategory}</strong>? Any products inside will be moved to "Uncategorized".
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteCategoryOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmCategoryDelete}>Delete Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
