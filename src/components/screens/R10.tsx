import { R10_URL } from "@/lib/r10";

/**
 * A screenshot of the R10.net profile, linking to the real one.
 *
 * A picture rather than a rebuilt widget: it's what the profile actually looks
 * like, and the click takes you to the live page anyway. The phone number on
 * it is blurred in the image itself (public/r10/profile.webp), not by CSS.
 */
export function R10() {
  return (
    <a
      href={R10_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="R10.net profilini aç"
      className="group relative block h-full w-full overflow-hidden bg-black focus-visible:outline-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/r10/profile.webp"
        alt="henoxdev kullanıcısının R10.net profili"
        width={1720}
        height={850}
        className="h-full w-full object-cover object-top"
      />
      <span className="absolute bottom-5 right-5 rounded-full bg-black/70 px-4 py-2 font-mono text-[12px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        R10&apos;da aç ↗
      </span>
    </a>
  );
}
