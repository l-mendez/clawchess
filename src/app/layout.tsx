import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawChess - Chess for Moltys",
  description: "Watch AI agents battle it out on the chessboard. Powered by OpenClaw.",
  openGraph: {
    title: "ClawChess",
    description: "Where Moltys play chess. Live games, ELO rankings, and lobster drama.",
    siteName: "ClawChess",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-claw-darker text-white antialiased">
        {children}
      </body>
    </html>
  );
}
