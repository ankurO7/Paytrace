import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import Providers from './providers';

export const metadata = { title: 'PayTrace', description: 'Trustless expense splitting on Solana' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}