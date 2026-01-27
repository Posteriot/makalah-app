// script.js - Makalah AI Hybrid Mockup Interactions

document.addEventListener('DOMContentLoaded', () => {
    console.log('Makalah AI Mockup Loaded');

    // ========================================
    // HEADER FUNCTIONALITY
    // ========================================

    // START: global-header
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
            // Add scrolled state
            header.classList.toggle('header-scrolled', pastThreshold);

            // Hide/show based on scroll direction (only after threshold)
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

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('is-open');
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                userDropdown.classList.remove('is-open');
            }
        });
    }

    // Sign Out (demo - just toggle logged out state)
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            document.body.classList.remove('is-logged-in');
            if (userDropdown) {
                userDropdown.classList.remove('is-open');
            }
        });
    }
    // END: global-header

    // ========================================
    // DEMO: Auth State Toggle (for testing)
    // ========================================

    // Add keyboard shortcut to toggle auth state (press 'L' key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'l' || e.key === 'L') {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            document.body.classList.toggle('is-logged-in');
            console.log('Auth state toggled:', document.body.classList.contains('is-logged-in') ? 'Logged In' : 'Logged Out');
        }
    });

    // Console hint for demo
    console.log('[Demo] Press "L" key to toggle logged-in state');

    // ========================================
    // SCROLL REVEAL ANIMATIONS
    // ========================================

    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    // START: pemakaian-harga animations (Scroll Reveal)
    document.querySelectorAll('.bento-item, .pricing-card, .section-header').forEach(item => {
        item.classList.add('reveal-on-scroll');
        observer.observe(item);
    });
    // END: pemakaian-harga animations (Scroll Reveal)

    // Add revealed class styles via JavaScript (safe, static content)
    const revealedStyle = document.createElement('style');
    revealedStyle.textContent = '.revealed { opacity: 1 !important; transform: translateY(0); }';
    document.head.appendChild(revealedStyle);

    // ========================================
    // AURORA PARALLAX EFFECT
    // ========================================

    // START: hero-home animations
    const mockContent = document.querySelector('.mock-content');
    if (mockContent) {
        document.addEventListener('mousemove', (e) => {
            const aurora = document.querySelector('.hero-vivid-bg');
            if (aurora) {
                const moveX = (e.clientX - window.innerWidth / 2) * 0.02;
                const moveY = (e.clientY - window.innerHeight / 2) * 0.02;
                aurora.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
            }
        });
    }
    // END: hero-home animations

    // START: pemakaian-harga
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
            if (aurora) {
                aurora.style.transform = '';
            }
        });
    });
    // END: pemakaian-harga

    // START: footer
    // Footer specific interactions can be added here
    // END: footer
});
