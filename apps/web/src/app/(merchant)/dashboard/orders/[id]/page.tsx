"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Separator, Alert, AlertDescription } from "@homejiak/ui"
import { ArrowLeft, Clock, Phone, User, DollarSign, Package, MessageSquare, CheckCircle, AlertCircle, Truck, ChefHat,
  Printer, Edit, Mail, MapPin, Calendar, Receipt } from "lucide-react"
import { api } from "../../../../../lib/trpc/client"
import { OrderStatusBadge } from "../../../../../components/merchant/orders/order-status-badge"
import { formatCurrency, toNumber } from "../../../../../lib/utils"

interface OrderPageProps {
  params: Promise<{ id: string }>
}

export default function OrderPage({ params }: OrderPageProps) {
  const resolvedParams = use(params)
  const orderId = resolvedParams.id

  const { data: order, isLoading, error } = api.order.get.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  )

  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Loading skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    notFound()
  }

  const formatPhone = (phone: string) => {
    if (phone.startsWith('+65')) {
      return phone.replace(/(\+65)(\d{4})(\d{4})/, '$1 $2 $3')
    }
    return phone
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild className="rounded-full">
                <Link href="/dashboard/orders">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(order.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <OrderStatusBadge status={order.status} className="text-sm px-3 py-1.5" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/dashboard/orders/print?ids=${order.id}`, '_blank')}
                className="gap-2"
              >
                <Printer className="h-4 w-4 cursor-pointer" />
                Print
              </Button>
              {/* <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button> */}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Order Items */}
            <Card className="shadow-sm border-0 bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ChefHat className="h-5 w-5 text-orange-600" />
                  </div>
                  Order Items
                  <Badge variant="secondary" className="ml-auto">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {order.items.map((item: any, index: number) => (
                    <div key={item.id} className={`py-4 ${index !== order.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                              <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                                <span>Qty: {item.quantity}</span>
                                <span>×</span>
                                <span>{formatCurrency(toNumber(item.price))}</span>
                              </p>
                              {item.notes && (
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                  <p className="text-sm text-amber-800 italic">
                                    <MessageSquare className="h-4 w-4 inline mr-1" />
                                    {item.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg text-gray-900">{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Badge 
                              variant={item.isPrepared ? "default" : "outline"}
                              className={`text-xs px-3 py-1.5 ${
                                item.isPrepared 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {item.isPrepared ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Prepared
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatCurrency(toNumber(order.subtotal))}</span>
                    </div>
                    {Number(order.deliveryFee) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Delivery Fee</span>
                        <span className="font-medium">{formatCurrency(toNumber(order.deliveryFee))}</span>
                      </div>
                    )}
                    {Number(order.discount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatCurrency(toNumber(order.discount))}</span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(toNumber(order.total))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            {order.events && order.events.length > 0 && (
              <Card className="shadow-sm border-0 bg-white rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    Order Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {order.events.map((event: any, index: number) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                          {index !== order.events.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 capitalize">
                            {event.event.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {format(new Date(event.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal Notes */}
            <Card className="shadow-sm border-0 bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Alert className="flex items-start gap-2 border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                  <AlertDescription className="text-blue-800">
                    Add internal notes about this order. Notes are only visible to your team and can help with order fulfillment and customer service.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4 w-full" disabled>
                  <Edit className="h-4 w-4 mr-2" />
                  Add Notes (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Customer Information */}
            <Card className="shadow-sm border-0 bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{order.customerName || "Guest Customer"}</p>
                    {order.customerEmail && (
                      <div className="flex items-center gap-2 mt-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a 
                          href={`mailto:${order.customerEmail}`}
                          className="text-sm hover:text-blue-600 hover:underline"
                        >
                          {order.customerEmail}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {order.customerPhone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <a 
                        href={`tel:${order.customerPhone}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {formatPhone(order.customerPhone)}
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    onClick={() => {
                      if (order.customerPhone) {
                        const message = `Hi ${order.customerName || 'there'}, this is regarding your order #${order.orderNumber}.`
                        const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
                        window.open(whatsappUrl, '_blank')
                      }
                    }}
                    disabled={!order.customerPhone}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contact Customer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card className="shadow-sm border-0 bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className={`p-2 rounded-lg ${
                    order.deliveryMethod === "DELIVERY" 
                      ? "bg-orange-100" 
                      : "bg-indigo-100"
                  }`}>
                    {order.deliveryMethod === "DELIVERY" ? (
                      <Truck className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Package className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  {order.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div>
                  <Badge 
                    variant="secondary" 
                    className={`px-3 py-1.5 ${
                      order.deliveryMethod === "DELIVERY" 
                        ? "bg-orange-100 text-orange-700 border-orange-200" 
                        : "bg-indigo-100 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {order.deliveryMethod === "DELIVERY" ? "Delivery Order" : "Pickup Order"}
                  </Badge>
                </div>

                {order.deliveryMethod === "DELIVERY" && order.deliveryAddress && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-medium text-gray-900">{order.deliveryAddress.line1}</p>
                      {order.deliveryAddress.line2 && (
                        <p className="text-sm text-gray-600">{order.deliveryAddress.line2}</p>
                      )}
                      <p className="text-sm text-gray-600">Singapore {order.deliveryAddress.postalCode}</p>
                      {order.deliveryAddress.deliveryInstructions && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800 italic">
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            {order.deliveryAddress.deliveryInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.scheduledFor && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Scheduled Time
                    </h4>
                    <p className="text-sm bg-gray-50 p-2 rounded text-gray-700">
                      {format(new Date(order.scheduledFor), "MMM d, h:mm a")}
                    </p>
                  </div>
                )}

                {order.deliveryNotes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Special Instructions</h4>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">{order.deliveryNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="shadow-sm border-0 bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {order.payment ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block">Method</span>
                        <Badge variant="outline" className="mt-1 px-3 py-1.5">
                          {order.payment.method}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Status</span>
                        <Badge 
                          variant={order.payment.status === "COMPLETED" ? "default" : "secondary"}
                          className={`mt-1 px-3 py-1.5 ${
                            order.payment.status === "COMPLETED" 
                              ? "bg-green-100 text-green-700 border-green-200" 
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }`}
                        >
                          {order.payment.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {order.payment.transactionId && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block">Transaction ID</span>
                        <span className="text-sm font-mono text-gray-900">{order.payment.transactionId}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Receipt className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No payment information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}