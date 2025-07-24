import React from "react";
import styles from "./Footer.module.css";
import { Link } from "react-router-dom";

import { FaTwitter, FaInstagram, FaFacebookF } from "react-icons/fa";

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div
          className={`d-flex flex-wrap justify-content-center gap-4 mb-4 ${styles.footerLinks}`}
        >
          <Link to="/about" className={styles.footerLink}>
            About Us
          </Link>
          <Link to="/contact" className={styles.footerLink}>
            Contact
          </Link>
          <Link to="/faq" className={styles.footerLink}>
            FAQ
          </Link>
          <Link to="/privacy-policy" className={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link to="/terms" className={styles.footerLink}>
            Terms of Service
          </Link>
        </div>

        <div
          className={`d-flex justify-content-center gap-3 mb-4 ${styles.socialIcons}`}
        >
          <Link to="#" aria-label="Twitter">
            <FaTwitter size={24} />
          </Link>

          <Link to="#" aria-label="Instagram">
            <FaInstagram size={24} />
          </Link>

          <Link to="#" aria-label="Facebook">
            <FaFacebookF size={24} />
          </Link>
        </div>

        <p className={styles.copyright}>@2024 Mate. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
