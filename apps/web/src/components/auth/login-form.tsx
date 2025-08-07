"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "@kitchencloud/auth/client"
import { Button, Input, Label } from "@kitchencloud/ui"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<"email" | "phone">("email")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    try {
      if (method === "email") {
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        const result = await signIn.email({
          email,
          password,
          callbackURL: "/browse",
        })

        if (result.error) {
          setError("Invalid email or password")
          return
        }
      } else {
        // Phone OTP login will be implemented later
        setError("Phone login coming soon!")
        return
      }

      router.push("/browse")
      router.refresh()
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Method selector */}
      <div className="flex rounded-lg border p-1">
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "email"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMethod("phone")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "phone"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Phone
        </button>
      </div>

      {method === "email" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+65 9123 4567"
            required
            autoComplete="tel"
          />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {method === "email" ? "Sign In" : "Send OTP"}
      </Button>
    </form>
  )
}