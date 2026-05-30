export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header for client pages */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-semibold text-lg">HomeX CRM</div>
          <nav className="flex gap-6 text-sm">
            <a href="/properties" className="hover:text-primary">
              Properties
            </a>
            <a href="/appointments" className="hover:text-primary">
              Appointments
            </a>
            <a href="/profile" className="hover:text-primary">
              Profile
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          © 2026 HomeX CRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
