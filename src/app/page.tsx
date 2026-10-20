
import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';
import { LandingClient, TrackingForm } from '@/components/landing-client';
import { Plane, Ship, CreditCard, Search, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className={styles.landingPage}>
      <LandingClient />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Store To <br /><span style={{color: '#f9bf29'}}>Door.</span></h1>
          <p>
            Experience seamless logistics with multiple weekly flights. Get your FREE US shipping address today and bring the world to your doorstep.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} h-16 px-12 text-lg`}>
              Sign up for free
            </Link>
            <Link href="#services" className={`${styles.btn} ${styles.btnAccent} h-16 px-12 text-lg`}>
              Our Services
            </Link>
          </div>
        </div>
      </section>

      <TrackingForm />

      <section id="services" className={styles.servicesSection}>
        <div className={styles.servicesGrid}>
          <div className={styles.serviceCard}>
            <div className="relative h-[200px]">
              <Image 
                src="/images/air-freight.jpg" 
                alt="Air Freight" 
                fill 
                className="object-cover" 
                priority
              />
            </div>
            <div className={styles.serviceContent}>
              <h3 className={styles.serviceTitle}>Air Freight</h3>
              <p className="text-muted-foreground text-sm">High-priority cargo flown weekly from Florida to Jamaica. Perfect for small packages.</p>
            </div>
          </div>
          <div className={styles.serviceCard}>
            <div className="relative h-[200px]">
              <Image 
                src="/images/sea-freight.jpg" 
                alt="Sea Freight" 
                fill 
                className="object-cover" 
              />
            </div>
            <div className={styles.serviceContent}>
              <h3 className={styles.serviceTitle}>Sea Freight</h3>
              <p className="text-muted-foreground text-sm">Economic choice for barrels and oversized cargo. Scheduled sailings for maximum savings.</p>
            </div>
          </div>
          <div className={styles.serviceCard}>
            <div className="relative h-[200px]">
              <Image 
                src="/images/credit-card-service.jpg" 
                alt="Personal Shopping" 
                fill 
                className="object-cover" 
              />
            </div>
            <div className={styles.serviceContent}>
              <h3 className={styles.serviceTitle}>Personal Shopping</h3>
              <p className="text-muted-foreground text-sm">No credit card? No problem. We shop for you with zero additional service fees.</p>
            </div>
          </div>
          <div className={styles.serviceCard}>
            <div className="relative h-[200px]">
              <Image 
                src="/images/product-search.jpg" 
                alt="Product Search" 
                fill 
                className="object-cover" 
              />
            </div>
            <div className={styles.serviceContent}>
              <h3 className={styles.serviceTitle}>Product Search</h3>
              <p className="text-muted-foreground text-sm">Can't find it? Our logistics team assists in sourcing rare products from the US.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.stepsSection}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.serviceTitle}>Sign Up</h3>
            <p className="text-muted-foreground text-sm">Register for free and get your unique US mailbox number instantly.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.serviceTitle}>Shop Online</h3>
            <p className="text-muted-foreground text-sm">Purchase from any US retailer using your new Florida address.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.serviceTitle}>We Ship</h3>
            <p className="text-muted-foreground text-sm">Your packages arrive at our warehouse and are exported to Jamaica.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>04</div>
            <h3 className={styles.serviceTitle}>Collect</h3>
            <p className="text-muted-foreground text-sm">Pick up your items from our local hub or choose home delivery.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerCol}>
            <div className="mb-6 h-12 relative w-48">
              <Image 
                src="/images/logo.png" 
                alt="FromStore2Door" 
                fill 
                className="object-contain" 
              />
            </div>
            <p className="text-sm">Reliable shipping from Florida to Jamaica. Built for speed and security since inception.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Navigation</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/rates">Rates</Link></li>
              <li><Link href="/customs-calculator">Calculator</Link></li>
              <li><Link href="/contact">Contact Hub</Link></li>
              <li><Link href="#how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Contact</h4>
            <ul className={styles.footerLinks}>
              <li>Portmore, St. Catherine, JA</li>
              <li>(876) 506-9727</li>
              <li>info@fromstore2door.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 text-center text-[10px] opacity-50 uppercase tracking-widest">
          &copy; {year} FromStore2Door Global Logistics. Portmore, Jamaica.
        </div>
      </footer>
    </div>
  );
}
