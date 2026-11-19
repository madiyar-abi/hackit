import type { Metadata } from "next";
import "@fontsource-variable/onest";
import "@fontsource-variable/unbounded";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Пульс продаж — контроль торговой команды",
  description:
    "Автоматический контроль торговых представителей: отклонения, причины, уведомления руководству.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <div className="min-h-screen md:flex">
          <Nav />
          <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-8">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
