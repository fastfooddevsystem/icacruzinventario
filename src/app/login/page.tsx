"use client";

import { useActionState, useState } from "react";
import { INSTITUCION } from "@/lib/supabase/config";
import { iniciarSesion, registrarse, type EstadoLogin } from "./acciones";

const INICIAL: EstadoLogin = {};

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [estado, enviar, pendiente] = useActionState(
    modo === "entrar" ? iniciarSesion : registrarse,
    INICIAL,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="rounded-t-lg bg-[#1f3864] px-6 py-5 text-white">
          <h1 className="text-xl font-bold tracking-wide">SIGA</h1>
          <p className="text-xs opacity-80">
            Sistema Integrado de Gestión de Activos
          </p>
          <p className="mt-1 text-xs opacity-80">{INSTITUCION}</p>
        </header>

        <form action={enviar} className="space-y-4 px-6 py-6">
          <div className="flex gap-1 rounded border border-slate-300 p-1 text-sm">
            <button
              type="button"
              onClick={() => setModo("entrar")}
              className={`flex-1 rounded px-3 py-1.5 ${
                modo === "entrar"
                  ? "bg-[#1f3864] font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setModo("crear")}
              className={`flex-1 rounded px-3 py-1.5 ${
                modo === "crear"
                  ? "bg-[#1f3864] font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {modo === "crear" && (
            <Campo
              etiqueta="Nombre completo"
              nombre="nombre"
              type="text"
              autoComplete="name"
              placeholder="Ej. Josué Coro Orellana"
            />
          )}

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
            type="password"
            autoComplete={
              modo === "entrar" ? "current-password" : "new-password"
            }
            placeholder="••••••••"
          />

          {estado.error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {estado.error}
            </p>
          )}
          {estado.aviso && (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {estado.aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={pendiente}
            className="w-full rounded bg-[#1f3864] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2d4f8f] disabled:opacity-60"
          >
            {pendiente
              ? "Procesando…"
              : modo === "entrar"
                ? "Entrar al sistema"
                : "Crear mi cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Campo({
  etiqueta,
  nombre,
  ...props
}: { etiqueta: string; nombre: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={nombre}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {etiqueta}
      </label>
      <input
        id={nombre}
        name={nombre}
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2d4f8f] focus:ring-2 focus:ring-slate-200"
        {...props}
      />
    </div>
  );
}
