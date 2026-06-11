export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-neutral-800 bg-gradient-to-b from-transparent to-neutral-900/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
        <div className="flex items-center gap-2 text-sm font-black tracking-tight text-neutral-300">
          <span>⚽</span>
          <span>Prode Mundial 2026</span>
        </div>
        <p className="text-xs text-neutral-500">
          Pronósticos de 4 fuentes · consenso · resultados en vivo
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          © {year}{" "}
          <span className="font-semibold text-neutral-200">Exequiel Vega</span>
          . Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
