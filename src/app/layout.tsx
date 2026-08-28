import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://commonground-travel.a-deghiedy.chatgpt.site"),
  title: "CommonGround Travel — Decide together. Travel better.",
  description:
    "A WebMCP-native group travel workspace where humans and AI agents reach fair, auditable hotel decisions together.",
  openGraph: {
    title: "CommonGround Travel",
    description: "Different travelers. One fair decision everyone can live with.",
    url: "https://commonground-travel.a-deghiedy.chatgpt.site",
    siteName: "CommonGround Travel",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "CommonGround Travel — Decide together. Travel better." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CommonGround Travel",
    description: "A WebMCP-native group travel decision workspace.",
    images: ["/og.png"],
  },
  icons: { icon: "/og.png", apple: "/og.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {process.env.WEBMCP_ORIGIN_TRIAL_TOKEN ? (
          <meta httpEquiv="origin-trial" content={process.env.WEBMCP_ORIGIN_TRIAL_TOKEN} />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
