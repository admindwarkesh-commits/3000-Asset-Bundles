"use client";

import { useCallback, useState } from "react";
import BuyModal from "./BuyModal";

const features = [
  { title: "Character Animations", icon: "run" },
  { title: "Subtitle & Text Effects", icon: "text" },
  { title: "Smooth Transitions", icon: "play" },
  { title: "Motion Effects", icon: "target" },
  { title: "Professional Editing Presets", icon: "sliders" },
];

function Icon({ name }) {
  if (name === "run") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="14" cy="4.5" r="2" />
        <path d="M4 14.5 8.2 12l2.2 2 2.4-3.2 3.2 1.2" />
        <path d="M9.8 13.2 8 20M13.2 12.2 16 20M7.2 9.2 4.5 8" />
      </svg>
    );
  }
  if (name === "text") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M12 6v12M8 18h8" />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6.5v11l9-5.5-9-5.5Z" />
      </svg>
    );
  }
  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16M8 8V5M16 8V5M4 16h16M8 16v3M16 16v3" />
    </svg>
  );
}

export default function HomePage({ price, productName, testMode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const formattedPrice = price.toLocaleString("en-IN");

  return (
    <main className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <div className="shell">
        {testMode ? (
          <p className="test-strip">Test mode on hai. Customers se real payment nahi katega.</p>
        ) : null}
        <header className="topbar">
          <span className="brand">PRESETS PACK</span>
          <span className="chip">For Premiere Pro</span>
        </header>

        <div className="layout">
          <section className="hero" aria-label="Product banner">
            <img
              src="/banner.jpg"
              alt="3000+ Presets Pack. One click for Premiere Pro. Character animations, text effects, transitions, motion effects and editing presets. Only ₹299."
            />
          </section>

          <section className="panel">
            <p className="eyebrow">One click</p>
            <h1>{productName}</h1>
            <p className="sub">Edit faster. Create better.</p>

            <ul className="features">
              {features.map((feature) => (
                <li key={feature.title}>
                  <span className="feature-icon">
                    <Icon name={feature.icon} />
                  </span>
                  {feature.title}
                </li>
              ))}
            </ul>

            <div className="offer">
              <div className="price">
                <span>Only</span>
                <strong>₹{formattedPrice}</strong>
                <em>3000+ presets included</em>
              </div>
              <button className="buy" type="button" onClick={() => setOpen(true)}>
                Buy Now
              </button>
            </div>

            <ul className="trust">
              <li>
                <span aria-hidden="true">⚡</span>
                Instant download
              </li>
              <li>
                <span aria-hidden="true">🛡️</span>
                Safe & secure payment
              </li>
              <li>
                <span aria-hidden="true">✉️</span>
                Get it on your email
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="sticky">
        <div>
          <small>3000+ presets</small>
          <strong>₹{formattedPrice}</strong>
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          Buy Now
        </button>
      </div>

      {open ? <BuyModal price={price} productName={productName} onClose={close} /> : null}
    </main>
  );
}
