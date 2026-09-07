import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spendwise.pages.dev";

export const viewport: Viewport = {
  themeColor: "#08070b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SpendWise - Smart Personal Finance & Expense Tracker",
    template: "%s | SpendWise"
  },
  description: "Track daily expenses, manage EMIs, calculate 50/30/20 budgets, and achieve financial clarity with SpendWise.",
  keywords: [
    "personal finance",
    "expense tracker",
    "budgeting app",
    "EMI calculator",
    "50/30/20 rule",
    "financial freedom",
    "money management",
    "spendwise"
  ],
  authors: [{ name: "SpendWise Team" }],
  creator: "SpendWise",
  publisher: "SpendWise",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "SpendWise - Smart Personal Finance & Expense Tracker",
    description: "Track daily expenses, manage EMIs, calculate 50/30/20 budgets, and achieve financial clarity with SpendWise.",
    siteName: "SpendWise",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendWise - Smart Personal Finance & Expense Tracker",
    description: "Track daily expenses, manage EMIs, calculate 50/30/20 budgets, and achieve financial clarity with SpendWise.",
    creator: "@spendwise",
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="canonical" href={siteUrl} />
      </head>
      <body className="min-h-screen bg-[#08070b] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
