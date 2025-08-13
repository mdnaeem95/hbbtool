import { Metadata } from "next"
import { Card } from "@kitchencloud/ui"
import { Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Check Your Email",
  description: "Confirm your email to complete registration",
}

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold">Check your email</h1>
        
        <p className="mt-4 text-muted-foreground">
          We&apos;ve sent you an email with a confirmation link. 
          Please check your inbox and click the link to activate your account.
        </p>
        
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or contact support.
          </p>
          
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </div>
      </Card>
    </div>
  )
}