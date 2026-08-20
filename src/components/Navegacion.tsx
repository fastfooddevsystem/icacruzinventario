"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/panel", texto: "Panel" },
  { href: "/inventario", texto: "Inventario" },
  { href: "/inventario/nuevo", texto: "Registrar" },
  { href: "/verificacion", texto: "Verificación física" },
];

export default function Navegacion({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const pestanas = esAdmin
    ? [...PESTANAS, { href: "/admin", texto: "Administración" }]
    : PESTANAS;

  return (
    <nav className="flex flex-wrap gap-1">
      {pestanas.map((p) => {
        // "Registrar" solo se marca en su ruta exacta; las demas admiten subrutas.
        const activa =
          p.href === "/inventario/nuevo"
            ? ruta === p.href
            : ruta === p.href ||
              (p.href !== "/panel" && ruta.startsWith(`${p.href}/`));

        return (
          <Link
            key={p.href}
            href={p.href}
            className={`rounded px-3 py-1.5 text-[13px] transition ${
              activa
                ? "bg-white font-semibold text-siga"
                : "text-slate-200 hover:bg-white/15 hover:text-white"
            }`}
          >
            {p.texto}
          </Link>
        );
      })}
    </nav>
  );
}
