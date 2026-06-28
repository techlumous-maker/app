"use client"

import React, { useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>("")
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/api/auth/supabase/callback`,
      },
    })

    setIsPending(false)
    if (error) {
      console.error(error)
      setError(error.message)
      return
    }
    setSent(true)
  }

  async function handleGoogleLogin(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: false,
        redirectTo: `${window.location.origin}/api/auth/supabase/callback`,
      },
    })

    setIsPending(false)
    if (error) {
      console.error(error)
      setError(error.message)
      return
    }
  }

  if (sent) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl">Check your email</h1>
          <p className="text-sm font-light text-balance text-muted-foreground">
            We sent a login link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Click
            the link to continue.
          </p>
        </div>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setSent(false)
            setError(null)
          }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className={cn("", className)}>
      <form
        className={cn("flex flex-col gap-6", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl">Login to your account</h1>
            <p className="text-sm font-light text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <FieldError className="pl-2 text-xs text-destructive">
                {error}
              </FieldError>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Continue with Email"}
            </Button>
          </Field>
        </FieldGroup>
        <FieldSeparator>OR</FieldSeparator>
      </form>
      <Field className="mt-6">
        <Button variant="outline" type="button" onClick={handleGoogleLogin}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-4"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </Field>
    </div>
  )
}
