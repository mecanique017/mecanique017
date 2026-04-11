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
    const defaultEmailHash = await sha256('mecanique17@gmail.com');

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

        // Services : garder le HTML statique (icones SVG modernes)
        // Ne pas ecraser avec les donnees JSON

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

rdvForm.addEventListener('submit', function(e) {
    // Save RDV data to localStorage before submit (for admin stats + print confirmation)
    const formData = new FormData(rdvForm);
    const rdvData = {};
    formData.forEach((value, key) => { if (!key.startsWith('_')) rdvData[key] = value; });
    rdvData.date_envoi = new Date().toLocaleString('fr-FR');

    // Store in localStorage for admin
    const rdvList = JSON.parse(localStorage.getItem('m17_rdv_list') || '[]');
    rdvList.push(rdvData);
    localStorage.setItem('m17_rdv_list', JSON.stringify(rdvList));

    // Store in sessionStorage for print confirmation page
    sessionStorage.setItem('m17_last_rdv', JSON.stringify(rdvData));

    // Let the form submit naturally to FormSubmit.co (no preventDefault)
    // The form action and _next will handle the redirect
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
                        counter.classList.add('glow');
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

    // Publier l'avis directement (sans validation admin)
    const newAvis = {
        name: nom,
        initial: nom.charAt(0).toUpperCase(),
        rating: note,
        text: message,
        date: new Date().toISOString(),
        id: Date.now()
    };

    // Ajouter au contenu existant
    const contentData = JSON.parse(localStorage.getItem('m17_content') || '{}');
    if (!contentData.avis) contentData.avis = [];
    contentData.avis.push(newAvis);
    localStorage.setItem('m17_content', JSON.stringify(contentData));

    // Ajouter la carte visuellement dans la grille
    const grid = document.getElementById('avisGrid');
    if (grid) {
        const stars = '&#9733;'.repeat(note) + '&#9734;'.repeat(5 - note);
        const card = document.createElement('div');
        card.className = 'avis-card fade-in';
        card.innerHTML = '<div class="avis-stars">' + stars + '</div>' +
            '<p class="avis-text">&laquo; ' + message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' &raquo;</p>' +
            '<div class="avis-author"><div class="avis-avatar">' + newAvis.initial + '</div>' +
            '<div><strong>' + nom.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</strong><span>Client</span></div></div>';
        grid.appendChild(card);
        // Trigger animation
        setTimeout(() => card.classList.add('visible'), 50);
    }

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

// ========== MOBILE CTA BAR ==========
(function() {
    const mobileCta = document.getElementById('mobileCta');
    const hero = document.getElementById('accueil');
    if (!mobileCta || !hero) return;

    function checkMobileCta() {
        const heroBottom = hero.offsetTop + hero.offsetHeight;
        if (window.scrollY > heroBottom) {
            mobileCta.classList.add('visible');
        } else {
            mobileCta.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', checkMobileCta, { passive: true });
    checkMobileCta();
})();

// ========== SECTION TITLE ANIMATION ==========
const titleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            titleObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.section-title').forEach(title => {
    titleObserver.observe(title);
});

// ========== SOCIAL PROOF TOAST ==========
(function() {
    const messages = [
        "Marc vient de laisser un avis \u2605\u2605\u2605\u2605\u2605",
        "Sophie a pris rendez-vous pour une vidange",
        "Julien a demand\u00e9 un devis pour ses freins",
        "Emma vient de laisser un avis \u2605\u2605\u2605\u2605\u2605",
        "Lucas a pris rendez-vous pour un diagnostic"
    ];
    let currentIndex = 0;
    let dismissed = false;
    const toast = document.getElementById('socialProofToast');
    const toastText = document.getElementById('socialProofText');
    const closeBtn = document.getElementById('socialProofClose');

    if (!toast || !toastText) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            dismissed = true;
            sessionStorage.setItem('m17_toast_dismissed', '1');
        });
    }

    if (sessionStorage.getItem('m17_toast_dismissed')) return;

    function showToast() {
        if (dismissed) return;
        toastText.textContent = messages[currentIndex];
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
        currentIndex = (currentIndex + 1) % messages.length;
    }

    // First show after 5 seconds, then every 15 seconds
    setTimeout(() => {
        showToast();
        setInterval(showToast, 15000);
    }, 5000);
})();

// ========== EXIT INTENT POPUP ==========
(function() {
    const exitPopup = document.getElementById('exitPopup');
    if (!exitPopup) return;

    if (sessionStorage.getItem('m17_exit_shown')) return;

    document.addEventListener('mouseout', (e) => {
        if (e.clientY < 0 && !sessionStorage.getItem('m17_exit_shown')) {
            exitPopup.classList.add('show');
            sessionStorage.setItem('m17_exit_shown', '1');
        }
    });

    // Close on overlay click
    exitPopup.addEventListener('click', (e) => {
        if (e.target === exitPopup) {
            exitPopup.classList.remove('show');
        }
    });
})();

// ========== SEASONAL BANNER ==========
(function() {
    const banner = document.getElementById('seasonalBanner');
    const text = document.getElementById('seasonalText');
    if (!banner || !text) return;

    if (sessionStorage.getItem('m17_seasonal_closed')) {
        banner.style.display = 'none';
        return;
    }

    const month = new Date().getMonth(); // 0-11
    let message = '';
    if (month === 11 || month === 0 || month === 1) {
        message = "\u2744\uFE0F Pr\u00e9parez votre voiture pour l'hiver \u2014 Contr\u00f4le batterie & antigel offert";
    } else if (month >= 2 && month <= 4) {
        message = "\uD83C\uDF38 Forfait printemps \u2014 Clim + filtres \u00e0 prix r\u00e9duit";
    } else if (month >= 5 && month <= 7) {
        message = "\u2600\uFE0F Pr\u00e9parez votre voiture pour l'\u00e9t\u00e9 \u2014 V\u00e9rification climatisation offerte";
    } else {
        message = "\uD83C\uDF42 Offre automne \u2014 Pr\u00e9-contr\u00f4le technique \u00e0 tarif pr\u00e9f\u00e9rentiel";
    }

    text.textContent = message;
})();

// ========== CONFETTI ANIMATION ==========
function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#e8a800', '#F0A500', '#f5c518', '#ff8c00', '#ffffff', '#ffd700'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 4 + 2,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }

    const startTime = Date.now();
    const duration = 3000;

    function animate() {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration + 1000) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.rotation += p.rotSpeed;

            if (elapsed > duration) {
                p.opacity = Math.max(0, 1 - (elapsed - duration) / 1000);
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// ========== HOOK CONFETTI TO FORM SUCCESS ==========
(function() {
    const origFormHandler = rdvForm;
    if (!origFormHandler) return;

    const origSuccess = document.getElementById('formSuccess');
    if (!origSuccess) return;

    // Watch for the success class being added
    const successObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (origSuccess.classList.contains('show')) {
                    launchConfetti();
                }
            }
        });
    });

    successObserver.observe(origSuccess, { attributes: true });
})();

// ========== LIVE VISITOR COUNTER ==========
(function() {
    const countEl = document.getElementById('visitorCount');
    if (!countEl) return;

    function updateCount() {
        const newCount = Math.floor(Math.random() * (22 - 8 + 1)) + 8;
        countEl.style.opacity = '0';
        setTimeout(() => {
            countEl.textContent = newCount;
            countEl.style.opacity = '1';
        }, 400);
    }

    setInterval(updateCount, 30000);
})();

// ========== CHATBOT ==========
let chatbotOpen = false;

function toggleChatbot() {
    const win = document.getElementById('chatbotWindow');
    const bubble = document.getElementById('chatbotBubble');
    if (!win) return;
    chatbotOpen = !chatbotOpen;
    if (chatbotOpen) {
        win.classList.add('open');
        if (bubble) bubble.style.display = 'none';
    } else {
        win.classList.remove('open');
        if (bubble) bubble.style.display = 'flex';
    }
}

(function() {
    const quickReplies = document.getElementById('chatbotQuickReplies');
    const messages = document.getElementById('chatbotMessages');
    if (!quickReplies || !messages) return;

    const responses = {
        horaires: "Nous sommes ouverts du lundi au vendredi de 8h \u00e0 18h et le samedi de 8h \u00e0 12h.",
        rdv: 'Remplissez le formulaire en ligne ou appelez-nous au 06 51 55 00 01. <a href="#rdv" onclick="toggleChatbot()">Prendre RDV</a>',
        tarifs: 'Nos tarifs d\u00e9pendent de l\'intervention. Demandez un devis gratuit ! <a href="#devis" onclick="toggleChatbot()">Voir les estimations</a>',
        lieu: '38 rue Chotard, 17520 Jarnac-Champagne. <a href="#contact" onclick="toggleChatbot()">Voir sur la carte</a>'
    };

    const questions = {
        horaires: "Quels sont vos horaires ?",
        rdv: "Comment prendre RDV ?",
        tarifs: "Quels sont vos tarifs ?",
        lieu: "O\u00f9 \u00eates-vous situ\u00e9 ?"
    };

    quickReplies.addEventListener('click', (e) => {
        const btn = e.target.closest('.chatbot-quick-btn');
        if (!btn) return;
        const q = btn.dataset.q;
        if (!q || !responses[q]) return;

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'chatbot-msg chatbot-msg-user';
        userMsg.textContent = questions[q];
        messages.appendChild(userMsg);

        // Add bot response after short delay
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'chatbot-msg chatbot-msg-bot';
            botMsg.innerHTML = responses[q];
            messages.appendChild(botMsg);
            messages.scrollTop = messages.scrollHeight;
        }, 500);

        messages.scrollTop = messages.scrollHeight;
    });
})();

// ========== COUNTDOWN TIMER (Flash Offer) ==========
(function() {
    const cdDays = document.getElementById('cdDays');
    const cdHours = document.getElementById('cdHours');
    const cdMins = document.getElementById('cdMins');
    const cdSecs = document.getElementById('cdSecs');
    const flashExpired = document.getElementById('flashExpired');
    const flashCta = document.getElementById('flashCta');
    const timer = document.getElementById('countdownTimer');

    if (!cdDays || !timer) return;

    // Get or set end date in localStorage (7 days from first load)
    let endDate = localStorage.getItem('m17_flash_end');
    if (!endDate) {
        endDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('m17_flash_end', endDate);
    }
    endDate = parseInt(endDate);

    function updateCountdown() {
        const now = Date.now();
        const diff = endDate - now;

        if (diff <= 0) {
            timer.style.display = 'none';
            if (flashExpired) flashExpired.style.display = 'block';
            if (flashCta) flashCta.style.display = 'none';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        cdDays.textContent = String(days).padStart(2, '0');
        cdHours.textContent = String(hours).padStart(2, '0');
        cdMins.textContent = String(mins).padStart(2, '0');
        cdSecs.textContent = String(secs).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
})();

// ========== LOYALTY CARD ==========
(function() {
    const stampsContainer = document.getElementById('loyaltyStamps');
    const progressEl = document.getElementById('loyaltyProgress');
    const rewardEl = document.getElementById('loyaltyReward');

    if (!stampsContainer) return;

    let stamps = parseInt(localStorage.getItem('m17_loyalty_stamps') || '0');

    function renderLoyalty() {
        const stampEls = stampsContainer.querySelectorAll('.loyalty-stamp');
        stampEls.forEach((el, i) => {
            if (i < stamps) {
                el.classList.add('filled');
            } else {
                el.classList.remove('filled');
            }
        });
        if (progressEl) progressEl.textContent = stamps + ' / 5 visites validees';
        if (rewardEl) {
            if (stamps >= 5) {
                rewardEl.style.display = 'block';
            } else {
                rewardEl.style.display = 'none';
            }
        }
    }

    renderLoyalty();

    // Expose for admin validation
    window.m17AddLoyaltyStamp = function() {
        if (stamps < 5) {
            stamps++;
            localStorage.setItem('m17_loyalty_stamps', stamps);
            renderLoyalty();
        }
    };
    window.m17ResetLoyalty = function() {
        stamps = 0;
        localStorage.setItem('m17_loyalty_stamps', 0);
        renderLoyalty();
    };
})();

// ========== PARRAINAGE / REFERRAL ==========
(function() {
    const codeEl = document.getElementById('parrainageCode');
    const copyBtn = document.getElementById('parrainageCopy');
    const whatsappBtn = document.getElementById('parrainageWhatsApp');

    if (!codeEl) return;

    // Generate or retrieve referral code
    let code = localStorage.getItem('m17_referral_code');
    if (!code) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem('m17_referral_code', code);
    }

    codeEl.textContent = code;

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.textContent = 'Copie !';
                setTimeout(() => { copyBtn.textContent = 'Copier'; }, 2000);
            }).catch(() => {
                // Fallback
                const ta = document.createElement('textarea');
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                copyBtn.textContent = 'Copie !';
                setTimeout(() => { copyBtn.textContent = 'Copier'; }, 2000);
            });
        });
    }

    if (whatsappBtn) {
        const msg = encodeURIComponent('Salut ! Utilise mon code parrain ' + code + ' chez MECANIQUE 17 (garage auto a Jarnac-Champagne) et beneficie de -15% sur ta premiere visite ! https://mecanique017.github.io/mecanique017/');
        whatsappBtn.href = 'https://wa.me/?text=' + msg;
        whatsappBtn.target = '_blank';
        whatsappBtn.rel = 'noopener';
    }
})();

// ========== NEWSLETTER FORM ==========
(function() {
    const form = document.getElementById('newsletterForm');
    const success = document.getElementById('newsletterSuccess');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                if (success) success.classList.add('show');
                form.reset();
                setTimeout(() => { if (success) success.classList.remove('show'); }, 5000);
            }
        } catch (err) {
            // Silent fail
        }
    });
})();

// ========== PRINT RDV CONFIRMATION ==========
function printRdvConfirmation() {
    const summary = document.getElementById('rdvSummary');
    if (!summary) return;

    // Create print page
    const printDiv = document.createElement('div');
    printDiv.className = 'rdv-print-page';
    printDiv.innerHTML = '<h2>MECANIQUE <span class="print-gold">17</span></h2>' +
        '<p style="color:#666;margin-bottom:20px;">Confirmation de rendez-vous</p>' +
        '<hr style="border:none;border-top:2px solid #e8a800;margin-bottom:20px;">' +
        summary.innerHTML +
        '<hr style="margin-top:20px;border:none;border-top:1px solid #ddd;">' +
        '<p style="margin-top:16px;color:#666;font-size:12px;">MECANIQUE 17 - 38 rue Chotard, 17520 Jarnac-Champagne</p>' +
        '<p style="color:#666;font-size:12px;">Tel : 06 51 55 00 01 | Email : mecanique17@gmail.com</p>' +
        '<p style="margin-top:12px;color:#999;font-size:11px;">Ce document est une confirmation de votre demande. Le garage vous recontactera pour valider le creneau.</p>';

    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
}

// ========== ANALYTICS COUNTER (Simple) ==========
(function() {
    // Track page views
    let analytics = JSON.parse(localStorage.getItem('m17_analytics') || '{}');
    if (!analytics.totalVisits) analytics.totalVisits = 0;
    if (!analytics.dailyVisits) analytics.dailyVisits = {};
    if (!analytics.sectionViews) analytics.sectionViews = {};

    analytics.totalVisits++;

    const today = new Date().toISOString().split('T')[0];
    analytics.dailyVisits[today] = (analytics.dailyVisits[today] || 0) + 1;

    // Clean old daily data (keep only last 30 days)
    const keys = Object.keys(analytics.dailyVisits).sort();
    if (keys.length > 30) {
        keys.slice(0, keys.length - 30).forEach(k => delete analytics.dailyVisits[k]);
    }

    localStorage.setItem('m17_analytics', JSON.stringify(analytics));

    // Track section views with IntersectionObserver
    const sections = document.querySelectorAll('section[id]');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                let a = JSON.parse(localStorage.getItem('m17_analytics') || '{}');
                if (!a.sectionViews) a.sectionViews = {};
                a.sectionViews[id] = (a.sectionViews[id] || 0) + 1;
                localStorage.setItem('m17_analytics', JSON.stringify(a));
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(s => sectionObserver.observe(s));
})();

// ========== ENHANCED RDV FORM SUBMIT (with print confirmation) ==========
(function() {
    const form = document.getElementById('rdvForm');
    if (!form) return;

    // Override form submit to also show confirmation
    const origSubmitHandler = form.onsubmit;

    // Watch for success to display summary
    const successEl = document.getElementById('formSuccess');
    if (!successEl) return;

    const rdvObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                if (successEl.classList.contains('show')) {
                    // Build summary from form data before reset
                    const summary = document.getElementById('rdvSummary');
                    if (summary) {
                        // Read values stored before submit
                        const data = JSON.parse(sessionStorage.getItem('m17_last_rdv') || '{}');
                        let html = '';
                        if (data.nom) html += '<p class="print-line"><strong>Nom :</strong> ' + data.nom + '</p>';
                        if (data.prenom) html += '<p class="print-line"><strong>Prenom :</strong> ' + data.prenom + '</p>';
                        if (data.telephone) html += '<p class="print-line"><strong>Telephone :</strong> ' + data.telephone + '</p>';
                        if (data.intervention) html += '<p class="print-line"><strong>Type :</strong> ' + data.intervention + '</p>';
                        if (data.travaux) html += '<p class="print-line"><strong>Description :</strong> ' + data.travaux + '</p>';
                        html += '<p class="print-line"><strong>Date de demande :</strong> ' + new Date().toLocaleDateString('fr-FR') + '</p>';
                        summary.innerHTML = html;
                    }

                    // Save RDV to localStorage for admin stats
                    const rdvList = JSON.parse(localStorage.getItem('m17_rdv_list') || '[]');
                    const data = JSON.parse(sessionStorage.getItem('m17_last_rdv') || '{}');
                    data.date = new Date().toISOString();
                    data.id = Date.now();
                    rdvList.push(data);
                    localStorage.setItem('m17_rdv_list', JSON.stringify(rdvList));
                }
            }
        });
    });
    rdvObserver.observe(successEl, { attributes: true });

    // Store form data before submit
    form.addEventListener('submit', () => {
        const data = {
            nom: document.getElementById('nom')?.value || '',
            prenom: document.getElementById('prenom')?.value || '',
            telephone: document.getElementById('telephone')?.value || '',
            intervention: document.getElementById('typeIntervention')?.value || '',
            travaux: document.getElementById('travaux')?.value || ''
        };
        sessionStorage.setItem('m17_last_rdv', JSON.stringify(data));
    }, true); // capture phase to run before the actual submit handler
})();
