// components/ProductGrid.tsx
import { memo } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/hooks/useCart";

interface ProductItemProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isSelected: boolean;
}

const ProductItem = memo(({ product, onAddToCart, isSelected }: ProductItemProps) => {
  return (
    <div
      onClick={() => product.inStock !== false && onAddToCart(product)}
      className={`group relative flex flex-col rounded-[12px] overflow-hidden cursor-pointer bg-[#F5EFE6] border border-[#DDD5C8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 ${
        isSelected 
          ? "ring-2 ring-[#1C1412] scale-[0.98]" 
          : ""
      } ${product.inStock === false ? "opacity-45 pointer-events-none" : ""}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110`}
        />
        
        {product.inStock === false && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-[#C0392B] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <span className="font-semibold text-[13px] text-[#1C1412] leading-tight truncate">{product.name}</span>
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[#1C1412] tracking-tight">₱{product.price.toFixed(2)}</span>
          <span className="text-[9px] text-[#9E8E7E] font-medium uppercase tracking-wider">{product.category}</span>
        </div>
      </div>
    </div>
  );
});

ProductItem.displayName = "ProductItem";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  selectedProductId: string | null;
  onAddNewClick: () => void;
}

export const ProductGrid = memo(({
  products,
  onAddToCart,
  selectedProductId,
  onAddNewClick,
}: ProductGridProps) => {
  return (
    <div className="grid auto-rows-min gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => (
        <ProductItem 
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          isSelected={selectedProductId === product.id}
        />
      ))}

      {/* Add New Item Button */}
      <button 
        onClick={onAddNewClick}
        className="flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#C4B5A5] bg-white/20 text-[#6B5B4E] hover:border-[#1C1412] hover:text-[#1C1412] hover:bg-[#1C1412]/5 transition-all duration-150 active:scale-[0.98] touch-manipulation h-full min-h-[180px] w-full"
      >
        <Plus className="h-10 w-10" />
        <span className="text-sm font-bold">Add Product</span>
      </button>
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";