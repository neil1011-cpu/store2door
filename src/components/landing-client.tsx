'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import styles from '@/app/landing.module.css';

export function LandingClient() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Simple animation for the "How it Works" section
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <img src="/images/logo.png" alt="FromStore2Door Logo" height="50" />
          </div>
          
          <nav className={styles.navLinks}>
            <Link href="https://fromstore2door.com/pages/china-shipping" className={styles.navLink}>China Shipping</Link>
            <Link href="/rates" className={styles.navLink}>Rates</Link>
            <Link href="https://fromstore2door.com/pages/about" className={styles.navLink}>About</Link>
            <Link href="/contact" className={styles.navLink}>Contact</Link>
            <div className={styles.authButtons}>
              <Link href="https://fromstore2door.com/login" className={styles.navLink}>Login</Link>
              <Link href="https://fromstore2door.com/register" className={`${styles.btn} ${styles.btnPrimary}`}>Register</Link>
            </div>
          </nav>

          <button className={styles.mobileMenuBtn} onClick={() => setIsMenuOpen(true)}>
            <Menu size={32} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuVisible : ''}`}>
        <div className="flex justify-between items-center mb-8">
          <img src="/images/logo.png" alt="Logo" height="40" />
          <button onClick={() => setIsMenuOpen(false)}>
            <X size={32} />
          </button>
        </div>
        <Link href="https://fromstore2door.com/pages/china-shipping" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>China Shipping</Link>
        <Link href="/rates" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>Rates</Link>
        <Link href="https://fromstore2door.com/pages/about" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>About</Link>
        <Link href="/contact" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>Contact</Link>
        <div className="flex flex-col gap-4 mt-8">
          <Link href="https://fromstore2door.com/login" onClick={() => setIsMenuOpen(false)} className={`${styles.btn} ${styles.btnAccent}`}>Login</Link>
          <Link href="https://fromstore2door.com/register" onClick={() => setIsMenuOpen(false)} className={`${styles.btn} ${styles.btnPrimary}`}>Register</Link>
        </div>
      </div>
    </>
  );
}

export function TrackingForm() {
  const [trackingId, setTrackingId] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
      window.location.href = `/tracking?id=${trackingId.trim().toUpperCase()}`;
    }
  };

  return (
    <div className={styles.trackingSection}>
      <form onSubmit={handleTrack} className={styles.trackingInputWrapper}>
        <input 
          type="text" 
          placeholder="ENTER YOUR TRACKING NUMBER..." 
          className={styles.inputField}
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
        />
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary} h-auto`}>
          Track Package <ArrowRight className="ml-2" />
        </button>
      </form>
    </div>
  );
}
