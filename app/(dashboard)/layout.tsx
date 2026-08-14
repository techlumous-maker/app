import { Header } from "@/components/header"
import { TemplatesProvider } from "@/components/templates-provider"
import { listTemplates } from "@/services/template"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const templates = await listTemplates()

  return (
    <TemplatesProvider templates={templates}>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl p-0 sm:p-4 lg:p-6">{children}</main>
      </div>
    </TemplatesProvider>
  )
}
