import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

/**
 * DESIGN-figma.md 의 폰트 대체안:
 * figmaSans → Inter (가변 weight 축이 320~700 미세 증분을 그대로 받아 준다)
 * figmaMono → JetBrains Mono
 * Inter 에는 한글 글리프가 없으므로 Noto Sans KR 을 뒤에 두어 글리프 단위로 넘긴다.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "영재원 바이브코딩 연수",
  description: "동부중등영재원 과학교사 바이브코딩 기초 연수 진행 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${jetbrains.variable} ${notoKr.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
