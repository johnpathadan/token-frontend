import './globals.css';

export const metadata = { title: 'Synthetic Index Studio' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900">
        {children}
      </body>
    </html>
  );
}