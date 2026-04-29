import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"]
})

export const metadata: Metadata = {
    title: "Expense Tracker",
    description: "Personalized expense tracker"
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    rel="icon"
                    href="/favicon.svg"
                    type="image/svg+xml"
                ></link>
            </head>
            <body className={`${inter.variable} antialiased`}>{children}</body>
        </html>
    )
}
