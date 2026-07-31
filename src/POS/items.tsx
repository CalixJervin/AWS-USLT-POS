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
      className={`group relative flex flex-col rounded-[12px] overflow-hidden cursor-pointer bg-[#1E2333] border border-[#2D3448] shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-all duration-150 hover:shadow-[0_6px_20px_rgba(230,0,126,0.2)] hover:border-[#E6007E] hover:-translate-y-0.5 ${
        isSelected 
          ? "ring-2 ring-[#E6007E] scale-[0.98]" 
          : ""
      } ${product.inStock === false ? "opacity-45 pointer-events-none" : ""}`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#131824]">
        <img
          src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110`}
        />
        
        {product.inStock === false && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-[#FF3366] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <span className="font-semibold text-[13px] text-[#E2E8F0] leading-tight truncate">{product.name}</span>
        <div className="flex flex-col">
          <span className="text-[14px] font-black text-[#E6007E] tracking-tight">₱{product.price.toFixed(2)}</span>
          <span className="text-[9px] text-[#94A3B8] font-medium uppercase tracking-wider">{product.category}</span>
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
  isKiosk?: boolean;
}

export const ProductGrid = memo(({
  products,
  onAddToCart,
  selectedProductId,
  onAddNewClick,
  isKiosk = false,
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
      {!isKiosk && onAddNewClick && (
        <button 
          onClick={onAddNewClick}
          className="flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#2D3448] bg-[#1E2333]/50 text-[#94A3B8] hover:border-[#E6007E] hover:text-[#E6007E] hover:bg-[#E6007E]/10 transition-all duration-150 active:scale-[0.98] touch-manipulation h-full min-h-[180px] w-full"
        >
          <Plus className="h-10 w-10 text-[#E6007E]" />
          <span className="text-sm font-bold text-[#E2E8F0]">Add Product</span>
        </button>
      )}
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";