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
      <Card className="@container/card bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest">
            <DollarSign className="size-3.5 text-[#E6007E]" />
            Total Sales
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums  @[250px]/card:text-3xl">
            ₱{metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#E6007E] border-[#E6007E]/30 bg-[#131824] text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1 text-[#E6007E]" />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#131824]/60 border-t border-[#232A3B] mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#E2E8F0]">
            Total money earned
          </div>
          <div className="text-[#64748B] text-[11px]">
            Sum of total_amount from transactions
          </div>
        </CardFooter>
      </Card>

      {/* Total Orders */}
      <Card className="@container/card bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest">
            <ShoppingCart className="size-3.5 text-[#00F2FE]" />
            Total Orders
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#E2E8F0] @[250px]/card:text-3xl">
            {metrics.totalOrders.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#00F2FE] border-[#00F2FE]/30 bg-[#131824] text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1 text-[#00F2FE]" />
              Volume
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#131824]/60 border-t border-[#232A3B] mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#E2E8F0]">
            Volume of customers served
          </div>
          <div className="text-[#64748B] text-[11px]">
            Total number of rows in transactions
          </div>
        </CardFooter>
      </Card>

      {/* Average Order Value */}
      <Card className="@container/card bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest">
            <BarChart3 className="size-3.5 text-[#E6007E]" />
            Average Order Value
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums @[250px]/card:text-3xl">
            ₱{metrics.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#E6007E] border-[#E6007E]/30 bg-[#131824] text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1 text-[#E6007E]" />
              Value
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#131824]/60 border-t border-[#232A3B] mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#E2E8F0]">
            Typical customer spend
          </div>
          <div className="text-[#64748B] text-[11px]">
            Total Sales divided by Total Orders
          </div>
        </CardFooter>
      </Card>

      {/* Items Sold */}
      <Card className="@container/card bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest">
            <Package className="size-3.5 text-[#00F2FE]" />
            Items Sold
          </CardDescription>
          <CardTitle className="text-2xl font-black tabular-nums text-[#E2E8F0] @[250px]/card:text-3xl">
            {metrics.itemsSold.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#00F2FE] border-[#00F2FE]/30 bg-[#131824] text-[10px] font-bold">
              <TrendingUpIcon className="size-3 mr-1 text-[#00F2FE]" />
              Items
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-[12px] bg-[#131824]/60 border-t border-[#232A3B] mt-2">
          <div className="line-clamp-1 flex gap-2 font-bold text-[#E2E8F0]">
            Volume of products sold
          </div>
          <div className="text-[#64748B] text-[11px]">
            Sum of quantity in transaction_items
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
