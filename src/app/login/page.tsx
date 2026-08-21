"use client";

import { useActionState, useState } from "react";
import { INSTITUCION } from "@/lib/supabase/config";
import { iniciarSesion, type EstadoLogin } from "./acciones";

const INICIAL: EstadoLogin = {};

export default function PaginaLogin() {
  const [estado, enviar, pendiente] = useActionState(iniciarSesion, INICIAL);
  const [verClave, setVerClave] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="rounded-t-lg bg-siga px-6 py-5 text-white">
          <h1 className="text-xl font-bold tracking-wide">ICACRUZ</h1>
          <p className="text-xs opacity-80">
            Sistema Integrado de Gestión de Bienes
          </p>
          <p className="mt-1 text-xs opacity-80">{INSTITUCION}</p>
        </header>

        <form action={enviar} className="space-y-4 px-6 py-6">
          <h2 className="text-sm font-semibold text-slate-700">
            Iniciar sesión
          </h2>

          <Campo
            etiqueta="Correo institucional"
            nombre="correo"
            type="email"
            autoComplete="email"
            placeholder="usuario@icacruz.bo"
          />

          <Campo
            etiqueta="Contraseña"
            nombre="clave"
            type={verClave ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-16"
          >
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              aria-pressed={verClave}
              aria-controls="clave"
              className="absolute inset-y-0 right-0 px-3 text-[11px] font-semibold uppercase tracking-wide text-siga hover:text-siga-claro"
            >
              {verClave ? "Ocultar" : "Ver"}
            </button>
          </Campo>

          {estado.error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {estado.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pendiente}
            className="w-full rounded bg-siga px-4 py-2.5 text-sm font-semibold text-white hover:bg-siga-claro disabled:opacity-60"
          >
            {pendiente ? "Procesando…" : "Entrar al sistema"}
          </button>

          <p className="text-center text-[11.5px] text-slate-500">
            Las cuentas las crea el administrador del sistema. Si no tiene
            acceso, solicítelo a la unidad de Activos Fijos.
          </p>
        </form>
      </div>
    </main>
  );
}

/** Campo del formulario. El `children` se dibuja encima del input, a la derecha. */
function Campo({
  etiqueta,
  nombre,
  className = "",
  children,
  ...props
}: {
  etiqueta: string;
  nombre: string;
  children?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={nombre}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={nombre}
          name={nombre}
          required
          className={`w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-siga focus:ring-2 focus:ring-siga/20 ${className}`}
          {...props}
        />
        {children}
      </div>
    </div>
  );
}
