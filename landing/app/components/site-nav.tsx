"use client";

import { useEffect, useState } from "react";
import { BrandLink } from "./brand-link";
import { INSTALL_URL } from "./constants";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="nav" data-scrolled={scrolled}>
      <div className="shell nav__inner">
        <BrandLink aria-label="Prospector home" />

        <nav className="nav__links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#talk">Talk to it</a>
        </nav>

        <div className="nav__actions">
          <a className="btn btn--primary btn--sm" href={INSTALL_URL}>
            Add to Slack
          </a>
        </div>
      </div>
    </header>
  );
}
