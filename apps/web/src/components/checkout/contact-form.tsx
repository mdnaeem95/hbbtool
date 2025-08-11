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
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user, contactInfo, setContactInfo])

  const value = contactInfo ?? blankContact

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <p className="text-sm text-muted-foreground mb-6">
          We'll use this information to contact you about your order
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Full Name *
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={contactInfo?.name || ''}
            onChange={(e) => setContactInfo({ 
              ...value, 
              name: e.target.value 
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={contactInfo?.email || ''}
            onChange={(e) => setContactInfo({ 
              ...value, 
              email: e.target.value 
            })}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            We'll send order confirmation to this email
          </p>
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number *
          </Label>
          <Input
            id="phone"
            placeholder="91234567"
            maxLength={8}
            value={contactInfo?.phone || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              setContactInfo({ 
                ...value, 
                phone: digits 
              })
            }}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            For delivery updates via SMS/WhatsApp
          </p>
        </div>
      </div>

      {!user && (
        <Alert>
          <AlertDescription>
            <p className="text-sm">
              Want to track your orders easily?{' '}
              <a href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </a>{' '}
              to save your information for future orders.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}