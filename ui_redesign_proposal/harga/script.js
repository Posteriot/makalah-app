// script.js - Makalah AI Pricing Mockup Interactions

document.addEventListener('DOMContentLoaded', () => {
    console.log('Makalah AI Pricing Mockup Loaded');

    // ========================================
    // HEADER FUNCTIONALITY
    // ========================================

    const header = document.getElementById('global-header');
    const themeToggle = document.getElementById('themeToggle');
    const userDropdown = document.getElementById('userDropdown');
    const userDropdownTrigger = document.getElementById('userDropdownTrigger');
    const signOutBtn = document.getElementById('signOutBtn');

    // Scroll behavior - hide/show header
    let lastScrollY = 0;
    const SCROLL_THRESHOLD = 100;

    function handleScroll() {
        const currentScrollY = window.scrollY;
        const pastThreshold = currentScrollY > SCROLL_THRESHOLD;
        const isScrollingDown = currentScrollY > lastScrollY;

        if (header) {
            header.classList.toggle('header-scrolled', pastThreshold);
            if (pastThreshold) {
                header.classList.toggle('header-hidden', isScrollingDown);
            } else {
                header.classList.remove('header-hidden');
            }
        }
        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('luxe-light');
            document.body.classList.toggle('luxe-dark');
        });
    }

    // User Dropdown Toggle
    if (userDropdownTrigger && userDropdown) {
        userDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('is-open');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('is-open');
            }
        });
    }

    // ========================================
    // SCROLL REVEAL ANIMATIONS
    // ========================================

    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.pricing-card, .section-header, .hero-content').forEach(item => {
        item.classList.add('reveal-on-scroll');
        observer.observe(item);
    });

    const revealedStyle = document.createElement('style');
    revealedStyle.textContent = '.revealed { opacity: 1 !important; transform: translateY(0); }';
    document.head.appendChild(revealedStyle);

    // ========================================
    // AURORA PARALLAX EFFECT
    // ========================================

    // Pricing Cards Parallax
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const aurora = card.querySelector('.card-aurora');
            if (aurora) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const moveX = (x - rect.width / 2) * 0.1;
                const moveY = (y - rect.height / 2) * 0.1;
                aurora.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            const aurora = card.querySelector('.card-aurora');
            if (aurora) aurora.style.transform = '';
        });
    });

    // Main Aurora Parallax for Hero
    document.addEventListener('mousemove', (e) => {
        const aurora = document.querySelector('.hero-vivid-bg');
        if (aurora) {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.02;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.02;
            aurora.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
        }
    });

    // Demo: Auth State Toggle (L key)
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'l' || e.key === 'L') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            document.body.classList.toggle('is-logged-in');
        }
    });

    // ========================================
    // FAQ INTERACTION
    // ========================================
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('is-open');

                // Close other items
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('is-open');
                });

                if (!isOpen) {
                    item.classList.add('is-open');
                }
            });
        }
    });
});
