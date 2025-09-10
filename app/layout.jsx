// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "TrackBased — Vibe Tracker",
  description: "VibeMarket activity • marketplace • pulls • verified creators • trade"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}