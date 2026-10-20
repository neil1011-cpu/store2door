'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from '@/app/landing.module.css';
import { ThemeToggle } from './theme-toggle';

export function Header({ loginHref, registerHref, ratesHref, contactHref }: { loginHref: string; registerHref: string; ratesHref: string; contactHref: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
      setMounted(true);
  }, []);

  return (
    <header className={styles.header}>
      <div className={`${styles.wrap} ${styles.nav}`}>
        <Link className={styles.brand} href="/">
          <Image src="/images/logo.png" alt="From Store 2 Door" width={46} height={38} className="h-10 w-auto" />
          From Store 2 Door
        </Link>
        <button className={styles.menuBtn} type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          Menu
        </button>
        <nav>
          <ul className={`${styles.links} ${open ? styles.open : ''}`} onClick={() => setOpen(false)}>
            <li><a href="#services">Services</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><Link href={ratesHref}>Rates</Link></li>
            <li><Link href={contactHref}>Contact</Link></li>
            <li><Link href={loginHref}>Login</Link></li>
            <li><Link className={styles.btn} href={registerHref}>Register</Link></li>
            {mounted && (
                <li className="ml-2 pt-2 md:pt-0 border-t md:border-0 border-line">
                    <div className="bg-muted/30 rounded-full p-0.5">
                        <ThemeToggle />
                    </div>
                </li>
            )}
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
    <div className={styles.track} aria-label="Example of package tracking">
      <div className={styles.top}>
        <span>Package FS2D-0917</span>
        <span>{STATUS[n]}</span>
      </div>
      <div className={styles.route}>
        <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70 Q 150 -30 300 40 T 600 20" fill="none" stroke="#00c2c7" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
        </svg>
        <div className={styles.dot} aria-hidden="true">&#9992;</div>
      </div>
      <div className={styles.pts}><span>USA warehouse</span><span>Jamaica</span></div>
      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s} className={i < n ? styles.done : i === n ? styles.on : ''}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
