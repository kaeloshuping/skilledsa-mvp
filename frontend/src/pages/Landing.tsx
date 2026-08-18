// src/pages/Landing.tsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className={styles.landing}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Find Trusted Contractors <br />
            <span className={styles.highlight}>in South Africa</span>
          </h1>
          <p className={styles.subtitle}>
            Connect with verified plumbers, electricians, builders, and more.
            Safe, secure, and hassle-free.
          </p>
          <div className={styles.ctaGroup}>
            <Link to="/signup" className={`${styles.primaryButton} ${styles.ctaButton}`}>
              Get Started
            </Link>
            <Link to="/login" className={`${styles.secondaryButton} ${styles.ctaButton}`}>
              Browse Jobs
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          {/* Decorative SVG or emoji – keeps it light */}
          <div className={styles.imagePlaceholder}>
            <span role="img" aria-label="Construction tools">🔧⚡🛠️</span>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>500+</span>
          <span className={styles.statLabel}>Verified Contractors</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>1000+</span>
          <span className={styles.statLabel}>Jobs Completed</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>97%</span>
          <span className={styles.statLabel}>Customer Satisfaction</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>24h</span>
          <span className={styles.statLabel}>Verification Turnaround</span>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Why SkilledSA?</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✅</div>
            <h3>Verified Professionals</h3>
            <p>Every contractor is ID‑verified and trade‑certified before they can accept jobs.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔒</div>
            <h3>Secure Payments</h3>
            <p>Payments are held in escrow and only released when you're happy with the work.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Transparent Pricing</h3>
            <p>See the full cost breakdown – including travel fees and platform fee – upfront.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🌍</div>
            <h3>Local Expertise</h3>
            <p>We understand the South African market and connect you with trusted local talent.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerBrand}>SkilledSA</span>
          <span className={styles.footerTagline}>Proudly South African 🇿🇦</span>
          <span className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} SkilledSA. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};