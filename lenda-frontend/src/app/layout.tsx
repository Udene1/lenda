import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

// const inter = Inter({ subsets: ["latin"] });
const inter = { className: "font-sans" }; // Fallback to system sans

export const metadata: Metadata = {
  title: "Lenda Protocol | DeFi Lending on Base",
  description: "Next-generation institutional-grade lending protocol on Base network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen`}>
        <Providers>
          {children}
        </Providers>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
