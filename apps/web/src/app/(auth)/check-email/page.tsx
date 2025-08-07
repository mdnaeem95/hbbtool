import { Card } from '@kitchencloud/ui'
import { Mail } from 'lucide-react'
import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold">Check your email</h1>
        
        <p className="mt-4 text-muted-foreground">
          We've sent you a confirmation email. Please check your inbox and click
          the link to verify your account.
        </p>
        
        <p className="mt-6 text-sm text-muted-foreground">
          Didn't receive an email?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Try signing up again
          </Link>
        </p>
      </Card>
    </div>
  )
}