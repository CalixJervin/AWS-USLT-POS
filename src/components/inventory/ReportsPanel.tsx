import { useMemo } from "react";
import type { Sale, Ingredient, Product } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportsPanelProps {
  sales: Sale[];
  ingredients: Ingredient[];
  products: Product[];
}

export function ReportsPanel({
  sales,
  ingredients,
  products
}: ReportsPanelProps) {
  
  // 1. Restock History (Sorted by date)
  const allRestocks = useMemo(() => {
    const restocks: any[] = [];
    ingredients.forEach(ing => {
      ing.restockLog.forEach(log => {
        restocks.push({
          ...log,
          ingredientName: ing.name,
          unit: ing.unit,
          id: ing.id + log.date
        });
      });
    });
    return restocks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ingredients]);

  // 2. Products Sold Count
  const productSales = useMemo(() => {
    const counts: Record<string, { name: string, count: number, revenue: number }> = {};
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      const name = product?.name || "Unknown Product";
      if (!counts[sale.productId]) {
        counts[sale.productId] = { name, count: 0, revenue: 0 };
      }
      counts[sale.productId].count += sale.quantity;
      counts[sale.productId].revenue += sale.totalPrice;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [sales, products]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Product (Quantity)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSales.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {productSales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSales.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">₱{p.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {productSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No sales data yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Restock History */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Restock History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date & Time</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Quantity Added</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRestocks.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(log.date), "MMM d, yyyy · hh:mm a")}
                  </TableCell>
                  <TableCell className="font-bold">{log.ingredientName}</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-bold">+{log.quantityAdded}</span>
                    <span className="text-muted-foreground ml-1 text-xs">{log.unit}</span>
                  </TableCell>
                  <TableCell>{log.supplier || "-"}</TableCell>
                  <TableCell className="text-muted-foreground italic text-xs max-w-[200px] truncate">
                    {log.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {allRestocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No restock history yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
