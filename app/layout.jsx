export const metadata = {
  title: "Vibe Tracker — Mixed",
  description: "Packs • Pulls • Trading • Verified"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
