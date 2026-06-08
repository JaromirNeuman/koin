import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PageTransitionProvider } from "@/components/layout/page-transition";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koin – inteligentní správce financí",
  description:
    "Sledujte příjmy a výdaje, analyzujte trendy a získejte personalizovaná doporučení díky AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <PageTransitionProvider>{children}</PageTransitionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
