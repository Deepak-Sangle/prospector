import { BrandLink } from "./brand-link";
import { INSTALL_URL } from "./constants";
import { PickaxeMark } from "./icons";
import { Reveal } from "./reveal";

export function CtaSection() {
  return (
    <section className="section cta">
      <div className="shell">
        <Reveal className="cta__inner">
          <span className="cta__mark">
            <PickaxeMark width={38} height={38} />
          </span>
          <h2>Put Prospector to work this week.</h2>
          <p className="lede">
            Set one monitor today, and watch the mentions that matter start
            landing in your channel — each with a response ready to send back in
            one tap.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href={INSTALL_URL}>
              Add to Slack
            </a>
            <a
              className="btn btn--ghost"
              href="https://github.com/withsia/prospector"
            >
              Read the docs
            </a>
          </div>
          <p className="hero__note">
            No account to create. Uninstall any time.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top">
          <BrandLink />
          <nav className="footer__links" aria-label="Footer">
            <a href="#how">How it works</a>
            <a href="#talk">Talk to it</a>
            <a href="https://github.com/withsia/prospector">GitHub</a>
            <a href="https://slackhack.devpost.com">Devpost</a>
          </nav>
        </div>
        <p className="footer__legal">
          Prospector is a brand-monitoring and social-listening agent for Slack,
          built for the Slack Agent Builder Challenge. It watches public
          conversations you tell it to and drafts responses — and, once you
          connect your accounts, posts them back to the source only when you tap
          send.
        </p>
        <p className="footer__meta">© 2026 Prospector · Built with Love</p>
      </div>
    </footer>
  );
}
