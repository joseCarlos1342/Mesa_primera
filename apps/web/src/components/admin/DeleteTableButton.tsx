"use client";

import { Trash2 } from "lucide-react";
import { deleteTable } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTableButton({ tableId, size = "md" }: { tableId: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar configuración de mesa?")) return;
    setPending(true);
    try {
      await deleteTable(tableId);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPending(false);
    }
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const padding = size === "sm" ? "p-2 rounded-lg" : "p-3 rounded-xl";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDelete}
      className={`${padding} bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all disabled:opacity-50`}
    >
      <Trash2 className={iconSize} />
    </button>
  );
}
