// components/ProductGrid.tsx
import { memo, useMemo } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/hooks/useCart";

interface ProductItemProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isSelected: boolean;
}

// 1. Grid Item (Vertical Card for Featured Categories like Pastries, Best Sellers, etc.)
const ProductItemGrid = memo(({ product, onAddToCart, isSelected }: ProductItemProps) => {
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
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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

ProductItemGrid.displayName = "ProductItemGrid";

// 2. Horizontal List Item (1-Column Row for categories like Drinks, Specials, Coffee, etc.)
const ProductItemList = memo(({ product, onAddToCart, isSelected }: ProductItemProps) => {
  return (
    <div
      onClick={() => product.inStock !== false && onAddToCart(product)}
      className={`group relative flex flex-row items-center justify-between p-3.5 sm:p-4 rounded-[12px] overflow-hidden cursor-pointer bg-[#1E2333] border border-[#2D3448] shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-all duration-150 hover:shadow-[0_6px_20px_rgba(230,0,126,0.2)] hover:border-[#E6007E] hover:-translate-y-0.5 ${
        isSelected 
          ? "ring-2 ring-[#E6007E] scale-[0.98]" 
          : ""
      } ${product.inStock === false ? "opacity-45 pointer-events-none" : ""}`}
    >
      <div className="flex flex-col gap-1 pr-3 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[14px] sm:text-[15px] text-[#E2E8F0] leading-tight truncate">
            {product.name}
          </span>
          {product.inStock === false && (
            <span className="bg-[#FF3366] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0">
              Out of Stock
            </span>
          )}
        </div>
        <span className="text-[15px] sm:text-[16px] font-black text-[#E6007E] tracking-tight">
          ₱{product.price.toFixed(2)}
        </span>
        <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
          {product.category}
        </span>
      </div>

      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-[#131824] shrink-0 border border-[#232A3B]">
        <img
          src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
    </div>
  );
});

ProductItemList.displayName = "ProductItemList";

// Helper function to check whether a category should use 2-column grid or 1-column list format
export const isGridCategory = (categoryName: string): boolean => {
  const lower = categoryName.toLowerCase();
  const listKeywords = ["drink", "beverage", "special", "coffee", "tea", "juice", "add-on", "side"];
  if (listKeywords.some(keyword => lower.includes(keyword))) {
    return false;
  }
  return true;
};

interface ProductGridProps {
  products: Product[];
  categories?: string[];
  onAddToCart: (product: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  selectedProductId: string | null;
  onAddNewClick: () => void;
  isKiosk?: boolean;
}

export const ProductGrid = memo(({
  products,
  categories,
  onAddToCart,
  selectedProductId,
  onAddNewClick,
  isKiosk = false,
}: ProductGridProps) => {
  // Group products by category, ensuring all known categories are represented
  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();

    // 1. Pre-initialize categories if provided
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (cat) {
          map.set(cat, []);
        }
      }
    }

    // 2. Populate products into their respective category arrays
    for (const product of products) {
      const cat = product.category || "Uncategorized";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(product);
    }

    return Array.from(map.entries());
  }, [products, categories]);

  if (groupedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[#131824] rounded-2xl border border-[#232A3B] p-8 my-4">
        <p className="text-[#94A3B8] font-semibold text-base">No items found</p>
        <p className="text-[#64748B] text-xs mt-1">Try searching for a different keyword or adding products</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {groupedProducts.map(([categoryName, categoryItems]) => {
        const useGrid = isGridCategory(categoryName);
        const sectionId = `category-section-${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`;
        const hasItems = categoryItems.length > 0;

        return (
          <section 
            key={categoryName} 
            id={sectionId}
            data-category-name={categoryName}
            className="flex flex-col gap-4 scroll-mt-24"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-[#232A3B] pb-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#E2E8F0] tracking-tight">
                {categoryName}
              </h2>
              {hasItems && (
                <span className="text-xs font-semibold text-[#94A3B8] bg-[#1E2333] px-2.5 py-1 rounded-full border border-[#2D3448]">
                  {categoryItems.length} {categoryItems.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            {/* Display Items or Empty/Unavailable State */}
            {hasItems ? (
              useGrid ? (
                /* 2-Column Grid Layout for featured categories */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {categoryItems.map((product) => (
                    <ProductItemGrid 
                      key={product.id}
                      product={product}
                      onAddToCart={onAddToCart}
                      isSelected={selectedProductId === product.id}
                    />
                  ))}
                </div>
              ) : (
                /* 1-Column Horizontal List Layout for categories */
                <div className="flex flex-col gap-3">
                  {categoryItems.map((product) => (
                    <ProductItemList
                      key={product.id}
                      product={product}
                      onAddToCart={onAddToCart}
                      isSelected={selectedProductId === product.id}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Empty Category: Show Unavailable Badge */
              <div className="w-full py-4 text-center text-[#94A3B8]">
                Unavailable
              </div>
            )}
          </section>
        );
      })}

      {/* Add New Item Button for Non-Kiosk Staff Mode */}
      {!isKiosk && onAddNewClick && (
        <div className="mt-2">
          <button 
            onClick={onAddNewClick}
            className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#2D3448] bg-[#1E2333]/50 text-[#94A3B8] hover:border-[#E6007E] hover:text-[#E6007E] hover:bg-[#E6007E]/10 transition-all duration-150 active:scale-[0.98] touch-manipulation p-4 w-full cursor-pointer"
          >
            <Plus className="h-5 w-5 text-[#E6007E]" />
            <span className="text-sm font-bold text-[#E2E8F0]">Add New Product</span>
          </button>
        </div>
      )}
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";