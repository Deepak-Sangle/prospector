import { AtGlyph, BoltGlyph, ChatGlyph, HomeGlyph } from "./icons";
import { Reveal } from "./reveal";
import { SectionHead } from "./section-head";

const surfaces = [
  {
    icon: <BoltGlyph />,
    title: "Assistant panel",
    body: "Add Prospector as an agent and start from a suggested prompt. Loading status, streaming replies, the works.",
  },
  {
    icon: <ChatGlyph />,
    title: "Direct messages",
    body: "DM it like a teammate. It streams answers in-thread and keeps the context of your conversation.",
  },
  {
    icon: <AtGlyph />,
    title: "Channel @mentions",
    body: "Invite it to a channel and @Prospector. It replies in the thread and stays engaged after.",
  },
  {
    icon: <HomeGlyph />,
    title: "App Home",
    body: "A calm overview of what Prospector watches, plus a one-tap flow to connect your Reddit, LinkedIn, and X accounts.",
  },
];

export function SurfacesSection() {
  return (
    <section className="section section--alt" id="surfaces">
      <div className="shell">
        <SectionHead
          eyebrow="Meets you where you are"
          heading="It lives inside Slack — every corner of it."
        />

        <Reveal className="surfaces">
          {surfaces.map((s, i) => (
            <div
              className="surface-card"
              key={s.title}
              style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
            >
              <div className="surface-card__icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
