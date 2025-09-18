import { useEffect, useMemo } from 'react'
import { Label, Input, Alert, AlertDescription } from '@kitchencloud/ui'
import { User, Mail, Phone } from 'lucide-react'
import { useCheckoutStore } from '../../stores/checkout-store'
import { useAuth, isCustomerUser, isMerchantUser } from '@kitchencloud/auth/client'

export function ContactForm() {
  const { user, isAuthenticated } = useAuth()
  const { contactInfo, setContactInfo } = useCheckoutStore()

  const blankContact = useMemo(
    () => ({ name: '', email: '', phone: ''}),
    []
  )

  // Pre-fill with user data if logged in
  useEffect(() => {
    // Only run if we have a user and haven't already set contact info
    if (user && !contactInfo?.name) {
      let prefillData = { ...blankContact }
      
      if (isCustomerUser(user)) {
        // Customer user - they use phone-based auth
        prefillData = {
          name: user.customer?.preferredName || user.customer?.name || '',
          email: user.customer?.email || '', // Optional for customers
          phone: user.phone || '', // CustomerUser has phone directly
        }
      } else if (isMerchantUser(user)) {
        // Merchant user - they use email-based auth
        // For merchants checking out (rare), we leave name empty since
        // businessName is not appropriate for personal orders
        prefillData = {
          name: '', // Let merchant fill their personal name, not business name
          email: user.email || '', // MerchantUser has email directly
          phone: user.merchant?.phone || '',
        }
      }
      
     // Only set if we actually have data to prefill
      if (prefillData.name || prefillData.email || prefillData.phone) {
        setContactInfo(prefillData)
      }
    }
  }, [user, setContactInfo, blankContact])

  const value = contactInfo ?? blankContact

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        
        {!isAuthenticated && (
          <Alert className="mb-4">
            <AlertDescription>
              You're checking out as a guest. Create an account after checkout to track your orders.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                value={value.name}
                onChange={(e: any) => setContactInfo({ ...value, name: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={value.email}
                onChange={(e: any) => setContactInfo({ ...value, email: e.target.value })}
                className="pl-10"
                required // Always require email for order confirmations
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send order confirmation to this email
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+65 9XXX XXXX"
                value={value.phone}
                onChange={(e: any) => setContactInfo({ ...value, phone: e.target.value })}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For delivery updates and order notifications
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}