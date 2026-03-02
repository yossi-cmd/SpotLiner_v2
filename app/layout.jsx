import "./globals.css";

export const metadata = {
  title: "SpotLiner",
  description: "אפליקציית מוזיקה שיתופית",
  manifest: "/manifest.webmanifest",
  themeColor: "#121212",
  appleWebApp: {
    capable: true,
    title: "SpotLiner",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
