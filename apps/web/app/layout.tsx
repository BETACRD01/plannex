import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plannex - Pagos y Planificación',
  description: 'Paga de una, planifica tus fechas y lleva el registro total de tus pagos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
