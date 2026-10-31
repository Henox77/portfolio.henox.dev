import { SKILLS } from "@/lib/profile";

/**
 * The stack, as chips under three headings. Plain text rather than logos: at
 * monitor distance a row of brand marks is a smear of colour, where a word is
 * still a word.
 */
export function Skills({
  className = "",
  titled = true,
}: {
  className?: string;
  /** Off where the page already heads the section, so it isn't said twice. */
  titled?: boolean;
}) {
  return (
    <section
      aria-label="Teknolojiler"
      className={`rounded-card bg-screen-raised px-4 py-3.5 ${className}`}
    >
      {titled && (
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Teknolojiler
        </h2>
      )}
      <div className="space-y-3">
        {SKILLS.map(({ group, items }) => (
          <div key={group}>
            <h3 className="text-[12px] text-ink-dim">{group}</h3>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-screen-hi px-2.5 py-[3px] font-mono text-[11.5px] text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
