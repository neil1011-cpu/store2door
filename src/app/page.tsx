import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';
import { Header, TrackingCard } from '@/components/landing-client';

const SIGNIN_HREF = '/signin';
const SIGNUP_HREF = '/signup';
const RATES_HREF = '/rates';
const CONTACT_HREF = '/contact';
const PRIVACY_HREF = '/privacy';
const TERMS_HREF = '/terms';
const COOKIES_HREF = '/cookies';
const SHIPPING_POLICY_HREF = '/shipping-policy';
const REFUND_POLICY_HREF = '/refund-policy';

export const metadata = {
  title: 'From Store 2 Door - Shipping Services from Store to Door',
  description:
    'Reliable shipping straight from the store to your door. Get your own USA shipping address and enjoy convenient delivery options.',
};

export default function HomePage() {
  return (
    <div className={styles.landing}>
      <Header 
        loginHref={SIGNIN_HREF} 
        registerHref={SIGNUP_HREF} 
        ratesHref={RATES_HREF}
        contactHref={CONTACT_HREF}
      />

      <main>
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <div>
              <p className={styles.tag}>Shipping to Jamaica from Florida</p>
              <h1>From the store to your door, <em>hassle free.</em></h1>
              <p>Sign up for a free USA shipping address, shop any online store, and we will get your packages home by air or sea.</p>
              <div className={styles.cta}>
                <Link className={styles.btn} href={SIGNUP_HREF}>Sign up for free</Link>
                <a className={`${styles.btn} ${styles.btnGhost}`} href="#services">See our services</a>
              </div>
            </div>
            <TrackingCard />
          </div>
        </section>

        <div className={styles.badges}>
          <div><b>Fast shipping</b><span>Weekly air freight</span></div>
          <div><b>Secure process</b><span>Checked before delivery</span></div>
          <div><b>Customer support</b><span>Dedicated helpline</span></div>
          <div><b>Top rated</b><span>Loved by our customers</span></div>
        </div>

        <section id="journey" className={styles.section}>
          <div className={styles.wrap}>
            <div className={styles.head}>
              <p className={styles.tag}>Our simple process</p>
              <h2>Follow your package from the store to your door</h2>
            </div>
            <div className={styles.journey}>
              <div className={styles.stop}><i>1</i><h3>Package received</h3><p>We receive and process your orders at our warehouse facility.</p></div>
              <div className={styles.stop}><i>2</i><h3>In transit</h3><p>Your items are securely transported by air or sea freight.</p></div>
              <div className={styles.stop}><i>3</i><h3>Quality check</h3><p>We verify all items for condition and accuracy before delivery.</p></div>
              <div className={styles.stop}><i>4</i><h3>Delivery</h3><p>Your packages arrive at your door or wait for you to pick up.</p></div>
            </div>
          </div>
        </section>

        <section id="services" className={`${styles.section} ${styles.alt}`}>
          <div className={styles.wrap}>
            <div className={styles.head}>
              <p className={styles.tag}>Our services</p>
              <h2>Shipping and logistics built around your shopping</h2>
              <p>Everything you need to buy from stores abroad and bring it home.</p>
            </div>
            <div className={styles.grid}>
              <article className={styles.svc}>
                <Image src="/images/air-freight.jpg" alt="Air Freight" width={500} height={300} loading="lazy" />
                <div><small>Weekly shipping</small><h3>Air freight</h3><p>Fast, efficient transit on our regular weekly schedule for your small to medium size packages.</p>
                  <ul><li>Weekly shipping schedule</li><li>Fast and efficient transit</li><li>Ideal for small to medium packages</li></ul></div>
              </article>
              <article className={styles.svc}>
                <Image src="/images/sea-freight.jpg" alt="Sea Freight" width={500} height={300} loading="lazy" />
                <div><small>Commercial and personal</small><h3>Sea freight</h3><p>Courier and logistics solutions by sea, from the store straight to your door.</p>
                  <ul><li>Commercial and personal shipping</li><li>Complete logistics solutions</li><li>Store to door delivery</li></ul></div>
              </article>
              <article className={styles.svc}>
                <Image src="/images/credit-card-service.jpg" alt="Credit Card Service" width={500} height={300} loading="lazy" />
                <div><small>Shop online anywhere</small><h3>Credit card service</h3><p>No credit card? Use ours to make your online purchases with ease.</p>
                  <ul><li>No personal credit card needed</li><li>Shop at any online store</li><li>Secure payment handling</li></ul></div>
              </article>
              <article className={styles.svc}>
                <Image src="/images/product-search.jpg" alt="Search Assistance" width={500} height={300} loading="lazy" />
                <div><small>Best price guarantee</small><h3>Product search assistance</h3><p>We help you find the right product at the right price from top retailers.</p>
                  <ul><li>Expert product research</li><li>Best price comparisons</li><li>Personalized shopping assistance</li></ul></div>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <div className={styles.wrap}>
            <div className={styles.head}>
              <p className={styles.tag}>How it works</p>
              <h2>Three steps to your door</h2>
              <p>Shipping from sign-up to pickup, without the hassle.</p>
            </div>
            <div className={styles.three}>
              <div><b>1</b><h3>Sign up</h3><p>Register and receive your USA shipping address free of cost instantly.</p><Link href={SIGNUP_HREF}>Get started</Link></div>
              <div><b>2</b><h3>Shop online</h3><p>Shop at any of your favourite stores. We collect and prepare your items for shipping.</p></div>
              <div><b>3</b><h3>Pick up</h3><p>Get notified about your package status, then request delivery or pick up in store.</p></div>
            </div>
          </div>
        </section>

        <section className={styles.final}>
          <div className={styles.wrap}>
            <h2>Ready to start shipping?</h2>
            <p>Sign up today and enjoy hassle-free global shipping with our door-to-door service.</p>
            <div className={styles.cta}><Link className={styles.btn} href={SIGNUP_HREF}>Sign up for free</Link></div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.fg}>
            <div>
              <h4>From Store 2 Door</h4>
              <p>Providing reliable shipping services straight from the store to your door, hassle free.</p>
            </div>
            <div>
              <h4>Quick links</h4>
              <ul>
                <li><Link href={RATES_HREF}>Rates</Link></li>
                <li><Link href={CONTACT_HREF}>Contact Us</Link></li>
                <li><Link href={SIGNIN_HREF}>Login</Link></li>
                <li><Link href={SIGNUP_HREF}>Register</Link></li>
              </ul>
            </div>
            <div>
              <h4>Legal & Contact</h4>
              <ul>
                <li><Link href={PRIVACY_HREF}>Privacy Policy</Link></li>
                <li><Link href={TERMS_HREF}>Terms of Service</Link></li>
                <li><Link href={COOKIES_HREF}>Cookies Policy</Link></li>
                <li><Link href={SHIPPING_POLICY_HREF}>Shipping Policy</Link></li>
                <li><Link href={REFUND_POLICY_HREF}>Refund Policy</Link></li>
                <li>Portmore, St. Catherine</li>
                <li>(876) 506-9727</li>
              </ul>
            </div>
          </div>
          <div className={styles.copy}>
            <p>&copy; {new Date().getFullYear()} From Store 2 Door Shipping Services | All Rights Reserved</p>
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40">System Architecture & Design</p>
              <div className="flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20C10 14.4772 14.4772 10 20 10H80C85.5228 10 90 14.4772 90 20V50H10V20Z" fill="#F97316" />
                  <path d="M10 50H90V80C90 85.5228 85.5228 90 80 90H20C14.4772 90 10 85.5228 10 80V50Z" fill="#4B5563" />
                  <path d="M35 70V30L65 70V30" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm font-black uppercase italic tracking-tighter text-white">Developed by Neilus Solutions</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
