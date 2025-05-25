import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Spendify Hub",
  description: "Manage your expense",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
            <head>
        {/* PWA related meta tags and links */}
        <meta name="application-name" content="Spendify" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Spendify" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" /> {/* Optional, for Edge */}
        <meta name="msapplication-TileColor" content="#4A90E2" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#4A90E2" />

        {/* Recommended icon sizes for Apple devices */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        {/* Example: for Safari pinned tabs, adjust color to your theme */}
        <link rel="mask-icon" href="/icons/icon-192x192.png" color="#4A90E2" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        {/* End PWA related tags */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
