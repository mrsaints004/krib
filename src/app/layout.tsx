import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "UniNest — Student Accommodation, Verified",
  description:
    "A trusted digital platform for Nigerian university students to find, book, and manage off-campus housing.",
  openGraph: {
    title: "UniNest — Student Accommodation, Verified",
    description:
      "Find, book, and manage verified off-campus housing near Nigerian universities.",
    type: "website",
    siteName: "UniNest",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "UniNest — Student Accommodation, Verified",
    description:
      "Find, book, and manage verified off-campus housing near Nigerian universities.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} bg-paper-50 font-sans text-ink-900 antialiased`}
      >
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
