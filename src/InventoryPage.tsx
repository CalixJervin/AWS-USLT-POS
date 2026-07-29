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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="flex flex-1 flex-col overflow-auto h-screen bg-[#EDE5DA] relative">
      <div className="bg-[#E8DFD3] border-b border-[#D4C9BB]">
        <SiteHeader>
          <div className={`flex items-center gap-2 ${isMobileSearchOpen ? "hidden md:flex" : "flex"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="text-[#6B5B4E]">POS</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-[#1C1412]" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-bold text-[#1C1412]">
                    Inventory Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Search Bar matching POS style */}
          <div className={`flex items-center ${isMobileSearchOpen ? "w-full md:w-auto" : "ml-auto"}`}>
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
              <div className="relative">
                <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-[#9E8E7E] pointer-events-none" />
                <Input 
                  placeholder="Search inventory..." 
                  className="h-11 bg-[#DDD5C8] w-full md:w-[200px] lg:w-[250px] pl-9 rounded-full border-[#C4B5A5] text-[#2C1F17] placeholder:text-[#9E8E7E] focus-visible:ring-1 focus-visible:ring-[#C4B5A5] touch-manipulation" 
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
        </SiteHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <InventorySystem 
            externalSearchQuery={searchQuery} 
            onAddClick={() => setIsAddOpen(true)}
          />
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Ingredient</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 py-4" onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                <Input name="name" placeholder="e.g. Espresso Beans" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Unit</label>
                <Select name="unit" defaultValue="grams">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <label className="text-xs font-bold uppercase text-muted-foreground">Current Stock</label>
                <Input name="currentStock" type="number" defaultValue={0} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Low Threshold</label>
                <Input name="lowStockThreshold" type="number" defaultValue={100} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Cost per Unit</label>
                <Input name="costPerUnit" type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Supplier</label>
                <Input name="supplier" placeholder="e.g. Nestle" />
              </div>
            </div>
            <DialogFooter className="mt-4 flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 sm:flex-none font-bold">Save Ingredient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
  );
}
