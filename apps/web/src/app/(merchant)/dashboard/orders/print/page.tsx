"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { api } from "@/lib/trpc/client"
import { Loader2 } from "lucide-react"

// Helper function to convert Prisma Decimal to number
function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }
  return Number(value || 0)
}

export default function OrderPrintPage() {
  const searchParams = useSearchParams()
  const orderIds = searchParams.get("ids")?.split(",") || []

  const { data: orders, isLoading } = api.order.getPrintData.useQuery(
    { orderIds },
    { enabled: orderIds.length > 0 }
  )

  // Auto-print when loaded
  useEffect(() => {
    if (orders && orders.length > 0) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [orders])

  if (!orderIds.length) {
    return (
      <div className="p-8 text-center">
        <p>No orders selected for printing.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <p>No orders found.</p>
      </div>
    )
  }

  return (
    <div className="print-container">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .print-container {
            width: 100%;
            max-width: none;
          }
          
          .order-slip {
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          th, td {
            text-align: left;
            padding: 4px 8px;
            border-bottom: 1px solid #ddd;
          }
          
          th {
            font-weight: 600;
          }
        }
        
        @media screen {
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .order-slip {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
        }
      `}</style>

      {/* Print instructions (screen only) */}
      <div className="no-print mb-6 text-center text-sm text-muted-foreground">
        <p>Press Ctrl+P (or Cmd+P on Mac) to print these orders.</p>
        <button 
          onClick={() => window.close()} 
          className="mt-2 text-primary hover:underline"
        >
          Close this window
        </button>
      </div>

      {/* Order slips */}
      {orders.map((order, index) => (
        <div 
          key={order.id} 
          className={`order-slip ${index < orders.length - 1 ? 'page-break' : ''}`}
        >
          {/* Header */}
          <div className="mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">{order.merchant.businessName}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {order.merchant.address} {order.merchant.postalCode}
            </p>
          </div>

          {/* Order info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h2 className="font-semibold text-lg mb-2">Order #{order.orderNumber}</h2>
              <p className="text-sm">
                <strong>Date:</strong> {format(new Date(order.createdAt), "dd MMM yyyy")}
              </p>
              <p className="text-sm">
                <strong>Time:</strong> {format(new Date(order.createdAt), "h:mm a")}
              </p>
              <p className="text-sm">
                <strong>Status:</strong> {order.status}
              </p>
              <p className="text-sm">
                <strong>Type:</strong> {order.deliveryMethod}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Customer Details</h3>
              <p className="text-sm">
                <strong>Name:</strong> {order.customerName}
              </p>
              <p className="text-sm">
                <strong>Phone:</strong> {order.customerPhone}
              </p>
              {order.deliveryMethod === "DELIVERY" && order.deliveryAddress && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">Delivery Address:</p>
                  <p className="text-sm">{order.deliveryAddress.line1}</p>
                  {order.deliveryAddress.line2 && (
                    <p className="text-sm">{order.deliveryAddress.line2}</p>
                  )}
                  <p className="text-sm">Singapore {order.deliveryAddress.postalCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Order Items</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        {item.specialRequest && (
                          <div className="text-xs text-gray-600 italic">
                            Note: {item.specialRequest}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">${item.price.toFixed(2)}</td>
                    <td className="text-right">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right font-medium">Subtotal:</td>
                  <td className="text-right">${order.subtotal.toFixed(2)}</td>
                </tr>
                {toNumber(order.deliveryFee) > 0 && (
                  <tr>
                    <td colSpan={3} className="text-right">Delivery Fee:</td>
                    <td className="text-right">${order.deliveryFee.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="font-semibold text-lg">
                  <td colSpan={3} className="text-right">Total:</td>
                  <td className="text-right">${order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {order.deliveryNotes && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <strong>Delivery Notes:</strong> {order.deliveryNotes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>Thank you for your order!</p>
            <p className="mt-1">
              Powered by KitchenCloud • {order.merchant.phone}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}