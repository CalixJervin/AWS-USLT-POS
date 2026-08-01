"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useTransactions } from "@/hooks/useTransactions"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart showing sales"

const chartConfig = {
  sales: {
    label: "Total Sales",
    color: "#E6007E",
  }
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { transactions } = useTransactions()
  const [timeRange, setTimeRange] = React.useState("90d")

  const chartData = React.useMemo(() => {
    const grouped = transactions.reduce((acc: Record<string, number>, t) => {
      const date = new Date(t.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + t.total_amount
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions])

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (chartData.length === 0) return []
    
    const referenceDate = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return chartData.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [chartData, timeRange])

  const totalSalesInRange = filteredData.reduce((acc, curr) => acc + curr.sales, 0)

  return (
    <Card className="@container/card bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
      <CardHeader>
        <CardTitle className="text-[#E2E8F0] font-bold text-lg">Sales Performance</CardTitle>
        <CardDescription className="text-[#94A3B8]">
          <span className="hidden @[540px]/card:block">
            Showing total sales of <strong className="text-[#E6007E]">₱{totalSalesInRange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> for the selected period
          </span>
          <span className="@[540px]/card:hidden">Total: <strong className="text-[#E6007E]">₱{totalSalesInRange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex bg-[#131824] border-[#232A3B] p-1 rounded-xl"
          >
            <ToggleGroupItem value="90d" className="data-[state=on]:bg-[#00F2FE] data-[state=on]:text-[#0B0E14] text-[#94A3B8] font-black text-xs">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d" className="data-[state=on]:bg-[#00F2FE] data-[state=on]:text-[#0B0E14] text-[#94A3B8] font-black text-xs">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d" className="data-[state=on]:bg-[#00F2FE] data-[state=on]:text-[#0B0E14] text-[#94A3B8] font-black text-xs">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden bg-[#131824] border-[#232A3B] text-[#E2E8F0]"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#E6007E"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="#E6007E"
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#232A3B" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              stroke="#94A3B8"
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="sales"
              type="natural"
              fill="url(#fillSales)"
              stroke="#E6007E"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
