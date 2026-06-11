// Navbar sticky con saltos a cada sección de la misma página (anchors).
// Es un server component: son links #ancla, no necesita JS.
export function NavBar({ groups }: { groups: string[] }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <a href="#top" className="shrink-0 text-sm font-black tracking-tight">
          ⚽ <span className="hidden sm:inline">Prode 2026</span>
        </a>

        {/* Grupos A..L */}
        <div className="flex flex-1 items-center gap-1 overflow-x-auto py-0.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase text-neutral-600">
            Grupos
          </span>
          {groups.map((g) => (
            <a
              key={g}
              href={`#g-${g}`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-neutral-800 text-xs font-bold text-neutral-300 transition-colors hover:bg-pitch hover:text-white"
            >
              {g}
            </a>
          ))}
        </div>

        {/* Fases */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto">
          {[
            ["#r32", "16avos"],
            ["#r16", "8vos"],
            ["#qf", "4tos"],
            ["#sf", "Semis"],
            ["#final", "Final"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-md border border-neutral-700 px-2 py-1 text-xs font-semibold text-neutral-300 transition-colors hover:border-pitch hover:text-white"
            >
              {label}
            </a>
          ))}
          <a
            href="#cuadro"
            className="shrink-0 rounded-md border border-amber-600/50 px-2 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            🏆 Cuadro
          </a>
        </div>
      </div>
    </nav>
  );
}
