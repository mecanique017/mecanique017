// ========== LOADER ==========
window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 800);
    }
});

// ========== SPLASH SCREEN ==========
const splashScreen = document.getElementById('splashScreen');

function enterAsClient() {
    splashScreen.classList.add('hidden');
    document.body.style.overflow = '';
    // Charger le contenu dynamique depuis content.json
    loadDynamicContent();
}

function showAdminLogin() {
    document.querySelector('.splash-buttons').style.display = 'none';
    document.querySelector('.splash-text').style.display = 'none';
    document.getElementById('splashAdminLogin').classList.add('show');
    document.getElementById('splashEmail').focus();
}

function hideAdminLogin() {
    document.querySelector('.splash-buttons').style.display = 'flex';
    document.querySelector('.splash-text').style.display = 'block';
    document.getElementById('splashAdminLogin').classList.remove('show');
    document.getElementById('splashLoginError').classList.remove('show');
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function adminLogin() {
    const email = document.getElementById('splashEmail').value.trim();
    const password = document.getElementById('splashPassword').value;
    const error = document.getElementById('splashLoginError');

    const emailHash = await sha256(email);
    const passHash = await sha256(password);

    // Verifier les identifiants (hash stocke ou par defaut)
    const storedPassHash = localStorage.getItem('m17_admin_hash');
    const storedEmailHash = localStorage.getItem('m17_admin_email_hash');

    const defaultPassHash = await sha256('Melvynsidibe@225');
    const defaultEmailHash = await sha256('mecanique017@gmail.com');

    // Stocker les hash par defaut si pas encore fait
    if (!storedPassHash) {
        localStorage.setItem('m17_admin_hash', defaultPassHash);
        localStorage.setItem('m17_admin_email_hash', defaultEmailHash);
    }

    const targetPassHash = storedPassHash || defaultPassHash;
    const targetEmailHash = storedEmailHash || defaultEmailHash;

    if (emailHash === targetEmailHash && passHash === targetPassHash) {
        // Connexion reussie -> redirection vers admin
        sessionStorage.setItem('m17_admin_logged', 'true');
        window.location.href = 'admin.html';
    } else {
        error.classList.add('show');
        document.getElementById('splashPassword').value = '';
        document.getElementById('splashPassword').focus();
    }
}

// Enter key pour les champs login
document.getElementById('splashPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLogin();
});
document.getElementById('splashEmail')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('splashPassword').focus();
});

// Empecher le scroll quand le splash est visible
if (splashScreen && !splashScreen.classList.contains('hidden')) {
    document.body.style.overflow = 'hidden';
}

// ========== CONTENU DYNAMIQUE ==========
async function loadDynamicContent() {
    let data = null;

    // 1. D'abord verifier le localStorage (modifications admin locales)
    try {
        const localData = localStorage.getItem('m17_content');
        if (localData) {
            data = JSON.parse(localData);
        }
    } catch (e) {
        console.log('Pas de donnees locales');
    }

    // 2. Charger depuis le fichier JSON distant
    try {
        const response = await fetch('data/content.json?t=' + Date.now());
        if (response.ok) {
            const remoteData = await response.json();
            // Utiliser les donnees les plus recentes
            if (!data || !data.lastModified || (remoteData.lastModified && remoteData.lastModified > data.lastModified)) {
                data = remoteData;
            }
        }
    } catch (e) {
        console.log('Fichier distant non disponible');
    }

    if (!data) return;

    // Mode maintenance
    if (data.maintenance) {
        const main = document.querySelector('main') || document.querySelector('.hero');
        if (main) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a0a;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:20px;';
            overlay.innerHTML = '<img src="images/LOGO.jpg" alt="MECANIQUE 17" style="width:80px;border-radius:12px;margin-bottom:20px;"><h1 style="color:#e8a800;font-family:Montserrat,sans-serif;margin-bottom:12px;">Site en maintenance</h1><p style="color:rgba(255,255,255,0.7);max-width:400px;">Nous effectuons des am\u00e9liorations. Le site sera de retour tr\u00e8s bient\u00f4t.</p><p style="color:rgba(255,255,255,0.5);margin-top:20px;">T\u00e9l : <a href="tel:+33651550001" style="color:#e8a800;">06 51 55 00 01</a></p>';
            document.body.appendChild(overlay);
            return;
        }
    }

    try {
        // Mettre a jour la galerie
        if (data.galerie) {
            const galerieGrid = document.querySelector('.galerie-grid');
            if (galerieGrid) {
                let html = '';
                data.galerie.forEach(photo => {
                    if (photo.src && !photo.placeholder) {
                        html += `
                            <div class="galerie-item" data-animate>
                                <img src="${photo.src}" alt="${photo.alt || 'Photo garage'}" loading="lazy">
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="galerie-item" data-animate>
                                <div class="galerie-placeholder">
                                    <span>&#128247;</span>
                                    <p>${photo.alt || 'Photo'}</p>
                                </div>
                            </div>
                        `;
                    }
                });
                galerieGrid.innerHTML = html;

                // Re-observer les animations
                galerieGrid.querySelectorAll('[data-animate]').forEach(el => {
                    observer.observe(el);
                });

                // Re-attacher le lightbox aux nouvelles images
                galerieGrid.querySelectorAll('img').forEach(img => {
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', () => {
                        lightboxImg.src = img.src;
                        lightboxImg.alt = img.alt;
                        lightbox.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    });
                });
            }
        }

        // Mettre a jour les actualites
        if (data.actualites) {
            const actuGrid = document.querySelector('.actu-grid');
            if (actuGrid) {
                let html = '';
                data.actualites.forEach(actu => {
                    html += `
                        <article class="actu-card" data-animate>
                            <div class="actu-badge">${actu.badge}</div>
                            <div class="actu-placeholder">${actu.icon || '&#128197;'}</div>
                            <div class="actu-content">
                                <h3>${actu.titre}</h3>
                                <p>${actu.texte}</p>
                                <span class="actu-date">${actu.date}</span>
                            </div>
                        </article>
                    `;
                });
                actuGrid.innerHTML = html;

                // Re-observer les animations
                actuGrid.querySelectorAll('[data-animate]').forEach(el => {
                    observer.observe(el);
                });
            }
        }
        // Mettre a jour les avis
        if (data.avis) {
            const avisGrid = document.querySelector('.avis-grid');
            if (avisGrid) {
                let html = '';
                data.avis.forEach(avis => {
                    const stars = '★'.repeat(avis.rating) + '☆'.repeat(5 - avis.rating);
                    html += `
                        <div class="avis-card" data-animate>
                            <div class="avis-avatar">${avis.initial || avis.name.charAt(0).toUpperCase()}</div>
                            <div class="avis-stars">${stars}</div>
                            <p class="avis-text">${avis.text}</p>
                            <p class="avis-name">${avis.name}</p>
                        </div>
                    `;
                });
                avisGrid.innerHTML = html;

                avisGrid.querySelectorAll('[data-animate]').forEach(el => {
                    observer.observe(el);
                });
            }
        }

        // Mettre a jour la FAQ
        if (data.faq) {
            const faqList = document.querySelector('.faq-list');
            if (faqList) {
                let html = '';
                data.faq.forEach(item => {
                    html += `
                        <div class="faq-item" data-animate>
                            <div class="faq-question">${item.question}</div>
                            <div class="faq-answer">${item.answer}</div>
                        </div>
                    `;
                });
                faqList.innerHTML = html;

                faqList.querySelectorAll('[data-animate]').forEach(el => {
                    observer.observe(el);
                });

                // Re-attacher les evenements d'ouverture/fermeture FAQ
                faqList.querySelectorAll('.faq-question').forEach(q => {
                    q.addEventListener('click', () => {
                        q.parentElement.classList.toggle('open');
                    });
                });
            }
        }

        // Mettre a jour le bandeau defilant
        if (data.bandeau) {
            const promoTrack = document.querySelector('.promo-track');
            if (promoTrack) {
                let html = '';
                data.bandeau.forEach(item => {
                    html += `<span class="promo-item">${item.icon || ''} ${item.text}</span>`;
                });
                // Dupliquer pour l'effet de defilement continu
                promoTrack.innerHTML = html + html;
            }
        }

        // Mettre a jour les services
        if (data.services) {
            const servicesGrid = document.querySelector('.services-grid');
            if (servicesGrid) {
                let html = '';
                data.services.forEach(service => {
                    html += `
                        <div class="service-card" data-animate>
                            <div class="service-icon">${service.icon || ''}</div>
                            <h3>${service.title}</h3>
                            <p>${service.description}</p>
                        </div>
                    `;
                });
                servicesGrid.innerHTML = html;

                servicesGrid.querySelectorAll('[data-animate]').forEach(el => {
                    observer.observe(el);
                });
            }
        }

        // Mettre a jour les informations de contact
        if (data.infos) {
            const infos = data.infos;

            // Telephone
            if (infos.phone) {
                document.querySelectorAll('[data-info="phone"]').forEach(el => {
                    el.textContent = infos.phone;
                });
                document.querySelectorAll('a[href^="tel:"]').forEach(el => {
                    el.href = 'tel:' + infos.phone.replace(/\s/g, '');
                    if (el.querySelector('[data-info="phone"]') === null) {
                        el.textContent = infos.phone;
                    }
                });
            }

            // Email
            if (infos.email) {
                document.querySelectorAll('[data-info="email"]').forEach(el => {
                    el.textContent = infos.email;
                });
                document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
                    el.href = 'mailto:' + infos.email;
                    if (el.querySelector('[data-info="email"]') === null) {
                        el.textContent = infos.email;
                    }
                });
            }

            // Adresse
            if (infos.address) {
                document.querySelectorAll('[data-info="address"]').forEach(el => {
                    el.textContent = infos.address;
                });
            }

            // Ville
            if (infos.city) {
                document.querySelectorAll('[data-info="city"]').forEach(el => {
                    el.textContent = infos.city;
                });
            }

            // Code postal
            if (infos.postalCode) {
                document.querySelectorAll('[data-info="postalCode"]').forEach(el => {
                    el.textContent = infos.postalCode;
                });
            }

            // Horaires
            if (infos.horairesLV) {
                document.querySelectorAll('[data-info="horairesLV"]').forEach(el => {
                    el.textContent = infos.horairesLV;
                });
            }
            if (infos.horairesSamedi) {
                document.querySelectorAll('[data-info="horairesSamedi"]').forEach(el => {
                    el.textContent = infos.horairesSamedi;
                });
            }
            if (infos.horairesNote) {
                document.querySelectorAll('[data-info="horairesNote"]').forEach(el => {
                    el.textContent = infos.horairesNote;
                });
            }
        }
    } catch (e) {
        console.log('Contenu statique utilise');
    }
}

// ========== MENU MOBILE ==========
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    nav.classList.toggle('open');
});

// Fermer le menu au clic sur un lien
nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        nav.classList.remove('open');
    });
});

// ========== HEADER SCROLL ==========
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ========== ANIMATIONS AU SCROLL ==========
const animatedElements = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

animatedElements.forEach(el => observer.observe(el));

// ========== LIGHTBOX GALERIE ==========
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.galerie-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

// ========== FORMULAIRE RDV ==========
const rdvForm = document.getElementById('rdvForm');
const formSuccess = document.getElementById('formSuccess');

rdvForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = rdvForm.querySelector('.btn-submit');
    submitBtn.textContent = 'Envoi en cours...';
    submitBtn.disabled = true;

    const formData = new FormData(rdvForm);

    try {
        const response = await fetch(rdvForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            formSuccess.classList.add('show');
            rdvForm.reset();
            setTimeout(() => {
                formSuccess.classList.remove('show');
            }, 8000);
        } else {
            alert('Une erreur est survenue. Veuillez nous appeler au 06 51 55 00 01.');
        }
    } catch (error) {
        alert('Erreur de connexion. Veuillez nous appeler au 06 51 55 00 01.');
    }

    submitBtn.textContent = 'Envoyer la demande';
    submitBtn.disabled = false;
});

// ========== DATE MINIMUM (aujourd'hui) ==========
const dateInput = document.getElementById('dateRdv') || document.getElementById('date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// ========== BOUTON RETOUR EN HAUT ==========
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== BANNIERE COOKIE RGPD ==========
function acceptCookies() {
    localStorage.setItem('m17_cookies', 'accepted');
    document.getElementById('cookieBanner').classList.remove('show');
}

function refuseCookies() {
    localStorage.setItem('m17_cookies', 'refused');
    document.getElementById('cookieBanner').classList.remove('show');
}

// Afficher la banniere si pas encore de choix
if (!localStorage.getItem('m17_cookies')) {
    setTimeout(() => {
        const banner = document.getElementById('cookieBanner');
        if (banner) banner.classList.add('show');
    }, 1500);
}

// ========== COMPTEURS ANIMES ==========
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.counter-number');
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.target);
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        counter.textContent = target;
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 16);
            });
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

const countersSection = document.querySelector('.counters-grid');
if (countersSection) counterObserver.observe(countersSection);

// ========== CAROUSEL AVIS ==========
(function() {
    const grid = document.getElementById('avisGrid');
    const dotsContainer = document.getElementById('avisDots');
    const prevBtn = document.querySelector('.avis-prev');
    const nextBtn = document.querySelector('.avis-next');
    if (!grid || !dotsContainer || !prevBtn || !nextBtn) return;

    let currentSlide = 0;
    let autoPlayTimer;

    function getCardsPerView() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 992) return 2;
        return 3;
    }

    function updateCarousel() {
        const cards = grid.querySelectorAll('.avis-card');
        const perView = getCardsPerView();
        const totalSlides = Math.ceil(cards.length / perView);
        if (currentSlide >= totalSlides) currentSlide = 0;
        if (currentSlide < 0) currentSlide = totalSlides - 1;

        const offset = currentSlide * (100 / 1);
        grid.style.display = 'flex';
        grid.style.transition = 'transform 0.5s ease';
        grid.style.transform = `translateX(-${currentSlide * 100}%)`;

        cards.forEach(card => {
            card.style.minWidth = `${100 / perView}%`;
            card.style.flex = `0 0 ${100 / perView}%`;
            card.style.padding = '0 12px';
            card.style.boxSizing = 'border-box';
        });

        // Update dots
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('span');
            dot.className = 'avis-dot' + (i === currentSlide ? ' active' : '');
            dot.addEventListener('click', () => { currentSlide = i; updateCarousel(); resetAutoPlay(); });
            dotsContainer.appendChild(dot);
        }
    }

    prevBtn.addEventListener('click', () => { currentSlide--; updateCarousel(); resetAutoPlay(); });
    nextBtn.addEventListener('click', () => { currentSlide++; updateCarousel(); resetAutoPlay(); });

    function resetAutoPlay() {
        clearInterval(autoPlayTimer);
        autoPlayTimer = setInterval(() => { currentSlide++; updateCarousel(); }, 5000);
    }

    updateCarousel();
    resetAutoPlay();
    window.addEventListener('resize', updateCarousel);
})();

// ========== THEME TOGGLE (SOMBRE / CLAIR) ==========
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    // Charger le theme sauvegarde
    const savedTheme = localStorage.getItem('m17_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('m17_theme', isLight ? 'light' : 'dark');
    });
}

// ========== PWA - SERVICE WORKER + NOTIFICATIONS ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            // Verifier si des notifications en attente
            checkForNotifications(reg);
        }).catch(() => {});
    });
}

function checkForNotifications(reg) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Verifier les nouvelles promos dans content.json
    fetch('data/content.json?t=' + Date.now()).then(r => r.json()).then(data => {
        const lastNotif = localStorage.getItem('m17_last_notif');
        if (data.notifications && data.notifications.length > 0) {
            const latest = data.notifications[data.notifications.length - 1];
            if (latest.id && latest.id !== lastNotif) {
                reg.showNotification(latest.title || 'MECANIQUE 17', {
                    body: latest.body || 'Nouvelle offre disponible !',
                    icon: 'images/LOGO.jpg'
                });
                localStorage.setItem('m17_last_notif', latest.id);
            }
        }
    }).catch(() => {});
}

// Bouton d'abonnement aux notifications
const notifBtn = document.getElementById('notifBtn');
if (notifBtn) {
    if ('Notification' in window && Notification.permission === 'granted') {
        notifBtn.textContent = '\uD83D\uDD14 Notifications activ\u00e9es';
        notifBtn.style.opacity = '0.6';
    }
    notifBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Votre navigateur ne supporte pas les notifications.');
            return;
        }
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            notifBtn.textContent = '\uD83D\uDD14 Notifications activ\u00e9es';
            notifBtn.style.opacity = '0.6';
            new Notification('MECANIQUE 17', {
                body: 'Vous recevrez nos prochaines offres !',
                icon: 'images/LOGO.jpg'
            });
        }
    });
}

// ========== CALCULATEUR DEVIS ==========
function updateDevis() {
    const select = document.getElementById('devisType');
    const result = document.getElementById('devisResult');
    const selected = select.options[select.selectedIndex];

    if (!selected.value) {
        result.style.display = 'none';
        return;
    }

    const min = selected.dataset.min;
    const max = selected.dataset.max;
    document.getElementById('devisMin').textContent = min + '\u20ac';
    document.getElementById('devisMax').textContent = max + '\u20ac';
    result.style.display = 'block';
}

// ========== SYSTEME D'AVIS INTEGRE ==========
(function() {
    const stars = document.querySelectorAll('#starRating .star');
    const noteInput = document.getElementById('avisNote');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.dataset.value);
            noteInput.value = val;
            stars.forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= val);
            });
        });
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            stars.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= val ? '#fbbc04' : '#444';
            });
        });
    });

    const ratingContainer = document.getElementById('starRating');
    if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', () => {
            const currentVal = parseInt(noteInput.value);
            stars.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= currentVal ? '#fbbc04' : '#444';
            });
        });
    }
})();

function submitAvis(e) {
    e.preventDefault();
    const nom = document.getElementById('avisNom').value.trim();
    const note = parseInt(document.getElementById('avisNote').value);
    const message = document.getElementById('avisMessage').value.trim();

    if (!nom || !note || !message) {
        alert('Veuillez remplir tous les champs et donner une note.');
        return;
    }

    // Stocker l'avis en attente de validation
    const pendingAvis = JSON.parse(localStorage.getItem('m17_pending_avis') || '[]');
    pendingAvis.push({
        name: nom,
        initial: nom.charAt(0).toUpperCase(),
        rating: note,
        text: message,
        date: new Date().toISOString(),
        id: Date.now(),
        status: 'pending'
    });
    localStorage.setItem('m17_pending_avis', JSON.stringify(pendingAvis));

    // Afficher le message de succes
    document.getElementById('avisFormSuccess').classList.add('show');
    document.getElementById('avisForm').reset();
    document.querySelectorAll('#starRating .star').forEach(s => {
        s.classList.remove('active');
        s.style.color = '#444';
    });
    document.getElementById('avisNote').value = '0';

    setTimeout(() => {
        document.getElementById('avisFormSuccess').classList.remove('show');
    }, 5000);
}

// ========== EFFET PARALLAXE HERO ==========
(function() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Creer un element de fond pour le parallaxe
    const parallaxBg = document.createElement('div');
    parallaxBg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:120%;background:inherit;z-index:0;will-change:transform;pointer-events:none;';
    parallaxBg.className = 'parallax-bg';
    hero.insertBefore(parallaxBg, hero.firstChild);

    // Deplacer les orbes decoratifs
    const orb1 = document.createElement('div');
    orb1.style.cssText = 'position:absolute;top:-20%;right:-10%;width:600px;height:600px;background:radial-gradient(circle,rgba(232,168,0,0.12) 0%,transparent 70%);border-radius:50%;will-change:transform;';
    const orb2 = document.createElement('div');
    orb2.style.cssText = 'position:absolute;bottom:-15%;left:-5%;width:400px;height:400px;background:radial-gradient(circle,rgba(232,168,0,0.08) 0%,transparent 70%);border-radius:50%;will-change:transform;';
    parallaxBg.appendChild(orb1);
    parallaxBg.appendChild(orb2);

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const heroHeight = hero.offsetHeight;
                if (scrollY < heroHeight) {
                    parallaxBg.style.transform = `translateY(${scrollY * 0.3}px)`;
                    orb1.style.transform = `translate(${scrollY * 0.05}px, ${scrollY * 0.15}px)`;
                    orb2.style.transform = `translate(${scrollY * -0.08}px, ${scrollY * 0.1}px)`;
                }
                ticking = false;
            });
            ticking = true;
        }
    });
})();

// ========== PARTAGE RESEAUX SOCIAUX ==========
function shareOnFacebook(text) {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + url + '&quote=' + encodeURIComponent(text), '_blank', 'width=600,height=400');
}

function shareOnWhatsApp(text) {
    const url = window.location.href;
    window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
}

// ========== POP-UP PROMO ==========
function closePromo() {
    const popup = document.getElementById('promoPopup');
    if (popup) popup.classList.remove('show');
    sessionStorage.setItem('m17_promo_closed', '1');
}

// Afficher la pop-up apres 8 secondes si pas deja fermee
if (!sessionStorage.getItem('m17_promo_closed') && !localStorage.getItem('m17_promo_never')) {
    setTimeout(() => {
        const popup = document.getElementById('promoPopup');
        if (popup) popup.classList.add('show');
    }, 8000);
}

// Fermer en cliquant a l'exterieur
document.addEventListener('click', (e) => {
    const popup = document.getElementById('promoPopup');
    if (popup && e.target === popup) closePromo();
});

// ========== ANIMATIONS SCROLL AMELIOREES ==========
const animObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Delai progressif pour les elements dans une grille
            const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
            let delay = 0;
            siblings.forEach((sib, i) => {
                if (sib === entry.target) delay = i * 100;
            });
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, delay);
            animObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

// Observer tous les elements avec data-animate
document.querySelectorAll('[data-animate]').forEach(el => {
    animObserver.observe(el);
});
