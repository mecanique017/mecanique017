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
const dateInput = document.getElementById('date');
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
