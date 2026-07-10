import { ArrowDown, PickaxeMark, RedditGlyph } from "./icons";
import { Reveal } from "./reveal";
import { SectionHead } from "./section-head";

export function HowSection() {
  return (
    <section className="section section--alt" id="how">
      <div className="shell">
        <SectionHead eyebrow="The loop" heading="How it works" center />

        <div style={{ marginTop: "clamp(3.5rem, 2rem + 5vw, 6rem)" }}>
          <Reveal as="article" className="step">
            <div className="step__copy">
              <span className="step-marker">
                <span className="step-marker__num">1</span> Step one
              </span>
              <h3>Tell it what to watch for</h3>
              <p>
                Create a monitor from a DM or a Slack modal: your brand, your
                competitors, a product category, complaint phrases — the
                platforms to watch, how often to run, the channel that gets
                mentions, and plain-English rules for what counts. No query
                syntax to learn.
              </p>
              <div className="step__foot">
                <PickaxeMark width={16} height={16} /> Create unlimited such
                monitors.
              </div>
            </div>
            <div className="step__media">
              <MonitorDemo />
            </div>
          </Reveal>

          <Reveal as="article" className="step step--flip" delay={40}>
            <div className="step__copy">
              <span className="step-marker">
                <span className="step-marker__num">2</span> Step two
              </span>
              <h3>It filters noise so you can focus on what matters</h3>
              <p>
                On the schedule you set, Prospector pulls candidate posts, then
                uses AI Agent to keep only the mentions that match your rules
                and drafts a fitting response for each. The noise never reaches
                you.
              </p>
              <div className="step__foot">
                Powered by Slack Agent Builder and Bridgly APIs.
              </div>
            </div>
            <div className="step__media">
              <FilterDemo />
            </div>
          </Reveal>

          <Reveal as="article" className="step" delay={40}>
            <div className="step__copy">
              <span className="step-marker">
                <span className="step-marker__num">3</span> Step three
              </span>
              <h3>Reply in one tap inside Slack app</h3>
              <p>
                Each mention arrives as a Slack card: the original post, a link,
                what it matched, and a response drafted in your voice. Connect
                your social accounts once, and post the reply straight back to
                the source — right there in the thread. Or edit it, regenerate
                it, or dismiss it.
              </p>
              <div className="step__foot">
                Official OAuth connections only. No ban risk.
              </div>
            </div>
            <div className="step__media">
              <LeadDemo />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MonitorDemo() {
  return (
    <div
      className="demo"
      role="img"
      aria-label="Prospector's create-monitor form showing keywords, platforms, frequency, channel, and filter instructions"
    >
      <div className="demo__bar">
        <span className="demo__dot" />
        New monitor
      </div>
      <div className="demo__body">
        <div className="field field--first">
          <div className="field__label">Keywords</div>
          <div className="chips">
            <span className="chip">mentions of Acme</span>
            <span className="chip">Acme alternatives</span>
            <span className="chip">Acme keeps crashing</span>
            <span className="chip chip--ghost">+ add</span>
          </div>
        </div>

        <div className="field">
          <div className="field__label">Platforms</div>
          <div className="field__row">
            <span className="chip chip--plain">Reddit</span>
            <span className="chip chip--plain">LinkedIn</span>
            <span className="chip chip--ghost">X</span>
          </div>
        </div>

        <div className="field">
          <div className="field__label">Frequency</div>
          <div className="seg">
            <span>Hourly</span>
            <span data-on="true">Every 6 hours</span>
            <span>Daily</span>
          </div>
        </div>

        <div className="field">
          <div className="field__label">Filter instructions</div>
          <div className="field__input">
            Flag buying intent, competitor comparisons, and complaints. Skip our
            own team and job posts.
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterDemo() {
  return (
    <div
      className="demo"
      role="img"
      aria-label="A noisy search result being filtered down into one mention that matters"
    >
      <div className="demo__bar">
        <span className="demo__dot" />
        Scanning r/SaaS · 63 posts
      </div>
      <div className="demo__body">
        <div className="transform__from">
          <span className="demo__minilabel">What the raw feed looks like</span>
          <p>
            63 posts mentioning &ldquo;Acme&rdquo; — job ads, memes, a changelog
            repost, two rants…
          </p>
        </div>
        <div className="transform__arrow">
          <ArrowDown width={16} height={16} /> filtered by keywords + your rules
        </div>
        <div className="transform__to">
          <span className="demo__minilabel">One mention that matters</span>
          <p>
            &ldquo;Been on hold with Acme support for 3 days. Is anyone actually
            happy with their tool right now?&rdquo;
          </p>
          <div className="transform__tags">
            <span className="chip">complaint · churn risk</span>
            <span className="chip">mentions of Acme</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadDemo() {
  return (
    <div
      className="demo"
      role="img"
      aria-label="A Slack card posted by Prospector with a drafted response and Send, Regenerate, and Dismiss actions"
    >
      <div className="demo__bar">
        <span className="demo__dot" />
        #brand-watch
      </div>
      <div className="demo__body">
        <div className="lead__head">
          <span className="lead__avatar">
            <PickaxeMark width={18} height={18} />
          </span>
          <span className="lead__who">
            Prospector <span className="lead__bot">App</span>
            <span className="lead__time">· 9:41 AM</span>
          </span>
        </div>

        <div className="lead__quote">
          &ldquo;Been on hold with Acme support for 3 days. Is anyone actually
          happy with their tool right now?&rdquo;
          <div className="lead__src">
            <RedditGlyph
              width={15}
              height={15}
              style={{ color: "var(--reddit)" }}
            />
            r/SaaS · matched &ldquo;complaint · churn risk&rdquo;
          </div>
        </div>

        <div className="lead__draft">
          <span className="demo__minilabel">Drafted response</span>
          <p>
            So sorry you&apos;ve been stuck — that&apos;s not the experience we
            want. I&apos;m on the Acme team; DM me your ticket number and
            I&apos;ll get someone on it today…
          </p>
        </div>

        <div className="lead__actions">
          <button type="button" className="lead__btn lead__btn--go">
            Send to Reddit
          </button>
          <button type="button" className="lead__btn">
            Regenerate
          </button>
          <button type="button" className="lead__btn lead__btn--warn">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
