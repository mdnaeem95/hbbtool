"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { api } from "../../../../../lib/trpc/client"
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
      // Hide any remaining UI elements before printing
      document.body.style.margin = '0'
      document.body.style.padding = '0'
      
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [orders])

  if (!orderIds.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">No orders selected for printing.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">No orders found.</p>
      </div>
    )
  }

  return (
    <>
      {/* Global print styles - this ensures ONLY the order content prints */}
      <style dangerouslySetInnerHTML={{ __html: `...` }}>{`
        /* Hide everything by default when printing */
        @media print {
          * {
            visibility: hidden;
          }
          
          /* Only show the print content */
          .print-only,
          .print-only * {
            visibility: visible;
          }
          
          /* Print layout */
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Page breaks between orders */
          .page-break {
            page-break-after: always;
          }
          
          /* Remove margins and ensure clean layout */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Table styles */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          
          th, td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
          }
          
          th {
            font-weight: 600;
            background-color: #f5f5f5;
          }
          
          /* Typography */
          h1 { font-size: 24px; margin: 0 0 8px 0; }
          h2 { font-size: 18px; margin: 0 0 12px 0; }
          h3 { font-size: 16px; margin: 0 0 8px 0; }
          
          /* Remove any shadows or unnecessary styling */
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
            background-image: none !important;
          }
        }
        
        /* Screen styles - hide print button after printing */
        @media screen {
          .screen-only {
            display: block;
          }
        }
        
        @media print {
          .screen-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen-only instructions */}
      <div className="screen-only fixed top-4 right-4 bg-white p-4 shadow-lg rounded-lg border z-50">
        <p className="text-sm text-gray-600 mb-2">Print Preview Ready</p>
        <button 
          onClick={() => window.print()} 
          className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 mr-2"
        >
          Print Now
        </button>
        <button 
          onClick={() => window.close()} 
          className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
        >
          Close
        </button>
      </div>

      {/* Print content - ONLY this will be visible when printing */}
      <div className="print-only">
        {orders.map((order: any, index: any) => (
          <div key={order.id} className={`min-h-screen p-8 ${index < orders.length - 1 ? 'page-break' : ''}`}>
            
            {/* Business Header */}
            <div className="border-b-2 border-gray-300 pb-4 mb-6">
              <h1 className="text-2xl font-bold">{order.merchant.businessName}</h1>
              <div className="text-sm text-gray-600 mt-2">
                {order.merchant.address && <div>{order.merchant.address}</div>}
                {order.merchant.phone && <div>Tel: {order.merchant.phone}</div>}
                {order.merchant.email && <div>Email: {order.merchant.email}</div>}
              </div>
            </div>

            {/* Order Header */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h2 className="font-bold text-xl mb-3">Order #{order.orderNumber}</h2>
                <div className="space-y-1 text-sm">
                  <div><strong>Date:</strong> {format(new Date(order.createdAt), "dd MMM yyyy")}</div>
                  <div><strong>Time:</strong> {format(new Date(order.createdAt), "h:mm a")}</div>
                  <div><strong>Status:</strong> <span className="font-semibold">{order.status}</span></div>
                  <div><strong>Type:</strong> {order.deliveryMethod}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold mb-3">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {order.customerName}</div>
                  <div><strong>Phone:</strong> {order.customerPhone}</div>
                  {order.customerEmail && <div><strong>Email:</strong> {order.customerEmail}</div>}
                </div>
                
                {order.deliveryMethod === "DELIVERY" && order.deliveryAddress && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Delivery Address</h4>
                    <div className="text-sm">
                      <div>{order.deliveryAddress.line1}</div>
                      {order.deliveryAddress.line2 && <div>{order.deliveryAddress.line2}</div>}
                      <div>Singapore {order.deliveryAddress.postalCode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-bold mb-3">Order Items</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Item</th>
                    <th className="text-center w-16">Qty</th>
                    <th className="text-right w-20">Price</th>
                    <th className="text-right w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.productName}</div>
                        {item.specialRequest && (
                          <div className="text-xs text-gray-600 italic mt-1">
                            Note: {item.specialRequest}
                          </div>
                        )}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">${toNumber(item.price).toFixed(2)}</td>
                      <td className="text-right font-medium">${toNumber(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-medium pt-4">Subtotal:</td>
                    <td className="text-right font-medium pt-4">${toNumber(order.subtotal).toFixed(2)}</td>
                  </tr>
                  {toNumber(order.deliveryFee) > 0 && (
                    <tr>
                      <td colSpan={3} className="text-right">Delivery Fee:</td>
                      <td className="text-right">${toNumber(order.deliveryFee).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="text-right font-bold text-lg pt-2">TOTAL:</td>
                    <td className="text-right font-bold text-lg pt-2">${toNumber(order.total).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {(order.deliveryNotes || order.customerNotes) && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">Special Instructions</h3>
                <div className="bg-gray-50 p-3 text-sm">
                  {order.deliveryNotes && <div><strong>Delivery:</strong> {order.deliveryNotes}</div>}
                  {order.customerNotes && <div><strong>Customer:</strong> {order.customerNotes}</div>}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              <div>Thank you for your order!</div>
              <div className="mt-1">Powered by HomeJiak</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}