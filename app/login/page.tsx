import Image from "next/image"

import { LoginForm } from "@/components/login-form"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims) redirect("/")

  return (
    <div className="grid min-h-svh p-2 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-lg bg-muted lg:block">
        <Image
          src="/assets/glowing-bg-potrait.png"
          alt="Techlumous"
          fill
          priority
          // sizes="50vw"
          quality={100}
          className="object-cover object-top"
        />
        <div className="absolute bottom-8 left-8 max-w-xs">
          <p className="mb-1 text-sm font-thin text-white/60">
            Your website, ready in minutes
          </p>
          <p className="font-heading text-2xl leading-snug font-normal text-white/90">
            Build your online presence fast — no code, no hassle.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <a href="#" className="flex w-fit items-center gap-2 font-medium">
              <Logo size={24} showName />
            </a>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
