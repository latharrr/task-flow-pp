import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'TaskFlow',
  description: 'Team task management mobile prototype.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/rough.js/2.1.1/rough.umd.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
