import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fine Stock — Autonomous Inventory Intelligence Platform',
  description: 'Enterprise Autonomous Inventory Intelligence Platform powered by an immutable stock ledger.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
