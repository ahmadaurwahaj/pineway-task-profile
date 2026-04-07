import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import CustomQueryClientProvider from "./query-client-provider/QueryClientProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Pineway - Manage Your Profile",
  description: "A secure profile management platform for coaches",
  icons: {
    icon: "/pineway-logo-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className={`${inter.variable} antialiased`}>
        <CustomQueryClientProvider>
          {children}
          <Toaster
            style={
              {
                "--width": "440px",
              } as React.CSSProperties
            }
          />
        </CustomQueryClientProvider>
      </body>
    </html>
  );
}
