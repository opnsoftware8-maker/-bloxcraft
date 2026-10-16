import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CraftPiece 3D Action RPG",
  description:
    "Browser 3D Action RPG Prototype using React, TypeScript, and Three.js with third-person player controller, starter island, mobile touch controls, and M1 combat.",
  openGraph: {
    title: "CraftPiece 3D Action RPG",
    description:
      "Browser 3D Action RPG Prototype using React, TypeScript, and Three.js with third-person player controller, starter island, mobile touch controls, and M1 combat.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="h-full w-full overflow-hidden antialiased select-none touch-none overscroll-none">
        {children}
      </body>
    </html>
  );
}
