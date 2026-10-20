'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight } from 'lucide-react';
import styles from '@/app/landing.module.css';

export function LandingClient() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <div className="h-12 w-48 relative">
              <Image 
                src="/images/logo.png" 
                alt="FromStore2Door Logo" 
                fill 
                className="object-contain" 
                priority
              />
            </div>
          </div>
          
          <nav className={styles.navLinks}>
            <Link href="https://fromstore2door.com/pages/china-shipping" className={styles.navLink}>China Shipping</Link>
            <Link href="/rates" className={styles.navLink}>Rates</Link>
            <Link href="https://fromstore2door.com/pages/about" className={styles.navLink}>About</Link>
            <Link href="/contact" className={styles.navLink}>Contact</Link>
            <div className={styles.authButtons}>
              <Link href="/signin" className={styles.navLink}>Login</Link>
              <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`}>Register</Link>
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
          <div className="h-10 w-40 relative">
             <Image src="/images/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <button onClick={() => setIsMenuOpen(false)}>
            <X size={32} />
          </button>
        </div>
        <Link href="https://fromstore2door.com/pages/china-shipping" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>China Shipping</Link>
        <Link href="/rates" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>Rates</Link>
        <Link href="https://fromstore2door.com/pages/about" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>About</Link>
        <Link href="/contact" onClick={() => setIsMenuOpen(false)} className={styles.navLink}>Contact</Link>
        <div className="flex flex-col gap-4 mt-8">
          <Link href="/signin" onClick={() => setIsMenuOpen(false)} className={`${styles.btn} ${styles.btnAccent}`}>Login</Link>
          <Link href="/signup" onClick={() => setIsMenuOpen(false)} className={`${styles.btn} ${styles.btnPrimary}`}>Register</Link>
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
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary} h-auto py-5`}>
          Track Package <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
