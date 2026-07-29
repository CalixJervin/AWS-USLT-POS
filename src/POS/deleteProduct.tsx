import type { Product } from "@/hooks/useCart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  product: Product | null;
}

export default function DeleteProductModal({ 
    isOpen, 
    onOpenChange, 
    onDeleteProduct, 
    product }: DeleteProductModalProps) {

const handleDeleteitem = async () => {
    if (!product) return;

    try {
        await onDeleteProduct(product.id);
        onOpenChange(false);
    } catch (error) {
        console.error("Failed to delete product:", error);
    }
}
        return(
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Product</DialogTitle>
                </DialogHeader>
                <p>Are you sure you want to delete <strong>{product?.name}</strong>?</p>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteitem}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

