import "./globals.css";
import { Manrope, Oswald } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata = {
  title: "3000+ Presets Pack",
  description: "One click Premiere Pro presets. Pay securely and get the Google Drive link on email.",
  openGraph: {
    title: "3000+ Presets Pack",
    description: "Edit faster. Create better. Instant download after payment.",
    images: ["/banner.jpg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b16",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${oswald.variable}`}>
      <head>
        <link rel="preload" as="image" href="/banner.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
