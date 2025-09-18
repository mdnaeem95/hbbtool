'use client'

import { Button, Card, Badge, useToast } from '@kitchencloud/ui'
import { api } from '../../../../lib/trpc/client'
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react'

export default function PaymentsPage() {
  const { toast } = useToast()
  const { data: orders, refetch, isLoading } = api.payment.getPendingPayments.useQuery()
  const verifyPayment = api.payment.verifyPayment.useMutation()
  
  const handleVerify = async (order: any, approved: boolean) => {
    try {
      await verifyPayment.mutateAsync({
        orderId: order.id,
        amount: Number(order.total),
        transactionId: order.payment?.transactionId || 'MANUAL-' + Date.now()
      })
      
      toast({
        title: approved ? 'Payment Verified' : 'Payment Rejected',
        description: `Order #${order.orderNumber} has been ${approved ? 'confirmed' : 'rejected'}.`
      })
      
      refetch()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify payment',
        variant: 'destructive'
      })
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payment Verification</h1>
        <p className="text-muted-foreground">
          Review and verify customer payment proofs
        </p>
      </div>
      
      {/* Map directly on orders, not orders.items */}
      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Order #{order.orderNumber}</span>
                  <Badge variant="secondary">
                    ${Number(order.total).toFixed(2)}
                  </Badge>
                  {order.paymentStatus && (
                    <Badge variant="outline">
                      {order.paymentStatus}
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>{order.customerName || order.customer?.name}</p>
                  <p>{order.customerPhone || order.customer?.phone}</p>
                  {order.customerEmail || order.customer?.email && (
                    <p>{order.customerEmail || order.customer?.email}</p>
                  )}
                </div>
                
                {order.payment?.transactionId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Ref: {order.payment.transactionId}
                  </p>
                )}
                
                {/* Show order items */}
                {order.items && order.items.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {item.quantity}x {item.product?.name || 'Item'}
                      </Badge>
                    ))}
                    {order.items.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{order.items.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                
                {order.paymentProof && (
                  <Badge className="mt-2" variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Proof Uploaded
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                {order.paymentProof && order.paymentProof !== 'manual_entry' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(order.paymentProof!, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Proof
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(order, false)}
                  disabled={verifyPayment.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  onClick={() => handleVerify(order, true)}
                  disabled={verifyPayment.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify
                </Button>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-muted-foreground">No pending payment verifications</p>
        </Card>
      )}
    </div>
  )
}