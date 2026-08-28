import "./globals.css";

export const metadata = {
  title: "CommonGround Travel",
  description:
    "AI-mediated shared hotel decisions for groups of travelers. Decide together, once.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
