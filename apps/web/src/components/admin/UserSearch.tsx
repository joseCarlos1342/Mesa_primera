"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export function UserSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, searchParams, pathname, router]);

  return (
    <div className="relative w-full md:w-64 group">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className={`w-4 h-4 transition-colors ${isPending ? 'text-indigo-400 animate-pulse' : 'text-slate-500 group-focus-within:text-indigo-400'}`} />
      </div>
      <input
        type="search"
        placeholder="Buscar nombre o teléfono..."
        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all shadow-inner"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
