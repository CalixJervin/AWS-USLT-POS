import { useState } from "react";
import { InventorySystem } from "@/components/inventory-system";
import { SiteHeader } from "@/components/site-header";
import { useInventory } from "./context/InventoryContext";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { IngredientUnit } from "@/types/inventory";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function InventoryPage() {
  const { isLoading, addIngredient } = useInventory()
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F2FE]"></div>
      </div>
    )
  }

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      unit: formData.get("unit") as IngredientUnit,
      currentStock: Number(formData.get("currentStock")),
      lowStockThreshold: Number(formData.get("lowStockThreshold")),
      costPerUnit: formData.get("costPerUnit") ? Number(formData.get("costPerUnit")) : null,
      supplier: formData.get("supplier") as string || null,
    };

    addIngredient(data);
    toast.success("Ingredient added");
    setIsAddOpen(false);
  };

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-[#0B0E14] relative">
      <div className="sticky top-0 z-50 bg-[#131824] border-b border-[#232A3B] shrink-0 select-none">
        <SiteHeader>
          <div className={`flex items-center gap-2 ${isMobileSearchOpen ? "hidden xl:flex" : "flex"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/admin" className="text-[#94A3B8] hover:text-[#E2E8F0]">POS</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-[#2D3448]" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-bold text-[#E2E8F0]">
                    Inventory Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Search Bar matching POS style */}
          <div className={`flex items-center ${isMobileSearchOpen ? "w-full xl:w-auto" : "ml-auto"}`}>
            {!isMobileSearchOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="xl:hidden h-8 w-8 cursor-pointer text-[#E2E8F0]"
                onClick={() => setIsMobileSearchOpen(true)}
              >
                <Search className="h-4 w-4 text-[#94A3B8]" />
              </Button>
            )}

            <div className={`${isMobileSearchOpen ? "flex w-full animate-in fade-in slide-in-from-right-4" : "hidden xl:flex"} items-center gap-2`}>
              <div className="relative">
                <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                <Input 
                  placeholder="Search inventory..." 
                  className="h-11 bg-[#1E2333] w-full xl:w-[250px] pl-9 rounded-full border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-1 focus-visible:ring-[#E6007E] touch-manipulation" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={isMobileSearchOpen}
                />
              </div>
            </div>
              
            {isMobileSearchOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="xl:hidden shrink-0 cursor-pointer text-[#E2E8F0]"
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <X className="h-5 w-5 text-[#94A3B8]" />
              </Button>
            )}
          </div>
        </SiteHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-4 xl:p-8 overscroll-contain touch-pan-y">
        <div className="max-w-6xl mx-auto space-y-6">
          <InventorySystem 
            externalSearchQuery={searchQuery} 
            onAddClick={() => setIsAddOpen(true)}
          />
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Add New Ingredient</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 py-4" onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                <Input name="name" placeholder="e.g. Espresso Beans" required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Unit</label>
                <Select name="unit" defaultValue="grams">
                  <SelectTrigger className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                    <SelectItem value="grams">Grams (g)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Current Stock</label>
                <Input name="currentStock" type="number" defaultValue={0} required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Low Threshold</label>
                <Input name="lowStockThreshold" type="number" defaultValue={100} required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Cost per Unit</label>
                <Input name="costPerUnit" type="number" step="0.01" placeholder="0.00" className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Supplier</label>
                <Input name="supplier" placeholder="e.g. Nestle" className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
            </div>
            <DialogFooter className="mt-4 flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42]" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 sm:flex-none font-black bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF]">Save Ingredient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
