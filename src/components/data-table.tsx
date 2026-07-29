import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
  History
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { format } from "date-fns"

export interface TransactionRow {
  id: string
  order_id: string
  timestamp: string
  payment_method: string
  total_amount: number
  items_summary: string
  items_count: number
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
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 transition-colors hover:bg-[#E2D9CC]/30 border-b border-[#DDD5C8]/50 last:border-0"
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
  const { transactions, transactionItems } = useTransactions()
  const isMobile = useIsMobile()
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null)
  
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
        total_amount: t.total_amount,
        items_summary: itemsSummary,
        items_count: itemsCount
      }
    })
  }, [transactions, transactionItems])

  const selectedTransaction = React.useMemo(() => 
    transactions.find(t => t.id === selectedTransactionId),
  [transactions, selectedTransactionId])

  const selectedItems = React.useMemo(() => 
    transactionItems.filter(i => i.transaction_id === selectedTransactionId),
  [transactionItems, selectedTransactionId])

  const columns: ColumnDef<TransactionRow>[] = React.useMemo(() => [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      accessorKey: "order_id",
      header: "Order ID",
      cell: ({ row }) => (
        <span className="font-bold text-[#1C1412] text-sm">{row.original.order_id}</span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp)
        const timeStr = format(date, "hh:mm a")
        return (
          <span className="text-[#6B5B4E] font-medium text-xs">
            {timeStr}
          </span>
        )
      },
    },
    {
      accessorKey: "payment_method",
      header: "Payment Status",
      cell: ({ row }) => {
        const method = row.original.payment_method || 'Unknown'
        const label = `Paid (${method.toUpperCase()})`
        return (
          <Badge variant="outline" className="px-1.5 font-black text-[10px] uppercase border-[#D4C9BB] bg-[#E8DFD3]/50 text-[#5C4A38]">
            <CircleCheckIcon className="size-3 fill-current mr-1" />
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "items_summary",
      header: "Items",
      cell: ({ row }) => (
        <div className="flex flex-col py-1 max-w-[150px] sm:max-w-none">
          <span className="font-bold text-[#1C1412] text-sm">{row.original.items_count} items</span>
          <span className="text-[11px] text-[#6B5B4E] truncate">
            {row.original.items_summary}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="w-full text-right">Total Amount</div>,
      cell: ({ row }) => (
        <div className="w-full text-right font-black text-lg text-[#1C1412]">
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
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <EllipsisVerticalIcon className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => setSelectedTransactionId(row.original.id)}>
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [])

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      order_id: false,
    })

  React.useEffect(() => {
    if (isMobile) {
      setColumnVisibility((prev) => ({
        ...prev,
        payment_method: false,
      }))
    } else {
      setColumnVisibility((prev) => ({
        ...prev,
        payment_method: true,
      }))
    }
  }, [isMobile])

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  
  const [tableData, setTableData] = React.useState(data)
  React.useEffect(() => {
    setTableData(data)
  }, [data])

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => tableData.map(({ id }) => id),
    [tableData]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setTableData((prev) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h2 className="text-xl font-black text-[#1C1412]">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-[#E8DFD3] border-[#D4C9BB] text-[#6B5B4E] font-bold">
                <Columns3Icon data-icon="inline-start" />
                Columns
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-[#F5EFE6] border-[#DDD5C8]">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-[#6B5B4E] focus:bg-[#E8DFD3]"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace("_", " ")}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-xl border border-[#DDD5C8] bg-[#F5EFE6] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-[#E8DFD3]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-[#D4C9BB] hover:bg-transparent">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan} className="text-[11px] font-bold uppercase text-[#9E8E7E]">
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
                      className="h-24 text-center text-[#9E8E7E] font-medium"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Order Details {selectedTransaction?.order_id}
            </DialogTitle>
            <DialogDescription>
              Transaction processed on {selectedTransaction && format(new Date(selectedTransaction.timestamp), "MMM d, yyyy · hh:mm a")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status & Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Payment Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="font-bold capitalize">{selectedTransaction?.payment_method}</span>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Status</p>
                <div className="flex items-center gap-1 text-green-600">
                  <CircleCheckIcon className="size-4 fill-current" />
                  <span className="font-bold">Completed</span>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground tracking-wider">
                <Package className="size-4" />
                Items Summary
              </div>
              <div className="border rounded-xl divide-y bg-card overflow-hidden">
                {selectedItems.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{item.product_name}</span>
                      <span className="text-xs text-muted-foreground">₱{item.price.toFixed(2)} × {item.quantity}</span>
                    </div>
                    <span className="font-black">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-2xl font-black text-primary">
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
    </div>
  )
}
