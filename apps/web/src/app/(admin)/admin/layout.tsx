export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout min-h-screen bg-gray-900 text-white">
      <header className="p-4 border-b border-gray-700 font-bold">Admin Panel</header>
      <main className="p-4">{children}</main>
    </div>
  );
}
