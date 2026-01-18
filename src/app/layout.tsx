import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Personal expense tracker"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
