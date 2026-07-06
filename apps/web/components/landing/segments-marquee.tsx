const segments = [
  "Odontologia",
  "Estética",
  "Medicina",
  "Fisioterapia",
  "Psicologia",
  "Nutrição",
  "Veterinária",
  "Dermatologia",
  "Podologia",
  "Salões e estúdios",
];

function Row({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {segments.map((s, i) => (
        <span key={s} className="flex items-center">
          <span
            className={`font-display px-8 text-2xl font-semibold italic tracking-tight sm:px-10 sm:text-3xl ${
              i % 2 === 0 ? "text-foreground/80" : "text-outline"
            }`}
          >
            {s}
          </span>
          <span className="text-lg text-[var(--accent-strong)]" aria-hidden>
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

export function SegmentsMarquee() {
  return (
    <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
      <div className="animate-marquee flex w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
