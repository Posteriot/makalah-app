document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Glassmorphism on Scroll
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Intersection Observer for Scroll Reveals
    const revealOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed
                // observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    const revealElements = document.querySelectorAll('.reveal, .reveal-delay');
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // 3. Mouse move effect & Parallax Scroll (Smooth Lerp)
    const glowBg = document.querySelector('.glow-bg');
    const bentoCards = document.querySelectorAll('.bento-card');

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    let currentScroll = window.scrollY || window.pageYOffset;
    let targetScroll = currentScroll;

    document.addEventListener('mousemove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 40;
        targetY = (e.clientY / window.innerHeight - 0.5) * 40;

        bentoCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    window.addEventListener('scroll', () => {
        // Scroll event kept if future scroll interactions are needed
    });

    function smoothAnimationLoop() {
        mouseX += (targetX - mouseX) * 0.08;
        mouseY += (targetY - mouseY) * 0.08;

        if (glowBg) {
            // Only apply mouse translation. Parallax scroll creates viewport detachment 
            // and ruins the fixed grid background illusion under the header.
            glowBg.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        }

        requestAnimationFrame(smoothAnimationLoop);
    }
    
    // Initialize animation loop
    smoothAnimationLoop();


    // 6. Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
        });
    }
});
