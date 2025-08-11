'use client'

import { useState } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Alert,
  AlertDescription,
  Separator,
  Input,
  Label,
  useToast
} from '@kitchencloud/ui'
import { 
  ShoppingCart, 
  Package, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  User,
  Trash2,
  Copy,
  ArrowRight,
  Loader2,
  Upload
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/stores/cart-store'
import { useCheckoutStore } from '@/stores/checkout-store'
import { api } from '@/lib/tprc/client'
import { useUser } from '@/hooks/use-user'

export default function TestCheckoutPage() {
  const router = useRouter()
  const createSession = api.checkout.createSession.useMutation()
  const updateDelivery = api.checkout.updateDelivery.useMutation()
  const completeCheckout = api.checkout.complete.useMutation()
  const uploadProof = api.payment.uploadProof.useMutation()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  // Cart state
  const { 
    items, 
    merchantId, 
    merchantName, 
    addItem, 
    clearCart,
    getItemCount,
    getSubtotal
  } = useCart()
  
  // Checkout state
  const {
    sessionId,
    deliveryMethod,
    deliveryAddress,
    contactInfo,
    reset: resetCheckout
  } = useCheckoutStore()
  
  // Test states
  const [testMerchantId, setTestMerchantId] = useState('')
  const [testOrderId, setTestOrderId] = useState('')
  const [testOrderNumber, setTestOrderNumber] = useState('')
  const [isRunningTest, setIsRunningTest] = useState(false)
  
  // Fetch test data
  const { data: merchants } = api.merchant.list.useQuery({ limit: 5 })
  const { data: products } = api.product.list.useQuery(
    { filters: { merchantId: testMerchantId } },
    { enabled: !!testMerchantId }
  )
  
  // Test scenarios
  const runCartTest = async () => {
    try {
      setIsRunningTest(true)
      
      // Clear existing cart
      clearCart()
      toast({ title: "Cart cleared" })
      
      // Add test items
      if (products?.items && products.items.length > 0) {
        const testProduct = products.items[0]
        addItem({
          productId: testProduct.id,
          merchantId: testProduct.merchantId,
          merchantName: testProduct.merchant?.businessName || 'Test Merchant',
          name: testProduct.name,
          price: testProduct.price,
          quantity: 2,
          image: testProduct.images?.[0],
        })
        
        toast({ 
          title: "Item added to cart",
          description: `Added ${testProduct.name} x2`
        })
      }
    } catch (error: any) {
      toast({ 
        title: "Test failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsRunningTest(false)
    }
  }
  
  const runCheckoutSessionTest = async () => {
    if (items.length === 0) {
      toast({ 
        title: "Cart is empty",
        description: "Add items to cart first",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsRunningTest(true)
      
      const session = await createSession.mutateAsync({
        merchantId: merchantId!,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      })
      
      toast({ 
        title: "Session created",
        description: `Session ID: ${session.sessionId}`
      })
      
      // You would normally store this in checkout store
      console.log('Session data:', session)
      
    } catch (error: any) {
      toast({ 
        title: "Session creation failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsRunningTest(false)
    }
  }
  
  const runFullCheckoutTest = async () => {
    if (items.length === 0) {
      toast({ 
        title: "Cart is empty",
        description: "Add items to cart first",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsRunningTest(true)
      
      // Step 1: Create session
      toast({ title: "Creating checkout session..." })
      const session = await createSession.mutateAsync({
        merchantId: merchantId!,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      })
      
      // Step 2: Update delivery method
      toast({ title: "Setting delivery method..." })
      await updateDelivery.mutateAsync({
        sessionId: session.sessionId,
        deliveryMethod: 'DELIVERY',
        deliveryAddress: {
          line1: '123 Test Street',
          line2: '#01-01',
          postalCode: '123456',
          city: 'Singapore',
          state: 'Singapore',
          country: 'Singapore'
        }
      })
      
      // Step 3: Complete checkout
      toast({ title: "Completing order..." })
      const order = await completeCheckout.mutateAsync({
        sessionId: session.sessionId,
        contactInfo: {
          name: user?.name || 'Test Customer',
          email: user?.email || 'test@example.com',
          phone: user?.phone || '91234567'
        },
        deliveryAddress: {
          line1: '123 Test Street',
          line2: '#01-01',
          postalCode: '123456',
          city: 'Singapore',
          state: 'Singapore',
          country: 'Singapore'
        },
        notes: 'Test order from checkout test page'
      })
      
      setTestOrderId(order.orderId)
      setTestOrderNumber(order.orderNumber)
      
      toast({ 
        title: "Order created successfully!",
        description: `Order ${order.orderNumber} created`
      })
      
      // Clear cart
      clearCart()
      resetCheckout()
      
    } catch (error: any) {
      toast({ 
        title: "Checkout test failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsRunningTest(false)
    }
  }
  
  const testPaymentUpload = async () => {
    if (!testOrderNumber) {
      toast({ 
        title: "No test order",
        description: "Complete a test order first",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsRunningTest(true)
      
      // Mock file upload
      const result = uploadProof.mutateAsync({
        orderNumber: testOrderNumber,
        fileUrl: 'https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Payment+Proof',
        fileName: 'test-payment.jpg',
        fileSize: 1024 * 500, // 500KB
        mimeType: 'image/jpeg'
      })
      
      toast({ 
        title: "Payment proof uploaded",
        description: (await result).message
      })
      
    } catch (error: any) {
      toast({ 
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsRunningTest(false)
    }
  }
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ 
      title: "Copied!",
      description: `${label} copied to clipboard`
    })
  }
  
  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout Flow Test Page</h1>
        <p className="text-muted-foreground">
          Test all checkout functionality before going to production
        </p>
      </div>
      
      {/* User Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading user...</span>
            </div>
          ) : user ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-mono text-sm">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm">{user.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <Badge variant={user.role === 'CUSTOMER' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Not logged in</p>
              <Button size="sm" onClick={() => router.push('/login')}>
                Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">1. Setup</TabsTrigger>
          <TabsTrigger value="cart">2. Cart</TabsTrigger>
          <TabsTrigger value="checkout">3. Checkout</TabsTrigger>
          <TabsTrigger value="payment">4. Payment</TabsTrigger>
        </TabsList>
        
        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Setup</CardTitle>
              <CardDescription>
                Select a merchant to test with
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Test Merchant</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={testMerchantId}
                  onChange={(e) => setTestMerchantId(e.target.value)}
                >
                  <option value="">Choose a merchant...</option>
                  {merchants?.items.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.businessName} ({merchant.status})
                    </option>
                  ))}
                </select>
              </div>
              
              {testMerchantId && products && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Found {products.items.length} products for this merchant
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {products.items.map((product: any) => (
                      <div key={product.id} className="text-sm flex justify-between">
                        <span>{product.name}</span>
                        <span className="font-mono">${product.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Cart Tab */}
        <TabsContent value="cart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cart Testing</CardTitle>
              <CardDescription>
                Test cart functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={runCartTest}
                  disabled={!testMerchantId || !products?.items.length || isRunningTest}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add Test Items
                </Button>
                <Button
                  variant="destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cart
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Current Cart State</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{getItemCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchant:</span>
                    <span>{merchantName || 'None'}</span>
                  </div>
                </div>
                
                {items.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium">Cart Items:</h5>
                    {items.map((item) => (
                      <div key={item.id} className="text-sm flex justify-between bg-gray-50 p-2 rounded">
                        <span>{item.name} x{item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cart data is stored in localStorage and persists across page reloads
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Checkout Tab */}
        <TabsContent value="checkout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checkout Flow Testing</CardTitle>
              <CardDescription>
                Test the complete checkout process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={runCheckoutSessionTest}
                  disabled={items.length === 0 || isRunningTest}
                  variant="outline"
                  className="w-full"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Test: Create Checkout Session Only
                </Button>
                
                <Button
                  onClick={runFullCheckoutTest}
                  disabled={items.length === 0 || isRunningTest}
                  className="w-full"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Test: Complete Full Checkout
                </Button>
                
                <Button
                  onClick={() => router.push('/checkout')}
                  disabled={items.length === 0}
                  variant="secondary"
                  className="w-full"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Go to Real Checkout Page
                </Button>
              </div>
              
              {sessionId && (
                <Alert>
                  <AlertDescription>
                    <p className="font-medium mb-1">Active Session:</p>
                    <p className="font-mono text-xs break-all">{sessionId}</p>
                  </AlertDescription>
                </Alert>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Checkout State</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Method:</span>
                    <span>{deliveryMethod || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Has Address:</span>
                    <span>{deliveryAddress ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Has Contact Info:</span>
                    <span>{contactInfo ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Testing</CardTitle>
              <CardDescription>
                Test payment proof upload and verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testOrderNumber ? (
                <>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-medium text-green-900">Test Order Created!</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Order ID:</span>
                          <code className="text-xs bg-white px-1 py-0.5 rounded">
                            {testOrderId}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(testOrderId, 'Order ID')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Order Number:</span>
                          <code className="text-xs bg-white px-1 py-0.5 rounded">
                            {testOrderNumber}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(testOrderNumber, 'Order number')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button
                      onClick={testPaymentUpload}
                      disabled={isRunningTest}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Test Payment Proof Upload
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/checkout/confirmation?orderId=${testOrderId}&orderNumber=${testOrderNumber}`)}
                      className="w-full"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      View Confirmation Page
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="test-order">Test with different order</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="test-order"
                        placeholder="Enter order number"
                        value={testOrderNumber}
                        onChange={(e) => setTestOrderNumber(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTestOrderId('')
                          setTestOrderNumber('')
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Complete a test checkout first to test payment functionality
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {/* Debug Info */}
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                {JSON.stringify({
                  user: user ? { id: user.id, email: user.email, role: user.role } : null,
                  cart: {
                    itemCount: getItemCount(),
                    subtotal: getSubtotal(),
                    merchantId,
                    items: items.map(i => ({ id: i.id, name: i.name, qty: i.quantity }))
                  },
                  checkout: {
                    sessionId,
                    deliveryMethod,
                    hasAddress: !!deliveryAddress,
                    hasContact: !!contactInfo
                  },
                  testOrder: {
                    orderId: testOrderId,
                    orderNumber: testOrderNumber
                  }
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/browse')}
            >
              Browse Products
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/cart')}
            >
              View Cart
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/orders')}
            >
              My Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearCart()
                resetCheckout()
                setTestOrderId('')
                setTestOrderNumber('')
                toast({ title: "All test data cleared" })
              }}
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}