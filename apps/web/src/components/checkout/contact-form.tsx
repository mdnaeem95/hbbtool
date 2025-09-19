import { useEffect, useMemo } from 'react'
import { Label, Input } from '@kitchencloud/ui'
import { User, Mail, Phone, Info } from 'lucide-react'
import { useCheckoutStore } from '../../stores/checkout-store'
import { useAuth } from '@kitchencloud/auth/client'

export function ContactForm() {
  const { user, isMerchant } = useAuth()
  const { contactInfo, setContactInfo } = useCheckoutStore()

  const blankContact = useMemo(
    () => ({ name: '', email: '', phone: '' }),
    []
  )

  // Load saved contact info from localStorage
  useEffect(() => {
    if (!contactInfo?.name) {
      // Try to load from localStorage first (for returning customers)
      const savedInfo = localStorage.getItem('checkout_contact')
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo)
          setContactInfo(parsed)
          return
        } catch (e) {
          console.error('Failed to parse saved contact info')
        }
      }

      // If merchant is logged in (testing their own store perhaps)
      if (isMerchant && user) {
        setContactInfo({
          name: '', // Let merchant fill their personal name
          email: user.email || '',
          phone: user.merchant?.phone || '',
        })
      }
    }
  }, [user, isMerchant, setContactInfo, contactInfo?.name])

  const value = contactInfo ?? blankContact

  // Save to localStorage when info changes (debounced)
  useEffect(() => {
  if (value.name || value.email || value.phone) {
    const timer = setTimeout(() => {
      localStorage.setItem('checkout_contact', JSON.stringify(value))
    }, 1000)
    return () => clearTimeout(timer)
  }
  return undefined
  }, [value])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        
        {/* Info message - no account needed */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">No account needed!</p>
            <p className="text-blue-700">We'll use this info to send order updates.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
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
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground">
                +65
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="9123 4567"
                value={value.phone}
                onChange={(e: any) => {
                  // Clean and format phone number
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setContactInfo({ ...value, phone: cleaned })
                }}
                className="pl-20"
                required
                pattern="[689][0-9]{7}"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For WhatsApp updates and delivery coordination
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address 
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={value.email}
                onChange={(e: any) => setContactInfo({ ...value, email: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Get order confirmation and receipt (optional)
            </p>
          </div>
        </div>

        {/* Privacy note */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Your contact information is stored locally on this device for convenience. 
            We only use it to communicate about your order.
          </p>
        </div>
      </div>
    </div>
  )
}