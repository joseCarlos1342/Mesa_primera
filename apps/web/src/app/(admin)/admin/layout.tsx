import Link from "next/link";
import { AdminHeaderActions } from "@/components/admin/AdminHeaderActions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-gray-900/80 px-4 py-3.5 backdrop-blur-sm sm:px-6">
        <Link
          href="/admin"
          className="rounded-sm text-lg font-black tracking-tight text-white transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:text-xl md:text-2xl"
        >
          Admin
        </Link>
        <AdminHeaderActions />
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
