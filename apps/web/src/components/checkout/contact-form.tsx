import { useEffect, useMemo } from 'react'
import { Label, Input, Alert, AlertDescription } from '@kitchencloud/ui'
import { User, Mail, Phone } from 'lucide-react'
import { useCheckoutStore } from '@/stores/checkout-store'
import { useSession } from '@/hooks/use-session'

export function ContactForm() {
  const { user } = useSession()
  const { contactInfo, setContactInfo } = useCheckoutStore()

  const blankContact = useMemo(
    () => ({ name: '', email: '', phone: ''}),
    []
  )

  // Pre-fill with user data if logged in
  useEffect(() => {
    if (user && (!contactInfo || !contactInfo.name)) {
      setContactInfo({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
      })
    }
  }, [user, contactInfo, setContactInfo])

  const value = contactInfo ?? blankContact

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        
        {!user && (
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
                onChange={(e) => setContactInfo({ ...value, name: e.target.value })}
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
                onChange={(e) => setContactInfo({ ...value, email: e.target.value })}
                className="pl-10"
                required
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
                onChange={(e) => setContactInfo({ ...value, phone: e.target.value })}
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