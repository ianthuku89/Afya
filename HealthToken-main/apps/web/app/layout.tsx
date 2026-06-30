import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../providers/AuthProvider';

export const metadata: Metadata = {
  title: 'AfyaToken Platform — Seaboard Technologies',
  description: 'AfyaToken — Blockchain-powered, DHA-certified digital health financing',
  keywords: ['AfyaToken', 'Kenya', 'healthcare', 'blockchain', 'SHA', 'DHA', 'FHIR'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
