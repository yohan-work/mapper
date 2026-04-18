import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapper — 지도 위 실시간 약속",
  description:
    "친구들과 약속을 만들고 목적지까지 서로의 실시간 위치와 ETA를 지도에서 확인하세요.",
  manifest: "/manifest.json",
  applicationName: "Mapper",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mapper",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  openGraph: {
    title: "Mapper",
    description: "지도 위 실시간 약속",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-full">{children}</body>
    </html>
  );
}
