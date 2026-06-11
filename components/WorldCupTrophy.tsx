// Copa del Mundo — imagen provista por el usuario (public/cup.png).
export function WorldCupTrophy({ size = 72 }: { size?: number }) {
  return (
    <img
      src="/cup.png"
      alt="Copa del Mundo"
      width={size}
      height={size * 1.5}
      className="object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
      style={{ height: size * 1.5, width: "auto" }}
    />
  );
}
