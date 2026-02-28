"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Leaf } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // Attempt sign-up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (signUpError) throw signUpError

        // If session exists, email confirmation is off — log in directly
        if (signUpData.session) {
          router.push("/")
          router.refresh()
          return
        }

        // Try signing in immediately (works when email confirmation is disabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!signInError) {
          router.push("/")
          router.refresh()
          return
        }

        // Only show email confirmation message as a last resort
        setMessage("We've sent you a confirmation email. Please check your inbox to activate your account.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/")
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again."
      // Make common Supabase error messages more user-friendly
      if (msg.includes("Invalid login credentials")) {
        setError("Incorrect email or password. Please try again.")
      } else if (msg.includes("User already registered")) {
        setError("An account with this email already exists. Try signing in instead.")
      } else if (msg.includes("Password should be at least")) {
        setError("Your password must be at least 6 characters long.")
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-green-600/10">
            <Leaf className="size-6 text-green-600" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              ecodan forum
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Heat Pump Support Community
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-foreground">
            {isSignUp ? "Create an account" : "Sign in"}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 rounded-xl text-sm"
              />
              {isSignUp && (
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 6 characters.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-green-600/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-9 w-full rounded-xl bg-green-600 text-sm font-medium text-white hover:bg-green-700"
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
