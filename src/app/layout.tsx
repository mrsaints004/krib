import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Krib — Student Accommodation, Verified",
  description:
    "A trusted digital platform for Nigerian university students to find, book, and manage off-campus housing.",
  openGraph: {
    title: "Krib — Student Accommodation, Verified",
    description:
      "Find, book, and manage verified off-campus housing near Nigerian universities.",
    type: "website",
    siteName: "Krib",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Krib — Student Accommodation, Verified",
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
      <body className="bg-paper-50 font-sans text-ink-900 antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
