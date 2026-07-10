import React from "react";
import { INSTALL_URL } from "./constants";
import { LinkedInGlyph, RedditGlyph, SlackLogo, XGlyph } from "./icons";
import { Reveal } from "./reveal";

const stats = [
  {
    fig: "3",
    accent: "",
    label: "platforms watched",
    sub: "Reddit, LinkedIn & X, in one place",
  },
  {
    fig: "1",
    accent: "",
    label: "tap to respond",
    sub: "posts straight back to the source",
  },
  {
    fig: "0",
    accent: "",
    label: "dashboards to check",
    sub: "everything inside slack",
  },
];

const platforms = [
  { icon: <RedditGlyph style={{ color: "var(--reddit)" }} />, label: "Reddit" },
  {
    icon: <LinkedInGlyph style={{ color: "var(--linkedin)" }} />,
    label: "LinkedIn",
  },
  { icon: <XGlyph style={{ color: "var(--x)" }} />, label: "X" },
];

export function HeroSection() {
  return (
    <section className="hero" id="top">
      <div className="hero__glow" />
      <div className="shell hero__inner">
        <p className="eyebrow eyebrow--brand hero-anim">
          Brand monitoring · LEAD GENERATION · PAIN POINT ANALYTICS · CUSTOMER
          SUCCESS
        </p>

        <h1
          className="hero-anim"
          style={{ "--anim-delay": "80ms" } as React.CSSProperties}
        >
          Watch every conversation about your brand and{" "}
          <span className="serif-accent">reply in one tap</span>
        </h1>

        <p
          className="lede hero-anim"
          style={{ "--anim-delay": "180ms" } as React.CSSProperties}
        >
          Prospector watches Reddit, LinkedIn, and X for the mentions that
          matter, new customers, competitor moves, complaints, support
          questions, drafts a response for each, and posts it straight back to
          the platform when you say go. All without leaving Slack.
        </p>

        <div
          className="hero__cta hero-anim"
          style={{ "--anim-delay": "280ms" } as React.CSSProperties}
        >
          <a className="btn btn--primary" href={INSTALL_URL}>
            <SlackLogo width={20} height={20} aria-hidden />
            Add to Slack
          </a>
          <a className="btn btn--ghost" href="#how">
            See how it works
          </a>
        </div>

        <div
          className="platforms hero-anim"
          style={{ "--anim-delay": "460ms" } as React.CSSProperties}
        >
          {platforms.map(({ icon, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className="platforms__sep" />}
              <span className="platforms__item">
                {icon} {label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div
        className="shell"
        style={{ marginTop: "clamp(4rem, 3rem + 6vw, 7rem)" }}
      >
        <Reveal className="stats">
          {stats.map((s, i) => (
            <div
              className="stat"
              key={s.label}
              style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="stat__fig">
                {s.fig}
                <em>{s.accent}</em>
              </div>
              <div className="stat__label">{s.label}</div>
              <div className="stat__sub">{s.sub}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
