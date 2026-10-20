'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Header({ loginHref, registerHref }: { loginHref: string; registerHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header>
      <div className="wrap nav">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="" width={56} height={46} />
          From Store 2 Door
        </Link>
        <button id="menu" type="button" aria-expanded={open} aria-controls="links" onClick={() => setOpen(!open)}>
          Menu
        </button>
        <nav>
          <ul id="links" className={open ? 'open' : ''} onClick={() => setOpen(false)}>
            <li><a href="#services">Services</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><Link href={loginHref}>Login</Link></li>
            <li><Link className="btn" href={registerHref}>Register</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

const STATUS = ['Received at warehouse', 'In transit', 'Quality check', 'Out for delivery'];
const STEPS = ['Package received', 'In transit', 'Quality check', 'Delivery'];

export function TrackingCard() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 4), 2250);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="track" aria-label="Example of package tracking">
      <div className="top">
        <span>Package FS2D-0917</span>
        <span>{STATUS[n]}</span>
      </div>
      <div className="route">
        <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70 Q 150 -30 300 40 T 600 20" fill="none" stroke="#00c2c7" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
        </svg>
        <div className="dot" aria-hidden="true">&#9992;</div>
      </div>
      <div className="pts"><span>USA warehouse</span><span>Jamaica</span></div>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < n ? 'done' : i === n ? 'on' : ''}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
