import { ChatGlyph } from "./icons";
import { Reveal } from "./reveal";
import { SectionHead } from "./section-head";

const prompts = [
  "List my monitors",
  "Pause the competitor monitor until Monday",
  "Show me this week's complaints about onboarding",
  "Draft a warmer reply to that last mention",
  "Watch Reddit for people comparing us to Notion",
];

export function TalkSection() {
  return (
    <section className="section" id="talk">
      <div className="shell talk">
        <Reveal className="talk__copy">
          <SectionHead
            eyebrow="No commands to memorize"
            heading={
              <>
                Manage all of it by just{" "}
                <span className="serif-accent">talking to it.</span>
              </>
            }
          />
          <p
            className="lede"
            style={{ marginTop: "1.25rem", maxWidth: "42ch" }}
          >
            Prospector is a real Slack agent, not a form with a chat skin. Ask
            it to spin up monitors, pause them, pull recent mentions, or rewrite
            a draft — in a DM, an @mention, or the assistant panel. It remembers
            the thread.
          </p>
        </Reveal>

        <Reveal className="prompts" delay={80}>
          {prompts.map((p, i) => (
            <div
              className="prompt"
              key={p}
              style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
            >
              <ChatGlyph /> {p}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
