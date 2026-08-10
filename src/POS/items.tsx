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
      className={`group relative flex flex-col w-full rounded-2xl overflow-hidden cursor-pointer bg-[#1E2333] border border-[#2D3448] shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-colors hover:border-[#E6007E] ${
        isSelected 
          ? "ring-2 ring-[#E6007E]" 
          : ""
      } ${product.inStock === false ? "opacity-45 pointer-events-none" : ""}`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#131824] shrink-0">
        <img
          src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        
        {product.inStock === false && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <span className="bg-[#FF3366] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1 shrink-0">
        <span className="font-semibold text-sm text-[#E2E8F0] leading-tight truncate">{product.name}</span>
        <div className="flex flex-col">
          <span className="text-base font-black text-[#E6007E] tracking-tight">₱{product.price.toFixed(2)}</span>
          <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">{product.category}</span>
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
      className={`group relative flex flex-row items-center justify-between p-4 sm:p-4.5 rounded-2xl overflow-hidden cursor-pointer bg-[#1E2333] border border-[#2D3448] shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-colors hover:border-[#E6007E] ${
        isSelected 
          ? "ring-2 ring-[#E6007E]" 
          : ""
      } ${product.inStock === false ? "opacity-45 pointer-events-none" : ""}`}
    >
      <div className="flex flex-col gap-1 pr-3 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px] sm:text-[16px] text-[#E2E8F0] leading-tight truncate">
            {product.name}
          </span>
          {product.inStock === false && (
            <span className="bg-[#FF3366] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0">
              Out of Stock
            </span>
          )}
        </div>
        <span className="text-[16px] sm:text-[17px] font-black text-[#E6007E] tracking-tight">
          ₱{product.price.toFixed(2)}
        </span>
        <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
          {product.category}
        </span>
      </div>

      <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-[#131824] shrink-0 border border-[#232A3B]">
        <img
          src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
});

ProductItemList.displayName = "ProductItemList";

// Skeleton Loaders to prevent Cumulative Layout Shift (CLS)
export const ProductItemGridSkeleton = () => (
  <div className="flex flex-col w-full rounded-2xl overflow-hidden bg-[#1E2333]/60 border border-[#2D3448] animate-pulse">
    <div className="aspect-square bg-[#131824] w-full" />
    <div className="p-3.5 flex flex-col gap-2">
      <div className="h-4 bg-[#2D3448] rounded-md w-3/4" />
      <div className="h-4 bg-[#E6007E]/30 rounded-md w-1/2" />
    </div>
  </div>
);

export const ProductItemListSkeleton = () => (
  <div className="flex flex-row items-center justify-between p-4 sm:p-4.5 rounded-2xl bg-[#1E2333]/60 border border-[#2D3448] animate-pulse">
    <div className="flex flex-col gap-2 flex-1 pr-3">
      <div className="h-4 bg-[#2D3448] rounded-md w-2/3" />
      <div className="h-4 bg-[#E6007E]/30 rounded-md w-1/3" />
      <div className="h-3 bg-[#2D3448]/60 rounded-md w-1/4" />
    </div>
    <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-xl bg-[#131824] shrink-0 border border-[#232A3B]" />
  </div>
);

export const ProductGridSkeleton = ({ categories }: { categories?: string[] }) => {
  // If categories are provided, render matching skeleton shapes in category order
  if (categories && categories.length > 0) {
    return (
      <div className="flex flex-col gap-8 w-full pb-8">
        {categories.map((catName) => {
          const useGrid = isGridCategory(catName);
          return (
            <div key={catName} className="flex flex-col gap-4">
              <div className="border-b border-[#232A3B] pb-2">
                <div className="h-6 bg-[#2D3448] rounded-md w-36 animate-pulse" />
              </div>
              {useGrid ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,160px))] gap-4">
                  {[...Array(4)].map((_, i) => (
                    <ProductItemGridSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <ProductItemListSkeleton />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Default layout: Long horizontal list skeleton APPEARS ONLY ONCE at TOP, followed by grid square skeletons
  return (
    <div className="flex flex-col gap-8 w-full pb-8">
      {/* 1. Long horizontal list skeleton (APPEARS ONLY ONCE AT TOP) */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-[#232A3B] pb-2">
          <div className="h-6 bg-[#2D3448] rounded-md w-44 animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          <ProductItemListSkeleton />
        </div>
      </div>

      {/* 2. Grid card skeletons below */}
      <div className="flex flex-col gap-4">
        <div className="border-b border-[#232A3B] pb-2">
          <div className="h-6 bg-[#2D3448] rounded-md w-36 animate-pulse" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,160px))] gap-4">
          {[...Array(6)].map((_, i) => (
            <ProductItemGridSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

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
  isLoading?: boolean;
}

export const ProductGrid = memo(({
  products,
  categories,
  onAddToCart,
  selectedProductId,
  onAddNewClick,
  isKiosk = false,
  isLoading = false,
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

    // 3. Sort items deterministically by ID within each category
    for (const items of map.values()) {
      items.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    }

    return Array.from(map.entries());
  }, [products, categories]);

  if (isLoading) {
    return <ProductGridSkeleton categories={categories} />;
  }

  if (groupedProducts.length === 0) {
    return (
      <div className="flex flex-col gap-8 w-full pb-8">
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[#131824] rounded-2xl border border-[#232A3B] p-8 my-4">
          <p className="text-[#94A3B8] font-semibold text-base">No items found</p>
          <p className="text-[#64748B] text-xs mt-1">Try searching for a different keyword or adding products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-8">
      {groupedProducts.map(([categoryName, categoryItems]) => {
        const useGrid = isGridCategory(categoryName);
        const sectionId = `category-section-${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`;
        const hasItems = categoryItems.length > 0;

        if (!hasItems) return null;

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
            </div>

            {/* Display Items */}
            {useGrid ? (
              /* Grid Layout with set product card dimensions */
              <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,160px))] gap-4">
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