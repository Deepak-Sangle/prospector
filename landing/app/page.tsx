import { CtaSection, SiteFooter } from "./components/cta-footer";
import { HeroSection } from "./components/hero-section";
import { HowSection } from "./components/how-section";
import { SiteNav } from "./components/site-nav";
import { TalkSection } from "./components/talk-section";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <HeroSection />
        <HowSection />
        <TalkSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
