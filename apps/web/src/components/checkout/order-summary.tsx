import { Card } from '@kitchencloud/ui'
import { Shield, Check, Clock } from 'lucide-react'

interface OrderSummaryProps {
  items: any[]
  subtotal: number
  deliveryFee: number
  total: number
}

export function OrderSummary({ items, subtotal, deliveryFee, total }: OrderSummaryProps) {
  return (
    <Card className="rounded-2xl shadow-sm border-slate-100 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
          Order Summary
          <span className="text-sm font-normal text-slate-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </h3>

        {/* Order Items */}
        <div className="space-y-4 pb-4 border-b border-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4">
              {item.image && (
                <img 
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{item.name}</h4>
                {item.variant && (
                  <p className="text-xs text-slate-500">{item.variant.name}</p>
                )}
                <p className="text-sm text-slate-500 mt-1">
                  Qty: {item.quantity} × ${item.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="text-slate-900 font-medium">${subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Delivery Fee</span>
              <span className="text-slate-900 font-medium">${deliveryFee.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Pickup Discount</span>
              <span className="text-green-600 font-medium">FREE</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-orange-500">
                ${total.toFixed(2)}
              </span>
              <p className="text-xs text-slate-500 mt-1">SGD</p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Fast</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}