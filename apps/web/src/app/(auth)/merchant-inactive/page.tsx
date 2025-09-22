import { Metadata } from "next"
import { Card, Button } from "@homejiak/ui"
import { AlertCircle, Mail } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Account Inactive",
  description: "Your merchant account is currently inactive",
}

export default function MerchantInactivePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <AlertCircle className="h-8 w-8 text-orange-600" />
        </div>
        
        <h1 className="text-2xl font-bold">Account Under Review</h1>
        
        <p className="mt-4 text-muted-foreground">
          Your merchant account is currently inactive. This could be because:
        </p>
        
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
          <li>• Your account is still being reviewed by our team</li>
          <li>• Additional documentation is required</li>
          <li>• Your account has been temporarily suspended</li>
        </ul>
        
        <div className="mt-8 space-y-3">
          <Button asChild className="w-full">
            <a href="mailto:merchant-support@homejiak.sg">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 rounded-lg bg-blue-50 p-4 text-left">
          <h3 className="font-medium text-sm text-blue-900">What happens next?</h3>
          <p className="mt-1 text-xs text-blue-800">
            Our team typically reviews new merchant applications within 24-48 hours. 
            You&apos;ll receive an email once your account is activated.
          </p>
        </div>
      </Card>
    </div>
  )
}