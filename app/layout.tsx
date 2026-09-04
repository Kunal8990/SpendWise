import "./globals.css";

export const metadata = {
  title: "SpendWise",
  description: "Personal finance dashboard and expense tracker"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
