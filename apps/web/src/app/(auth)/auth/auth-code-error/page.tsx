import { Metadata } from "next"
import { Card, Button } from "@kitchencloud/ui"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "There was an error with your authentication",
}

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        
        <p className="mt-4 text-muted-foreground">
          There was an error confirming your account. This could be because:
        </p>
        
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
          <li>• The confirmation link has expired</li>
          <li>• The link has already been used</li>
          <li>• There was a technical error</li>
        </ul>
        
        <div className="mt-8 space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">
              Try logging in
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/signup">
              Create a new account
            </Link>
          </Button>
        </div>
        
        <p className="mt-6 text-xs text-muted-foreground">
          If you continue to experience issues, please contact{" "}
          <a href="mailto:support@kitchencloud.sg" className="underline hover:text-foreground">
            support@kitchencloud.sg
          </a>
        </p>
      </Card>
    </div>
  )
}