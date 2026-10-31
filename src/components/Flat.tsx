import type { ActivityFeed } from "@/lib/activity";
import { PROFILE } from "@/lib/profile";

import { CommitFeed } from "./screens/CommitFeed";
import { NowPlaying } from "./screens/NowPlaying";
import { R10 } from "./screens/R10";
import { Skills } from "./screens/Skills";

/**
 * The site without the room — not a degraded version, the same content, and for
 * someone skimming on a train the better of the two. Building it well is what
 * lets the 3D be uncompromising, since nobody is stuck with the 3D.
 *
 * Server-rendered, so the text is in the HTML source whichever mode a visitor
 * ends up in.
 */
export function Flat({ feed }: { feed: ActivityFeed | null }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-8">
      <header>
        <h1 className="text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          {PROFILE.name}
        </h1>
        <p className="mt-4 inline-block rounded-full bg-accent/12 px-3.5 py-1.5 font-mono text-sm text-accent">
          {PROFILE.role} · {PROFILE.location}
        </p>

        <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-ink-dim">
          {PROFILE.bio.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
          {PROFILE.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-baseline gap-2"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                  {link.label}
                </span>
                <span className="text-[15px] text-ink underline decoration-screen-line underline-offset-4 transition-colors group-hover:decoration-accent">
                  {link.handle}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </header>

      <Section title="Teknolojiler">
        <Skills titled={false} />
      </Section>

      <Section title="R10.net">
        <div className="aspect-[1720/850] overflow-hidden rounded-panel ring-1 ring-screen-line">
          <R10 />
        </div>
      </Section>

      <Section title="Şimdi çalıyor">
        {/* Fixed height: a player client needs room for a header, a track list
            and a transport bar, and at 320px all three fought for forty. */}
        <div className="overflow-hidden rounded-panel ring-1 ring-screen-line">
          <div className="h-[560px]">
            <NowPlaying />
          </div>
        </div>
      </Section>

      <Section title="Commit'ler">
        <div className="overflow-hidden rounded-panel ring-1 ring-screen-line">
          <div className="h-[560px]">
            <CommitFeed initial={feed} />
          </div>
        </div>
      </Section>

      <footer className="mt-16 border-t border-screen-line pt-6 font-mono text-[12px] text-ink-faint">
        Commit akışı zamanlanmış bir görevle üretilir. İş commit&apos;leri yalnızca tür
        etiketiyle görünür — mesajları onları toplayan görevden hiç çıkmaz.
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <h2 className="mb-5 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}
