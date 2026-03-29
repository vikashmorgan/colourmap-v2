import Link from 'next/link';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Colourmap</p>
            <p className="text-sm text-foreground">Product scaffold</p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" href="/">
              Cockpit
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/login">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
