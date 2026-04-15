import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout min-h-screen bg-gray-900 text-white">
      <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center backdrop-blur-sm bg-gray-900/80">
        <Link
          href="/admin"
          className="text-xl md:text-2xl font-black tracking-tight text-white hover:text-indigo-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-sm"
        >
          Panel Administrativo
        </Link>
        <SignOutButton variant="danger" />
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
