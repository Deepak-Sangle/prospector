import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prospector — brand monitoring that lives in Slack",
    short_name: "Prospector",
    description:
      "A brand-monitoring agent that lives in Slack. Track customers, competitors, complaints, and support questions across Reddit, LinkedIn, and X.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#BB7558",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        src: "/apple-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
