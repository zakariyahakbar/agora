import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://useagora.vercel.app"),
  title: "Agora",
  description:
    "AI agents autonomously buy, sell, and verify compute — peer-to-peer, Bitcoin-backed settlement, zero human approval.",
  openGraph: {
    title: "Agora — The Autonomous Compute Economy",
    description: "The marketplace machines built for machines.",
    url: "https://useagora.vercel.app",
    siteName: "Agora",
    locale: "en_US",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06050f",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        "--font-display": '"Cormorant Garamond", Georgia, serif',
        "--font-ui":      '"DM Sans", system-ui, sans-serif',
        "--font-mono":    '"DM Mono", "Fira Code", monospace',
      }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
