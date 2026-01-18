import { ReactNode } from "react"

export default function DashboardRootLayout({
  children
}: {
  children: ReactNode
}) {
  return <main>{children}</main>
}
