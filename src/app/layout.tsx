import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "ANCHOR · Hydrological Intelligence Platform",
  description: "AI-powered river water-level forecasting and flood intelligence for the Bengawan Solo watershed.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const themeScript = `
  try {
    const raw = localStorage.getItem('anchor-ui');
    let theme = 'dark';
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.state && parsed.state.theme) {
        theme = parsed.state.theme;
      }
    }
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
