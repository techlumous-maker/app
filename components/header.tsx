import { signOut } from "@/app/api/auth/actions"
import { Logo } from "@/components/logo"
import { MainNav } from "@/components/main-nav"
import { AccountMenu } from "@/components/account-menu"

export function Header() {
  return (
    <header className="sticky top-0 z-50 mx-auto max-w-7xl bg-background/80 backdrop-blur">
      <div className="relative flex h-14 items-center px-3 md:px-6">
        <Logo showName size={24} />
        <div className="absolute left-1/2 -translate-x-1/2">
          <MainNav />
        </div>
        <div className="ml-auto">
          <AccountMenu onLogout={signOut} />
        </div>
      </div>
    </header>
  )
}
