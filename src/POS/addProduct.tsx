import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useInventory } from "@/hooks/useInventory";
import { AddProductWizard } from "@/components/inventory/AddProductWizard";

interface AddProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (productData: any) => void;
  categories: string[];
}

export function AddProductModal({
  isOpen,
  onOpenChange,
  onAddProduct,
  categories,
}: AddProductModalProps) {
  const { ingredients, recipes, addRecipe } = useInventory();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] w-[calc(100%-32px)] p-0 overflow-hidden bg-[#1E2333] border border-[#2D3448] rounded-[16px] shadow-2xl max-h-[90vh] flex flex-col text-[#E2E8F0]">
        <DialogHeader className="p-5 pb-0 flex flex-row items-center justify-between border-b border-[#232A3B] bg-[#131824]">
          <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Add New Product</DialogTitle>
        </DialogHeader>
        <AddProductWizard 
          ingredients={ingredients}
          recipes={recipes}
          categories={categories}
          onComplete={async (productData) => {
            await onAddProduct(productData);
            onOpenChange(false);
          }}
          onAddRecipe={addRecipe}
        />
      </DialogContent>
    </Dialog>
  );
}
