'use client';
import "./v3-harmony.css";
import Sidebar from "../components/Sidebar";
import CinematicIntro from "../components/CinematicIntro";
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="pt-BR" className="bg-[#030712]">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="description" content="Sentinela IA - AI Auditor para auditoria de leads" />
        <meta name="theme-color" content="#030712" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased text-slate-300 font-sans overflow-x-hidden">
        <CinematicIntro />
        {!isLoginPage && <Sidebar />}
        <main className={!isLoginPage ? "transition-all duration-300 md:pl-56" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}
