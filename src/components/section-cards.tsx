import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, ShoppingCart, DollarSign, Package, BarChart3 } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"

export function SectionCards() {
  const { metrics } = useTransactions();

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Sales */}
      <Card className="@container/card bg-[#F5EFE6] border-[#DDD5C8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#6B5B4E] font-bold uppercase text-[10px] tracking-widest">
            <DollarSign className="size-3.5 text-[#D4A574]" />
            Total Sales
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#1C1412] @[250px]/card:text-3xl">
            ₱{metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#9E8E7E] border-[#D4C9BB] bg-[#E8DFD3]/50 text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1" />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#E8DFD3]/30 border-t border-[#DDD5C8]/50 mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#5C4A38]">
            Total money earned
          </div>
          <div className="text-[#9E8E7E] text-[11px]">
            Sum of total_amount from transactions
          </div>
        </CardFooter>
      </Card>

      {/* Total Orders */}
      <Card className="@container/card bg-[#F5EFE6] border-[#DDD5C8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#6B5B4E] font-bold uppercase text-[10px] tracking-widest">
            <ShoppingCart className="size-3.5 text-[#D4A574]" />
            Total Orders
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#1C1412] @[250px]/card:text-3xl">
            {metrics.totalOrders.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#9E8E7E] border-[#D4C9BB] bg-[#E8DFD3]/50 text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1" />
              Volume
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#E8DFD3]/30 border-t border-[#DDD5C8]/50 mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#5C4A38]">
            Volume of customers served
          </div>
          <div className="text-[#9E8E7E] text-[11px]">
            Total number of rows in transactions
          </div>
        </CardFooter>
      </Card>

      {/* Average Order Value */}
      <Card className="@container/card bg-[#F5EFE6] border-[#DDD5C8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#6B5B4E] font-bold uppercase text-[10px] tracking-widest">
            <BarChart3 className="size-3.5 text-[#D4A574]" />
            Average Order Value
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#1C1412] @[250px]/card:text-3xl">
            ₱{metrics.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#9E8E7E] border-[#D4C9BB] bg-[#E8DFD3]/50 text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1" />
              Value
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#E8DFD3]/30 border-t border-[#DDD5C8]/50 mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#5C4A38]">
            Typical customer spend
          </div>
          <div className="text-[#9E8E7E] text-[11px]">
            Total Sales divided by Total Orders
          </div>
        </CardFooter>
      </Card>

      {/* Items Sold */}
      <Card className="@container/card bg-[#F5EFE6] border-[#DDD5C8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#6B5B4E] font-bold uppercase text-[10px] tracking-widest">
            <Package className="size-3.5 text-[#D4A574]" />
            Items Sold
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#1C1412] @[250px]/card:text-3xl">
            {metrics.itemsSold.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#9E8E7E] border-[#D4C9BB] bg-[#E8DFD3]/50 text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1" />
              Items
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#E8DFD3]/30 border-t border-[#DDD5C8]/50 mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#5C4A38]">
            Volume of products sold
          </div>
          <div className="text-[#9E8E7E] text-[11px]">
            Sum of quantity in transaction_items
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
