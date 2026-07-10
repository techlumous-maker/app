"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function signOut(): Promise<{ error: string } | void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }
  } catch (error) {
    return { error: "Something went wrong during sign-out." }
  }

  revalidatePath("/", "layout")
  redirect("/login")
}
