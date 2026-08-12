import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
  type SortingState,
  type Row,
} from "@tanstack/react-table"
import { useTransactions } from "@/hooks/useTransactions"
import { InventoryContext } from "@/context/InventoryContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  GripVerticalIcon,
  EllipsisVerticalIcon, 
  Columns3Icon, 
  ChevronDownIcon, 
  ChevronsLeftIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronsRightIcon, 
  CircleCheckIcon, 
  Package,
  CreditCard,
  History,
  FileSpreadsheet,
  Trash2,
  Trash,
  AlertTriangle,
  Utensils,
  Shirt,
  Filter,
  Eye
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { format } from "date-fns"

export interface TransactionRow {
  id: string
  order_id: string
  timestamp: string
  payment_method: string
  status?: string
  payment_status?: string
  total_amount: number
  items_summary: string
  items_count: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  fulfillment_status?: string
  is_pre_order?: boolean
  gcash_ref_number?: string
  gcash_receipt_url?: string
}

// Create a separate component for the drag handle
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function DraggableRow({ row }: { row: Row<TransactionRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 transition-colors border-b border-[#232A3B] last:border-0 ${row.getIsSelected() ? "bg-[#282E42]" : "hover:bg-[#282E42]"}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="py-3">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable() {
  const { 
    transactions, 
    transactionItems, 
    deleteTransaction, 
    deleteSelectedTransactions, 
    clearTransactions,
    updatePreOrderPaymentStatus,
    exportToExcel 
  } = useTransactions()

  const isMobile = useIsMobile()
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null)
  
  // Modal states for delete options
  const [singleDeleteId, setSingleDeleteId] = React.useState<string | null>(null)
  const [isSingleDeleteOpen, setIsSingleDeleteOpen] = React.useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false)

  // Clear All Modal state & Extra level of confirmation
  const [isClearAllOpen, setIsClearAllOpen] = React.useState(false)
  const [clearAllStep, setClearAllStep] = React.useState<1 | 2>(1)
  const [clearAllConfirmText, setClearAllConfirmText] = React.useState("")

  const [rowSelection, setRowSelection] = React.useState({})
  
  const data = React.useMemo(() => {
    return transactions.map(t => {
      const items = transactionItems.filter(item => item.transaction_id === t.id)
      const itemsSummary = items.map(i => `${i.quantity} ${i.product_name}`).join(", ")
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0)
      
      return {
        id: t.id,
        order_id: t.order_id,
        timestamp: t.timestamp,
        payment_method: t.payment_method,
        status: t.status,
        payment_status: t.payment_status,
        total_amount: t.total_amount,
        items_summary: itemsSummary,
        items_count: itemsCount,
        customer_name: t.customer_name,
        customer_email: t.customer_email,
        customer_phone: t.customer_phone,
        fulfillment_status: t.fulfillment_status,
        is_pre_order: t.is_pre_order,
        gcash_ref_number: t.gcash_ref_number,
        gcash_receipt_url: t.gcash_receipt_url
      }
    })
  }, [transactions, transactionItems])

  const selectedTransaction = React.useMemo(() => 
    transactions.find(t => t.id === selectedTransactionId),
  [transactions, selectedTransactionId])

  const selectedItems = React.useMemo(() => 
    transactionItems.filter(i => i.transaction_id === selectedTransactionId),
  [transactionItems, selectedTransactionId])

  const targetSingleTx = React.useMemo(() => 
    transactions.find(t => t.id === singleDeleteId),
  [transactions, singleDeleteId])

  const columns: ColumnDef<TransactionRow>[] = React.useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="accent-[#00F2FE] h-4 w-4 rounded cursor-pointer"
          checked={row.getIsSelected()}
          onChange={(e) => {
            e.stopPropagation();
            row.toggleSelected(!!e.target.checked);
          }}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      accessorKey: "order_id",
      header: "Order ID",
      cell: ({ row }) => (
        <span className="font-bold text-[#E2E8F0] text-sm">{row.original.order_id}</span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "customer_name",
      header: "Customer Contact",
      cell: ({ row }) => {
        const name = row.original.customer_name;
        const phone = row.original.customer_phone;
        const email = row.original.customer_email;

        if (!name && !phone && !email) {
          return <span className="text-[#64748B] text-xs italic">N/A</span>;
        }

        return (
          <div className="flex flex-col py-1 text-xs gap-0.5 max-w-[200px]">
            {name && <span className="font-bold text-[#00F2FE] text-xs truncate">{name}</span>}
            {phone && <span className="text-[11px] text-[#94A3B8] font-medium">📞 {phone}</span>}
            {email && <span className="text-[11px] text-[#64748B] truncate">✉️ {email}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp)
        const timeStr = format(date, "hh:mm a")
        return (
          <span className="text-[#94A3B8] font-medium text-xs">
            {timeStr}
          </span>
        )
      },
    },
    {
      accessorKey: "payment_method",
      header: "Payment Status",
      cell: ({ row }) => {
        const currentPayStatus = row.original.payment_status || "Paid";

        return (
          <Select
            value={currentPayStatus}
            onValueChange={(newVal) => {
              updatePreOrderPaymentStatus(row.original.id, row.original.order_id, newVal);
            }}
          >
            <SelectTrigger
              className={`h-7 px-2.5 text-[10px] font-black uppercase rounded-full border cursor-pointer transition-all ${
                currentPayStatus === "Paid" || currentPayStatus === "Completed"
                  ? "bg-[#00E676]/20 text-[#00E676] border-[#00E676]/50 hover:bg-[#00E676]/30 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                  : currentPayStatus === "Pending Verification"
                  ? "bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/50 hover:bg-[#00F2FE]/30 shadow-[0_0_10px_rgba(0,242,254,0.2)]"
                  : currentPayStatus === "Unpaid"
                  ? "bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/50 hover:bg-[#FF9900]/30 shadow-[0_0_10px_rgba(255,153,0,0.2)]"
                  : "bg-[#E6007E]/20 text-[#E6007E] border-[#E6007E]/50 hover:bg-[#E6007E]/30 shadow-[0_0_10px_rgba(230,0,126,0.2)]"
              }`}
            >
              <div className="flex items-center gap-1">
                <CircleCheckIcon className="size-3 fill-current shrink-0" />
                <SelectValue placeholder={currentPayStatus} />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
              <SelectItem value="Paid" className="text-[#00E676] font-black text-xs cursor-pointer focus:bg-[#131824]">
                PAID
              </SelectItem>
              <SelectItem value="Pending Verification" className="text-[#00F2FE] font-black text-xs cursor-pointer focus:bg-[#131824]">
                PENDING VERIFICATION
              </SelectItem>
              <SelectItem value="Cash Pending" className="text-[#E6007E] font-black text-xs cursor-pointer focus:bg-[#131824]">
                CASH PENDING
              </SelectItem>
              <SelectItem value="Unpaid" className="text-[#FF9900] font-black text-xs cursor-pointer focus:bg-[#131824]">
                UNPAID (PAY LATER)
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "gcash_info",
      header: "GCash / Ref Info",
      cell: ({ row }) => {
        const refNum = row.original.gcash_ref_number;
        const receiptUrl = row.original.gcash_receipt_url;

        if (!refNum && !receiptUrl) {
          if (row.original.payment_status === "Unpaid") {
            return <span className="text-[#FF9900] text-xs font-semibold italic">Unpaid (No Ref/Receipt)</span>;
          }
          return <span className="text-[#64748B] text-xs italic">N/A</span>;
        }

        return (
          <div className="flex items-center gap-2 py-1 max-w-[220px]">
            {receiptUrl ? (
              <img
                src={receiptUrl}
                alt="Receipt Screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewReceiptModalUrl(receiptUrl);
                }}
                className="w-10 h-10 object-cover rounded-lg border-2 border-[#00F2FE]/60 cursor-pointer hover:scale-110 transition-transform shrink-0 shadow-md"
                title="Click to view full screenshot"
              />
            ) : null}
            <div className="flex flex-col text-xs min-w-0">
              {refNum ? (
                <span className="font-mono font-bold text-[#00F2FE] text-xs truncate" title={refNum}>
                  Ref: {refNum}
                </span>
              ) : (
                <span className="text-[#94A3B8] text-[11px]">No Ref #</span>
              )}
              {receiptUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewReceiptModalUrl(receiptUrl);
                  }}
                  className="text-[10px] text-[#00F2FE] hover:underline text-left font-semibold flex items-center gap-1 cursor-pointer mt-0.5"
                >
                  <Eye className="size-3 text-[#00F2FE]" />
                  View Screenshot
                </button>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "items_summary",
      header: "Items",
      cell: ({ row }) => (
        <div className="flex flex-col py-1 max-w-[150px] sm:max-w-none">
          <span className="font-bold text-[#E2E8F0] text-sm">{row.original.items_count} items</span>
          <span className="text-[11px] text-[#94A3B8] truncate">
            {row.original.items_summary}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="w-full text-right">Total Amount</div>,
      cell: ({ row }) => (
        <div className="w-full text-right font-black text-lg text-[#E6007E]">
          ₱{row.original.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-[#94A3B8] hover:text-[#E2E8F0] data-[state=open]:bg-[#131824]"
              size="icon"
            >
              <EllipsisVerticalIcon className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-[#1E2333] border-[#2D3448]">
            <DropdownMenuItem 
              className="cursor-pointer text-[#E2E8F0] focus:bg-[#131824]"
              onClick={() => setSelectedTransactionId(row.original.id)}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer text-[#FF3366] focus:bg-[#FF3366]/10 font-medium"
              onClick={() => {
                setSingleDeleteId(row.original.id);
                setIsSingleDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [])

  const inventoryCtx = React.useContext(InventoryContext);
  const products = inventoryCtx?.products || [];

  // Category Filter State: "foods" | "merch" | "all"
  const [transactionCategory, setTransactionCategory] = React.useState<"foods" | "merch" | "all">("foods");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>("all");
  const [selectedProductFilter, setSelectedProductFilter] = React.useState<string>("all");

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      order_id: false,
      customer_name: false,
    })

  React.useEffect(() => {
    setColumnVisibility((prev) => ({
      ...prev,
      payment_method: !isMobile,
      customer_name: true,
      gcash_info: true,
    }))
  }, [isMobile])

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [viewReceiptModalUrl, setViewReceiptModalUrl] = React.useState<string | null>(null)

  // Switch Category & Reset Product / Menu Category Filters
  const handleCategoryChange = (cat: "foods" | "merch" | "all") => {
    setTransactionCategory(cat);
    setSelectedCategoryFilter("all");
    setSelectedProductFilter("all");
  };

  // Base Category Filtered Data
  const categoryFilteredData = React.useMemo(() => {
    if (transactionCategory === "foods") {
      return data.filter(d => !d.is_pre_order);
    }
    if (transactionCategory === "merch") {
      return data.filter(d => d.is_pre_order);
    }
    return data;
  }, [data, transactionCategory]);

  // Helper to resolve product category
  const getItemCategory = React.useCallback((item: { product_id?: string; product_name: string }) => {
    const matchedProduct = products.find(
      p => (item.product_id && p.id === item.product_id) || p.name.toLowerCase() === item.product_name.toLowerCase()
    );
    if (matchedProduct && matchedProduct.category) {
      return matchedProduct.category;
    }
    const nameLower = item.product_name.toLowerCase();
    if (nameLower.includes("shirt") || nameLower.includes("apparel") || nameLower.includes("t-shirt") || nameLower.includes("merch")) {
      return "Merch";
    }
    return "General";
  }, [products]);

  // Extract unique categories for current transaction category view
  const availableMenuCategories = React.useMemo(() => {
    const categoryTxIds = new Set(categoryFilteredData.map(d => d.id));
    const itemsInCat = transactionItems.filter(item => categoryTxIds.has(item.transaction_id));
    const catNames = Array.from(new Set(itemsInCat.map(i => getItemCategory(i)))).filter(Boolean);
    return catNames.sort();
  }, [categoryFilteredData, transactionItems, getItemCategory]);

  // Filter Data by Menu Category
  const menuCategoryFilteredData = React.useMemo(() => {
    if (selectedCategoryFilter === "all") {
      return categoryFilteredData;
    }
    return categoryFilteredData.filter(d => {
      const items = transactionItems.filter(i => i.transaction_id === d.id);
      return items.some(i => getItemCategory(i).toLowerCase() === selectedCategoryFilter.toLowerCase());
    });
  }, [categoryFilteredData, selectedCategoryFilter, transactionItems, getItemCategory]);

  // Extract unique products for current menu category view
  const availableProducts = React.useMemo(() => {
    const activeTxIds = new Set(menuCategoryFilteredData.map(d => d.id));
    const itemsInCat = transactionItems.filter(item => activeTxIds.has(item.transaction_id));
    const prodNames = Array.from(new Set(itemsInCat.map(i => i.product_name))).filter(Boolean);
    return prodNames.sort();
  }, [menuCategoryFilteredData, transactionItems]);

  // Final Filtered Data applying Product Filter
  const filteredData = React.useMemo(() => {
    if (selectedProductFilter === "all") {
      return menuCategoryFilteredData;
    }
    return menuCategoryFilteredData.filter(d => {
      const items = transactionItems.filter(i => i.transaction_id === d.id);
      return items.some(i => i.product_name.toLowerCase().includes(selectedProductFilter.toLowerCase()));
    });
  }, [menuCategoryFilteredData, selectedProductFilter, transactionItems]);

  // Table Total Amount per active table view
  const tableTotalAmount = React.useMemo(() => {
    return filteredData.reduce((sum, d) => sum + d.total_amount, 0);
  }, [filteredData]);

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => filteredData.map(({ id }) => id),
    [filteredData]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getCoreRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedIds = React.useMemo(() => selectedRows.map(r => r.original.id), [selectedRows])

  const filteredTransactions = React.useMemo(() => {
    const ids = new Set(filteredData.map(d => d.id));
    return transactions.filter(t => ids.has(t.id));
  }, [transactions, filteredData]);

  const categoryLabel = transactionCategory === "foods" 
    ? "Transactions" 
    : transactionCategory === "merch" 
    ? "Pre-Orders" 
    : "All Transactions";

  function handleDragEnd() {
    // Row reordering handle
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div>
            <h2 className="text-xl font-black text-[#E2E8F0]">
              {transactionCategory === "foods" ? "Transactions" : transactionCategory === "merch" ? "Pre-Orders Transactions" : "Recent Transactions"}
            </h2>
            {selectedIds.length > 0 && (
              <p className="text-xs text-[#E6007E] font-semibold">{selectedIds.length} record(s) selected</p>
            )}
          </div>

          {/* Table Total Summary Badge */}
          <div className="flex items-center gap-2 bg-[#131824] border border-[#232A3B] px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-inner">
            <span className="text-[#94A3B8]">Table Total:</span>
            <span className="text-[#00E676] font-black text-sm">
              ₱{tableTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[#64748B] text-[11px]">({filteredData.length} {filteredData.length === 1 ? 'order' : 'orders'})</span>
          </div>
        </div>
        
        <div className="flex items-center flex-wrap gap-2">
          {/* CATEGORY FILTER DROPDOWN */}
          {availableMenuCategories.length > 0 && (
            <Select 
              value={selectedCategoryFilter} 
              onValueChange={(cat) => {
                setSelectedCategoryFilter(cat);
                setSelectedProductFilter("all");
              }}
            >
              <SelectTrigger className="w-[180px] h-8 bg-[#131824] border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#1E2333] hover:text-white text-xs font-bold rounded-full px-3 transition-colors cursor-pointer">
                <Filter className="size-3.5 mr-1 text-[#00F2FE]" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                <SelectItem value="all" className="text-xs font-bold cursor-pointer">
                  All Categories ({categoryFilteredData.length})
                </SelectItem>
                {availableMenuCategories.map((catName) => (
                  <SelectItem key={catName} value={catName} className="text-xs font-medium cursor-pointer">
                    {catName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* PRODUCT FILTER DROPDOWN */}
          {availableProducts.length > 0 && (
            <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
              <SelectTrigger className="w-[180px] h-8 bg-[#131824] border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#1E2333] hover:text-white text-xs font-bold rounded-full px-3 transition-colors cursor-pointer">
                <Filter className="size-3.5 mr-1 text-[#00F2FE]" />
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                <SelectItem value="all" className="text-xs font-bold cursor-pointer">
                  All Products ({menuCategoryFilteredData.length})
                </SelectItem>
                {availableProducts.map((prodName) => (
                  <SelectItem key={prodName} value={prodName} className="text-xs font-medium cursor-pointer">
                    {prodName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Export Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-[#00F2FE] text-[#217346] hover:bg-[#38F9FF] border-none font-black gap-1.5 shadow-md rounded-full px-4"
            onClick={() => exportToExcel(
              selectedIds.length > 0 ? selectedIds : undefined,
              filteredTransactions,
              categoryLabel
            )}
          >
            <FileSpreadsheet className="size-4 text-[#217346]" />
            {selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : "Export to Excel"}
          </Button>

          {/* Delete Selected (when rows checked) */}
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="bg-[#FF3366] text-white hover:bg-[#FF1A96] font-bold gap-1.5 rounded-full shadow-sm px-4"
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}

          {/* Clear All Option */}
          {filteredData.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-[#FF3366]/40 text-[#FF3366] hover:bg-[#FF3366]/10 font-bold gap-1.5 rounded-full px-4"
              onClick={() => setIsClearAllOpen(true)}
            >
              <Trash className="size-4 text-[#FF3366]" />
              Delete All
            </Button>
          )}

          {/* CATEGORY VIEWS: "Transactions" vs "Pre-Orders" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-[#131824] border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#1E2333] hover:text-white font-black rounded-full px-4 gap-1.5 shadow-sm cursor-pointer"
              >
                {transactionCategory === "foods" ? (
                  <>
                    <Utensils className="size-4 text-[#00F2FE]" />
                    Transactions
                  </>
                ) : transactionCategory === "merch" ? (
                  <>
                    <Shirt className="size-4 text-[#E6007E]" />
                    Pre-Orders
                  </>
                ) : (
                  <>
                    <Columns3Icon data-icon="inline-start" />
                    All Transactions
                  </>
                )}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#1E2333] border-[#2D3448]">
              <DropdownMenuItem
                className={`cursor-pointer font-bold ${transactionCategory === "foods" ? "text-[#00F2FE] bg-[#131824]" : "text-[#E2E8F0]"}`}
                onClick={() => handleCategoryChange("foods")}
              >
                <Utensils className="size-4 mr-2 text-[#00F2FE]" />
                Transactions ({data.filter(d => !d.is_pre_order).length})
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`cursor-pointer font-bold ${transactionCategory === "merch" ? "text-[#E6007E] bg-[#131824]" : "text-[#E2E8F0]"}`}
                onClick={() => handleCategoryChange("merch")}
              >
                <Shirt className="size-4 mr-2 text-[#E6007E]" />
                Pre-Orders ({data.filter(d => d.is_pre_order).length})
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`cursor-pointer font-bold ${transactionCategory === "all" ? "text-[#00F2FE] bg-[#131824]" : "text-[#94A3B8]"}`}
                onClick={() => handleCategoryChange("all")}
              >
                <Columns3Icon className="size-4 mr-2" />
                All Transactions ({data.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-xl border border-[#2D3448] bg-[#1E2333] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-[#131824]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-[#232A3B] hover:bg-transparent">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan} className="text-[11px] font-bold uppercase text-[#94A3B8]">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-[#94A3B8] font-medium"
                    >
                      No transactions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div className="mt-4 flex items-center justify-end px-2">
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-11 w-11 p-0 lg:flex active:scale-95 touch-manipulation"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon className="size-5" />
              </Button>
              <Button
                variant="outline"
                className="h-11 w-11 active:scale-95 touch-manipulation"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="size-5" />
              </Button>
              <Button
                variant="outline"
                className="h-11 w-11 active:scale-95 touch-manipulation"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="size-5" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-11 w-11 lg:flex active:scale-95 touch-manipulation"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransactionId} onOpenChange={(open) => !open && setSelectedTransactionId(null)}>
        <DialogContent className="sm:max-w-md bg-[#FAF6F0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1C1412]">
              <History className="size-5 text-[#6B5B4E]" />
              Order Details {selectedTransaction?.order_id}
            </DialogTitle>
            <DialogDescription className="text-[#6B5B4E]">
              Transaction processed on {selectedTransaction && format(new Date(selectedTransaction.timestamp), "MMM d, yyyy · hh:mm a")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status & Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#E8DFD3]/50 rounded-lg space-y-1 border border-[#D4C9BB]">
                <p className="text-[10px] font-bold uppercase text-[#9E8E7E]">Payment Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-[#6B5B4E]" />
                  <span className="font-bold capitalize text-[#1C1412]">{selectedTransaction?.payment_method}</span>
                </div>
              </div>
              <div className="p-3 bg-[#E8DFD3]/50 rounded-lg space-y-1 border border-[#D4C9BB]">
                <p className="text-[10px] font-bold uppercase text-[#9E8E7E]">Status</p>
                <div className="flex items-center gap-1 text-green-700">
                  <CircleCheckIcon className="size-4 fill-current" />
                  <span className="font-bold">Completed</span>
                </div>
              </div>
            </div>

            {/* GCASH DETAILS & RECEIPT SCREENSHOT */}
            {(selectedTransaction?.gcash_ref_number || selectedTransaction?.gcash_receipt_url) && (
              <div className="p-3 bg-[#E8DFD3]/50 rounded-xl space-y-2 border border-[#D4C9BB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#9E8E7E]">GCash Verification Info</span>
                  {selectedTransaction.gcash_receipt_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewReceiptModalUrl(selectedTransaction.gcash_receipt_url!)}
                      className="h-7 text-xs border-[#6B5B4E] text-[#1C1412] hover:bg-[#6B5B4E]/10 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      <span>View Screenshot</span>
                    </Button>
                  )}
                </div>
                {selectedTransaction.gcash_ref_number && (
                  <p className="text-xs font-mono font-bold text-[#1C1412]">
                    Ref #: <span className="text-blue-700 font-extrabold">{selectedTransaction.gcash_ref_number}</span>
                  </p>
                )}
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#9E8E7E] tracking-wider">
                <Package className="size-4" />
                Items Summary
              </div>
              <div className="border border-[#DDD5C8] rounded-xl divide-y divide-[#DDD5C8] bg-white overflow-hidden">
                {selectedItems.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center hover:bg-[#FAF6F0]">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[#1C1412]">{item.product_name}</span>
                      <span className="text-xs text-[#6B5B4E]">₱{item.price.toFixed(2)} × {item.quantity}</span>
                    </div>
                    <span className="font-black text-[#1C1412]">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-[#1C1412]/5 border border-[#1C1412]/20 rounded-xl flex justify-between items-center">
              <span className="text-base font-bold text-[#1C1412]">Total Amount</span>
              <span className="text-2xl font-black text-[#1C1412]">
                ₱{selectedTransaction?.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedTransactionId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SINGLE DELETE CONFIRMATION DIALOG */}
      <Dialog open={isSingleDeleteOpen} onOpenChange={setIsSingleDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-[#FAF6F0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
              <AlertTriangle className="size-5 text-red-600" />
              Delete Transaction Record
            </DialogTitle>
            <DialogDescription className="py-2 text-[#6B5B4E]">
              Are you sure you want to delete transaction <strong>{targetSingleTx?.order_id}</strong> (₱{targetSingleTx?.total_amount.toFixed(2)})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSingleDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                if (singleDeleteId) {
                  await deleteTransaction(singleDeleteId);
                  setSingleDeleteId(null);
                  setIsSingleDeleteOpen(false);
                }
              }}
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE CONFIRMATION DIALOG */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-[#FAF6F0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
              <AlertTriangle className="size-5 text-red-600" />
              Delete Selected Transactions
            </DialogTitle>
            <DialogDescription className="py-2 text-[#6B5B4E]">
              Are you sure you want to delete <strong>{selectedIds.length} selected transaction record(s)</strong>? This action will permanently remove these records and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                await deleteSelectedTransactions(selectedIds);
                setRowSelection({});
                setIsBulkDeleteOpen(false);
              }}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLEAR ALL CONFIRMATION DIALOG - 2-STEP STRICT CONFIRMATION */}
      <Dialog 
        open={isClearAllOpen} 
        onOpenChange={(open) => {
          setIsClearAllOpen(open)
          if (!open) {
            setClearAllStep(1)
            setClearAllConfirmText("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#FAF6F0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
              <AlertTriangle className="size-5 text-red-600 shrink-0" />
              {clearAllStep === 1 ? "Delete All Transaction History" : "Final Deletion Confirmation"}
            </DialogTitle>
            <DialogDescription className="py-2 text-[#6B5B4E]">
              {clearAllStep === 1 ? (
                <>
                  Are you sure you want to delete <strong>ALL transaction history</strong>? This will permanently wipe all order records from the database and local storage.
                </>
              ) : (
                <>
                  This action is <strong>irreversible</strong>. To confirm wiping your entire sales history, please type <strong className="text-red-600 font-mono">DELETE</strong> below.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {clearAllStep === 1 ? (
            <div className="py-2 text-xs text-red-700 bg-red-100 border border-red-300 rounded-lg p-3 font-medium">
              ⚠️ <strong>High-Risk Warning:</strong> You are about to permanently erase {data.length} transaction record(s). All revenue metrics and sales logs will be reset.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="py-2 text-xs text-red-700 bg-red-100 border border-red-300 rounded-lg p-3 font-bold">
                🚨 Strict Verification Required: Type &quot;DELETE&quot; in capital letters to unlock the wipe button.
              </div>
              <Input
                type="text"
                placeholder='Type "DELETE" to confirm'
                value={clearAllConfirmText}
                onChange={(e) => setClearAllConfirmText(e.target.value)}
                className="border-red-400 focus-visible:ring-red-500 bg-white text-black font-mono text-sm"
              />
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                if (clearAllStep === 2) {
                  setClearAllStep(1)
                } else {
                  setIsClearAllOpen(false)
                }
              }}
            >
              {clearAllStep === 2 ? "Back" : "Cancel"}
            </Button>

            {clearAllStep === 1 ? (
              <Button 
                variant="destructive"
                onClick={() => setClearAllStep(2)}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                Proceed to Final Confirmation →
              </Button>
            ) : (
              <Button 
                variant="destructive"
                disabled={clearAllConfirmText.trim().toUpperCase() !== "DELETE"}
                onClick={async () => {
                  await clearTransactions()
                  setRowSelection({})
                  setIsClearAllOpen(false)
                  setClearAllStep(1)
                  setClearAllConfirmText("")
                }}
                className="bg-red-700 hover:bg-red-800 text-white font-black disabled:opacity-40"
              >
                Permanently Wipe All Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GCASH RECEIPT SCREENSHOT LIGHTBOX */}
      <Dialog open={Boolean(viewReceiptModalUrl)} onOpenChange={(open) => { if (!open) setViewReceiptModalUrl(null); }}>
        <DialogContent className="sm:max-w-xl bg-[#131824] border-[#00F2FE]/40 text-[#E2E8F0] p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
          <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-[#232A3B] pb-3">
            <DialogTitle className="text-base font-extrabold text-[#E2E8F0] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#00F2FE]" />
              GCash Receipt Screenshot
            </DialogTitle>
          </DialogHeader>

          {viewReceiptModalUrl && (
            <div className="w-full flex flex-col items-center gap-3">
              <img
                src={viewReceiptModalUrl}
                alt="Submitted GCash Receipt"
                className="max-h-[65vh] w-auto object-contain rounded-xl border border-[#232A3B] bg-black/40 shadow-lg"
              />
              <div className="flex gap-2 w-full justify-end pt-2 border-t border-[#232A3B]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReceiptModalUrl(null)}
                  className="text-xs font-bold border-[#2D3448] text-[#E2E8F0] hover:bg-[#1E2333] h-9 px-4 rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
