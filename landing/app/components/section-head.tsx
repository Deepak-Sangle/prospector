import { Reveal } from "./reveal";

/**
 * Reusable section header: eyebrow label + display heading with consistent
 * fluid-type sizing. Centered when `center` is true.
 */
export function SectionHead({
  eyebrow,
  heading,
  center = false,
}: {
  eyebrow: string;
  heading: React.ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={`section-head${center ? " section-head--center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2
        className="display"
        style={{
          fontSize: "clamp(2rem, 1.2rem + 3vw, 3.1rem)",
          marginTop: "1.25rem",
        }}
      >
        {heading}
      </h2>
    </Reveal>
  );
}
