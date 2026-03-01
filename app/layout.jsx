import "./globals.css";

export const metadata = {
  title: "SpotLiner",
  description: "אפליקציית מוזיקה שיתופית",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
