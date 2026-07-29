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
      <DialogContent className="max-w-[480px] w-[calc(100%-32px)] p-0 overflow-hidden bg-[#FAF6F0] border-none rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-[#1C1412] text-lg font-bold">Add New Product</DialogTitle>
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
