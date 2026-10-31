"use client";

import type { ActivityFeed, Commit } from "@/lib/activity";
import { PROFILE } from "@/lib/profile";
import { useActivity } from "@/lib/useActivity";

import { Skills } from "./Skills";

const WEEKS = 18;

/**
 * A contribution grid from the same commits the left monitor lists.
 */
function ContributionGrid({
  commits,
  workDays,
}: {
  commits: Commit[];
  workDays?: Record<string, number>;
}) {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const day = c.at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  for (const [day, count] of Object.entries(workDays ?? {})) {
    counts.set(day, (counts.get(day) ?? 0) + count);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekday = (today.getUTCDay() + 6) % 7;
  const last = new Date(today);
  last.setUTCDate(last.getUTCDate() + (6 - weekday));

  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (WEEKS * 7 - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      future: d > today,
      count: counts.get(key) ?? 0,
      col: Math.floor(i / 7),
      row: i % 7,
    };
  });

  const tone = (n: number) =>
    n === 0
      ? "bg-screen-raised"
      : n < 3
        ? "bg-accent/25"
        : n < 6
          ? "bg-accent/50"
          : n < 12
            ? "bg-accent/75"
            : "bg-accent";

  return (
    <div className="mt-auto pt-8">
      <div
        className="grid w-fit grid-flow-col gap-[4px]"
        style={{ gridTemplateRows: "repeat(7, 13px)" }}
        role="img"
        aria-label={`Son ${WEEKS} haftadaki commit aktivitesi`}
      >
        {cells.map((c) => (
          <span
            key={c.key}
            title={c.future ? undefined : `${c.key}: ${c.count} commit`}
            className={`size-[13px] rounded-[4px] ${
              c.future ? "bg-transparent" : tone(c.count)
            }`}
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-ink-faint">
        son {WEEKS} hafta
      </p>
    </div>
  );
}

/** Name, claim and contact, in that order, readable in about eight seconds. */
export function About({ initial }: { initial?: ActivityFeed | null }) {
  const { feed } = useActivity(initial ?? null);

  return (
    <div className="grid h-full w-full grid-cols-[1.45fr_1fr] gap-8 overflow-hidden bg-screen bg-[radial-gradient(110%_80%_at_35%_0%,#161c20_0%,transparent_68%)] px-9 py-8 font-sans text-ink-dim">
      <div className="flex flex-col">
        <h1 className="text-[44px] font-medium leading-none tracking-tight text-ink">
          {PROFILE.name}
        </h1>
        <p className="mt-4">
          <span className="rounded-full bg-accent/12 px-3 py-[5px] font-mono text-[13px] text-accent">
            {PROFILE.role} · {PROFILE.location}
          </span>
        </p>

        <div className="mt-7 max-w-[52ch] space-y-4 text-[16px] leading-relaxed">
          {PROFILE.bio.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        {feed && (
          <ContributionGrid commits={feed.commits} workDays={feed.workDays} />
        )}

        {feed && (
          <p className="mt-5">
            <span className="inline-block rounded-full bg-screen-raised px-4 py-2 font-mono text-[13px] text-ink-faint tabular-nums">
              Son bir yılda {feed.totals.year} commit
              {feed.totals.streak > 0 && ` · ${feed.totals.streak} gün seri`}
              {` · GitHub'da ${PROFILE.githubSince}'den beri`}
            </span>
          </p>
        )}
      </div>

      <ul className="flex flex-col justify-center gap-2.5">
        <li>
          <Skills className="mb-1.5" />
        </li>
        {PROFILE.links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="block rounded-card bg-screen-raised px-4 py-3 transition-colors duration-150 hover:bg-screen-hi focus-visible:bg-screen-hi focus-visible:outline-none"
            >
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                {link.label}
              </span>
              <span className="mt-1 block truncate text-[15px] text-ink">
                {link.handle}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
