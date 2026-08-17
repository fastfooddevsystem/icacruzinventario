"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PREFIJO } from "@/lib/supabase/config";

/** Busca un bien por su código para abrir su ficha y verificarlo. */
export default function BuscarCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  const abrir = () => {
    const c = codigo.trim().toUpperCase();
    if (c) router.push(`/inventario/${encodeURIComponent(c)}`);
  };

  return (
    <div className="noprint flex flex-wrap gap-2">
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && abrir()}
        placeholder={`Escriba el código del bien (ej. ${PREFIJO}-LPT-0001)`}
        className="min-w-[230px] flex-1 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-sm uppercase outline-none focus:border-[#2d4f8f] focus:ring-2 focus:ring-slate-200"
      />
      <button
        type="button"
        onClick={abrir}
        className="rounded bg-[#1f3864] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#2d4f8f]"
      >
        Abrir ficha
      </button>
    </div>
  );
}
