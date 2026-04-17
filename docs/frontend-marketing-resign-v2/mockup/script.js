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

    // 3. Mouse move effect for Hero Glow & Bento Cards
    const glowBg = document.querySelector('.glow-bg');
    const bentoCards = document.querySelectorAll('.bento-card');

    document.addEventListener('mousemove', (e) => {
        if (glowBg) {
            const xVal = (e.clientX / window.innerWidth - 0.5) * 40;
            const yVal = (e.clientY / window.innerHeight - 0.5) * 40;
            glowBg.style.transform = `translate(${xVal}px, ${yVal}px)`;
        }

        bentoCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // 4. Parallax Scroll for Background Glow
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        if (glowBg) {
            glowBg.style.top = `${scrolled * 0.3}px`;
        }
    });

    // 5. Pricing Toggle Interactivity
    const pricingToggle = document.getElementById('pricing-toggle');
    const monthlyLabel = document.getElementById('monthly-label');
    const annualLabel = document.getElementById('annual-label');

    if (pricingToggle) {
        pricingToggle.addEventListener('click', () => {
            pricingToggle.classList.toggle('annual');
            monthlyLabel.classList.toggle('active');
            annualLabel.classList.toggle('active');
            
            // UI only feedback: can be expanded to update price numbers
            const prices = document.querySelectorAll('.price');
            prices.forEach(p => {
                p.style.transform = 'scale(0.95)';
                setTimeout(() => p.style.transform = 'scale(1)', 150);
            });
        });
    }
});
