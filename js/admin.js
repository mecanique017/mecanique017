// ========== CONFIGURATION ==========
const REPO_OWNER = 'mecanique017';
const REPO_NAME = 'mecanique017';
const CONTENT_PATH = 'data/content.json';

// Hash SHA-256 des identifiants admin (ne pas stocker en clair)
// Email: mecanique17@gmail.com / Password: hashed
const ADMIN_EMAIL_HASH = '5f4dcc3b5aa765d61d8327deb882cf99'; // placeholder
const ADMIN_PASS_HASH = 'a1b2c3'; // placeholder - sera verifie cote client

let contentData = { galerie: [], actualites: [], avis: [], faq: [], bandeau: [], services: [], infos: {} };
let currentPhotoData = null;

// ========== HASH FUNCTION ==========
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== LOGIN ==========
async function attemptLogin() {
    const passwordInput = document.getElementById('loginPassword');
    const emailInput = document.getElementById('loginEmail');
    const error = document.getElementById('loginError');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput.value;

    const storedHash = localStorage.getItem('m17_admin_hash');
    const storedEmailHash = localStorage.getItem('m17_admin_email_hash');

    const passHash = await sha256(password);
    const emailHash = await sha256(email);

    // Premiere connexion : on stocke les hash
    if (!storedHash) {
        // Hash par defaut
        const defaultPassHash = await sha256('Melvynsidibe@225');
        const defaultEmailHash = await sha256('mecanique17@gmail.com');
        localStorage.setItem('m17_admin_hash', defaultPassHash);
        localStorage.setItem('m17_admin_email_hash', defaultEmailHash);

        if (passHash === defaultPassHash && emailHash === defaultEmailHash) {
            loginSuccess();
            return;
        }
    }

    const targetPassHash = storedHash || await sha256('Melvynsidibe@225');
    const targetEmailHash = storedEmailHash || await sha256('mecanique17@gmail.com');

    if (passHash === targetPassHash && emailHash === targetEmailHash) {
        loginSuccess();
    } else {
        error.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function loginSuccess() {
    sessionStorage.setItem('m17_admin_logged', 'true');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadContent();
    checkGithubToken();
}

// Verifier session au chargement
function checkSession() {
    if (sessionStorage.getItem('m17_admin_logged') === 'true') {
        loginSuccess();
    }
}

function logout() {
    sessionStorage.removeItem('m17_admin_logged');
    window.location.reload();
}

// Enter key pour login
document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
});

// ========== NAVIGATION TABS ==========
document.querySelectorAll('#adminNav button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#adminNav button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// ========== LOAD CONTENT ==========
async function loadContent() {
    try {
        // Charger depuis le fichier JSON du site
        const response = await fetch('data/content.json?t=' + Date.now());
        if (response.ok) {
            contentData = await response.json();
        }
    } catch (e) {
        console.log('Chargement local du contenu');
    }

    // Fallback depuis localStorage
    const saved = localStorage.getItem('m17_content');
    if (saved) {
        const localData = JSON.parse(saved);
        // Utiliser les donnees les plus recentes
        if (localData.lastModified && (!contentData.lastModified || localData.lastModified > contentData.lastModified)) {
            contentData = localData;
        }
    }

    // Assurer la compatibilite avec les anciennes versions de content.json
    if (!contentData.avis) contentData.avis = [];
    if (!contentData.faq) contentData.faq = [];
    if (!contentData.bandeau) contentData.bandeau = [];
    if (!contentData.services) contentData.services = [];
    if (!contentData.infos) contentData.infos = {};

    renderGallery();
    renderActualites();
    renderAvis();
    renderFaq();
    renderBandeau();
    renderServices();
    renderInfos();
}

// ========== GALLERY ==========
function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    let html = '';

    contentData.galerie.forEach(photo => {
        if (photo.placeholder && !photo.src) {
            html += `
                <div class="gallery-card">
                    <div class="gallery-placeholder">
                        <span>&#128247;</span>
                        <p>${photo.alt}</p>
                    </div>
                    <div class="gallery-card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditPhotoModal(${photo.id})">Changer</button>
                        <button class="btn btn-danger btn-sm" onclick="deletePhoto(${photo.id})">Supprimer</button>
                    </div>
                </div>
            `;
        } else if (photo.src) {
            html += `
                <div class="gallery-card">
                    <img src="${photo.src}" alt="${photo.alt}">
                    <div class="gallery-card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditPhotoModal(${photo.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deletePhoto(${photo.id})">Supprimer</button>
                    </div>
                </div>
            `;
        }
    });

    // Bouton ajouter
    html += `
        <div class="gallery-add" onclick="openAddPhotoModal()">
            <span>+</span>
            <p>Ajouter une photo</p>
        </div>
    `;

    grid.innerHTML = html;
}

function openAddPhotoModal() {
    document.getElementById('photoModalTitle').textContent = 'Ajouter une photo';
    document.getElementById('photoFile').value = '';
    document.getElementById('photoUrl').value = '';
    document.getElementById('photoAlt').value = '';
    document.getElementById('photoEditId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    currentPhotoData = null;
    openModal('photoModal');
}

function openEditPhotoModal(id) {
    const photo = contentData.galerie.find(p => p.id === id);
    if (!photo) return;

    document.getElementById('photoModalTitle').textContent = 'Modifier la photo';
    document.getElementById('photoUrl').value = photo.src || '';
    document.getElementById('photoAlt').value = photo.alt || '';
    document.getElementById('photoEditId').value = id;
    document.getElementById('photoFile').value = '';
    currentPhotoData = null;

    const preview = document.getElementById('imagePreview');
    if (photo.src) {
        preview.src = photo.src;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    openModal('photoModal');
}

async function savePhoto() {
    const editId = document.getElementById('photoEditId').value;
    const url = document.getElementById('photoUrl').value.trim();
    const alt = document.getElementById('photoAlt').value.trim() || 'Photo garage';
    const fileInput = document.getElementById('photoFile');

    let imageSrc = url;

    // Si un fichier est selectionne, le convertir en base64 ou l'uploader
    if (fileInput.files[0]) {
        imageSrc = await fileToBase64(fileInput.files[0]);
    } else if (currentPhotoData) {
        imageSrc = currentPhotoData;
    }

    if (!imageSrc) {
        showToast('Veuillez ajouter une image ou une URL', 'error');
        return;
    }

    if (editId) {
        // Modifier existant
        const photo = contentData.galerie.find(p => p.id === parseInt(editId));
        if (photo) {
            photo.src = imageSrc;
            photo.alt = alt;
            photo.placeholder = false;
        }
    } else {
        // Ajouter nouveau
        const newId = contentData.galerie.length > 0
            ? Math.max(...contentData.galerie.map(p => p.id)) + 1
            : 1;
        contentData.galerie.push({
            id: newId,
            src: imageSrc,
            alt: alt,
            placeholder: false
        });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderGallery();
    closeModal('photoModal');
    showToast('Photo sauvegardee !');

    // Tenter de publier sur GitHub
    await publishToGitHub();
}

function deletePhoto(id) {
    if (!confirm('Supprimer cette photo ?')) return;
    contentData.galerie = contentData.galerie.filter(p => p.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderGallery();
    showToast('Photo supprimee');
    publishToGitHub();
}

// ========== ACTUALITES ==========
function renderActualites() {
    const list = document.getElementById('actuList');
    if (!list) return;

    const badgeClasses = {
        'Promo': 'badge-promo',
        'Nouveau': 'badge-nouveau',
        'Info': 'badge-info'
    };

    let html = '';
    contentData.actualites.forEach(actu => {
        html += `
            <div class="admin-card">
                <div class="card-header">
                    <div>
                        <span class="card-badge ${badgeClasses[actu.badge] || 'badge-info'}">${actu.badge}</span>
                        <h3 style="margin-top:8px">${actu.titre}</h3>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditActuModal(${actu.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteActu(${actu.id})">Supprimer</button>
                    </div>
                </div>
                <p class="card-text">${actu.texte}</p>
                <p class="card-date">${actu.date}</p>
            </div>
        `;
    });

    if (contentData.actualites.length === 0) {
        html = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucune actualit&eacute; pour le moment</p>';
    }

    list.innerHTML = html;
}

function openAddActuModal() {
    document.getElementById('actuModalTitle').textContent = 'Ajouter une actualit\u00e9';
    document.getElementById('actuBadge').value = 'Promo';
    document.getElementById('actuTitre').value = '';
    document.getElementById('actuTexte').value = '';
    document.getElementById('actuDate').value = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('actuEditId').value = '';
    openModal('actuModal');
}

function openEditActuModal(id) {
    const actu = contentData.actualites.find(a => a.id === id);
    if (!actu) return;

    document.getElementById('actuModalTitle').textContent = 'Modifier l\'actualit\u00e9';
    document.getElementById('actuBadge').value = actu.badge;
    document.getElementById('actuTitre').value = actu.titre;
    document.getElementById('actuTexte').value = actu.texte;
    document.getElementById('actuDate').value = actu.date;
    document.getElementById('actuEditId').value = id;
    openModal('actuModal');
}

async function saveActu() {
    const editId = document.getElementById('actuEditId').value;
    const badge = document.getElementById('actuBadge').value;
    const titre = document.getElementById('actuTitre').value.trim();
    const texte = document.getElementById('actuTexte').value.trim();
    const date = document.getElementById('actuDate').value.trim();

    if (!titre || !texte) {
        showToast('Veuillez remplir le titre et le texte', 'error');
        return;
    }

    const icons = { 'Promo': '&#127873;', 'Nouveau': '&#128295;', 'Info': '&#128197;' };

    if (editId) {
        const actu = contentData.actualites.find(a => a.id === parseInt(editId));
        if (actu) {
            actu.badge = badge;
            actu.titre = titre;
            actu.texte = texte;
            actu.date = date;
            actu.icon = icons[badge] || '&#128197;';
        }
    } else {
        const newId = contentData.actualites.length > 0
            ? Math.max(...contentData.actualites.map(a => a.id)) + 1
            : 1;
        contentData.actualites.push({
            id: newId,
            badge: badge,
            icon: icons[badge] || '&#128197;',
            titre: titre,
            texte: texte,
            date: date
        });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderActualites();
    closeModal('actuModal');
    showToast('Actualit\u00e9 sauvegard\u00e9e !');

    await publishToGitHub();
}

function deleteActu(id) {
    if (!confirm('Supprimer cette actualit\u00e9 ?')) return;
    contentData.actualites = contentData.actualites.filter(a => a.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderActualites();
    showToast('Actualit\u00e9 supprim\u00e9e');
    publishToGitHub();
}

// ========== AVIS ==========
function renderAvis() {
    const list = document.getElementById('avisList');
    if (!list) return;

    let html = '';
    contentData.avis.forEach(avis => {
        const stars = '★'.repeat(avis.rating) + '☆'.repeat(5 - avis.rating);
        html += `
            <div class="admin-card">
                <div class="card-header">
                    <div>
                        <h3>${avis.initial || avis.name.charAt(0).toUpperCase()} — ${avis.name}</h3>
                        <span style="color:var(--gold);font-size:1.1rem;">${stars}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditAvisModal(${avis.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAvis(${avis.id})">Supprimer</button>
                    </div>
                </div>
                <p class="card-text">${avis.text}</p>
            </div>
        `;
    });

    if (contentData.avis.length === 0) {
        html = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucun avis pour le moment</p>';
    }

    list.innerHTML = html;
}

function openAddAvisModal() {
    document.getElementById('avisModalTitle').textContent = 'Ajouter un avis';
    document.getElementById('avisName').value = '';
    document.getElementById('avisInitial').value = '';
    document.getElementById('avisRating').value = '5';
    document.getElementById('avisText').value = '';
    document.getElementById('avisEditId').value = '';
    openModal('avisModal');
}

function openEditAvisModal(id) {
    const avis = contentData.avis.find(a => a.id === id);
    if (!avis) return;

    document.getElementById('avisModalTitle').textContent = 'Modifier l\'avis';
    document.getElementById('avisName').value = avis.name;
    document.getElementById('avisInitial').value = avis.initial || '';
    document.getElementById('avisRating').value = avis.rating;
    document.getElementById('avisText').value = avis.text;
    document.getElementById('avisEditId').value = id;
    openModal('avisModal');
}

async function saveAvis() {
    const editId = document.getElementById('avisEditId').value;
    const name = document.getElementById('avisName').value.trim();
    const initial = document.getElementById('avisInitial').value.trim().toUpperCase() || name.charAt(0).toUpperCase();
    const rating = parseInt(document.getElementById('avisRating').value);
    const text = document.getElementById('avisText').value.trim();

    if (!name || !text) {
        showToast('Veuillez remplir le nom et le t\u00e9moignage', 'error');
        return;
    }

    if (editId) {
        const avis = contentData.avis.find(a => a.id === parseInt(editId));
        if (avis) {
            avis.name = name;
            avis.initial = initial;
            avis.rating = rating;
            avis.text = text;
        }
    } else {
        const newId = contentData.avis.length > 0
            ? Math.max(...contentData.avis.map(a => a.id)) + 1
            : 1;
        contentData.avis.push({ id: newId, name, initial, rating, text });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderAvis();
    closeModal('avisModal');
    showToast('Avis sauvegard\u00e9 !');

    await publishToGitHub();
}

function deleteAvis(id) {
    if (!confirm('Supprimer cet avis ?')) return;
    contentData.avis = contentData.avis.filter(a => a.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderAvis();
    showToast('Avis supprim\u00e9');
    publishToGitHub();
}

// ========== FAQ ==========
function renderFaq() {
    const list = document.getElementById('faqList');
    if (!list) return;

    let html = '';
    contentData.faq.forEach(item => {
        html += `
            <div class="admin-card">
                <div class="card-header">
                    <h3>${item.question}</h3>
                    <div class="card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditFaqModal(${item.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFaq(${item.id})">Supprimer</button>
                    </div>
                </div>
                <p class="card-text">${item.answer}</p>
            </div>
        `;
    });

    if (contentData.faq.length === 0) {
        html = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucune question pour le moment</p>';
    }

    list.innerHTML = html;
}

function openAddFaqModal() {
    document.getElementById('faqModalTitle').textContent = 'Ajouter une question';
    document.getElementById('faqQuestion').value = '';
    document.getElementById('faqAnswer').value = '';
    document.getElementById('faqEditId').value = '';
    openModal('faqModal');
}

function openEditFaqModal(id) {
    const item = contentData.faq.find(f => f.id === id);
    if (!item) return;

    document.getElementById('faqModalTitle').textContent = 'Modifier la question';
    document.getElementById('faqQuestion').value = item.question;
    document.getElementById('faqAnswer').value = item.answer;
    document.getElementById('faqEditId').value = id;
    openModal('faqModal');
}

async function saveFaq() {
    const editId = document.getElementById('faqEditId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();

    if (!question || !answer) {
        showToast('Veuillez remplir la question et la r\u00e9ponse', 'error');
        return;
    }

    if (editId) {
        const item = contentData.faq.find(f => f.id === parseInt(editId));
        if (item) {
            item.question = question;
            item.answer = answer;
        }
    } else {
        const newId = contentData.faq.length > 0
            ? Math.max(...contentData.faq.map(f => f.id)) + 1
            : 1;
        contentData.faq.push({ id: newId, question, answer });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderFaq();
    closeModal('faqModal');
    showToast('Question sauvegard\u00e9e !');

    await publishToGitHub();
}

function deleteFaq(id) {
    if (!confirm('Supprimer cette question ?')) return;
    contentData.faq = contentData.faq.filter(f => f.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderFaq();
    showToast('Question supprim\u00e9e');
    publishToGitHub();
}

// ========== BANDEAU ==========
function renderBandeau() {
    const list = document.getElementById('bandeauList');
    if (!list) return;

    let html = '';
    contentData.bandeau.forEach(item => {
        html += `
            <div class="admin-card">
                <div class="card-header">
                    <h3>${item.icon || ''} ${item.text}</h3>
                    <div class="card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditBandeauModal(${item.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBandeau(${item.id})">Supprimer</button>
                    </div>
                </div>
            </div>
        `;
    });

    if (contentData.bandeau.length === 0) {
        html = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucun message dans le bandeau pour le moment</p>';
    }

    list.innerHTML = html;
}

function openAddBandeauModal() {
    document.getElementById('bandeauModalTitle').textContent = 'Ajouter un message';
    document.getElementById('bandeauIcon').value = '';
    document.getElementById('bandeauText').value = '';
    document.getElementById('bandeauEditId').value = '';
    openModal('bandeauModal');
}

function openEditBandeauModal(id) {
    const item = contentData.bandeau.find(b => b.id === id);
    if (!item) return;

    document.getElementById('bandeauModalTitle').textContent = 'Modifier le message';
    document.getElementById('bandeauIcon').value = item.icon || '';
    document.getElementById('bandeauText').value = item.text;
    document.getElementById('bandeauEditId').value = id;
    openModal('bandeauModal');
}

async function saveBandeau() {
    const editId = document.getElementById('bandeauEditId').value;
    const icon = document.getElementById('bandeauIcon').value.trim();
    const text = document.getElementById('bandeauText').value.trim();

    if (!text) {
        showToast('Veuillez remplir le texte du message', 'error');
        return;
    }

    if (editId) {
        const item = contentData.bandeau.find(b => b.id === parseInt(editId));
        if (item) {
            item.icon = icon;
            item.text = text;
        }
    } else {
        const newId = contentData.bandeau.length > 0
            ? Math.max(...contentData.bandeau.map(b => b.id)) + 1
            : 1;
        contentData.bandeau.push({ id: newId, icon, text });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderBandeau();
    closeModal('bandeauModal');
    showToast('Message sauvegard\u00e9 !');

    await publishToGitHub();
}

function deleteBandeau(id) {
    if (!confirm('Supprimer ce message ?')) return;
    contentData.bandeau = contentData.bandeau.filter(b => b.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderBandeau();
    showToast('Message supprim\u00e9');
    publishToGitHub();
}

// ========== SERVICES ==========
function renderServices() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    let html = '';
    contentData.services.forEach(service => {
        html += `
            <div class="admin-card">
                <div class="card-header">
                    <h3>${service.icon || ''} ${service.title}</h3>
                    <div class="card-actions">
                        <button class="btn btn-gold btn-sm" onclick="openEditServiceModal(${service.id})">Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">Supprimer</button>
                    </div>
                </div>
                <p class="card-text">${service.description}</p>
            </div>
        `;
    });

    if (contentData.services.length === 0) {
        html = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucun service pour le moment</p>';
    }

    list.innerHTML = html;
}

function openAddServiceModal() {
    document.getElementById('serviceModalTitle').textContent = 'Ajouter un service';
    document.getElementById('serviceIcon').value = '';
    document.getElementById('serviceTitle').value = '';
    document.getElementById('serviceDescription').value = '';
    document.getElementById('serviceEditId').value = '';
    openModal('serviceModal');
}

function openEditServiceModal(id) {
    const service = contentData.services.find(s => s.id === id);
    if (!service) return;

    document.getElementById('serviceModalTitle').textContent = 'Modifier le service';
    document.getElementById('serviceIcon').value = service.icon || '';
    document.getElementById('serviceTitle').value = service.title;
    document.getElementById('serviceDescription').value = service.description;
    document.getElementById('serviceEditId').value = id;
    openModal('serviceModal');
}

async function saveService() {
    const editId = document.getElementById('serviceEditId').value;
    const icon = document.getElementById('serviceIcon').value.trim();
    const title = document.getElementById('serviceTitle').value.trim();
    const description = document.getElementById('serviceDescription').value.trim();

    if (!title || !description) {
        showToast('Veuillez remplir le titre et la description', 'error');
        return;
    }

    if (editId) {
        const service = contentData.services.find(s => s.id === parseInt(editId));
        if (service) {
            service.icon = icon;
            service.title = title;
            service.description = description;
        }
    } else {
        const newId = contentData.services.length > 0
            ? Math.max(...contentData.services.map(s => s.id)) + 1
            : 1;
        contentData.services.push({ id: newId, icon, title, description });
    }

    contentData.lastModified = Date.now();
    saveContentLocal();
    renderServices();
    closeModal('serviceModal');
    showToast('Service sauvegard\u00e9 !');

    await publishToGitHub();
}

function deleteService(id) {
    if (!confirm('Supprimer ce service ?')) return;
    contentData.services = contentData.services.filter(s => s.id !== id);
    contentData.lastModified = Date.now();
    saveContentLocal();
    renderServices();
    showToast('Service supprim\u00e9');
    publishToGitHub();
}

// ========== INFOS ==========
function renderInfos() {
    const infos = contentData.infos || {};
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('infosPhone', infos.phone);
    setVal('infosEmail', infos.email);
    setVal('infosAddress', infos.address);
    setVal('infosCity', infos.city);
    setVal('infosPostalCode', infos.postalCode);
    setVal('infosHorairesLV', infos.horairesLV);
    setVal('infosHorairesSamedi', infos.horairesSamedi);
    setVal('infosHorairesNote', infos.horairesNote);
}

async function saveInfos() {
    contentData.infos = {
        phone: document.getElementById('infosPhone').value.trim(),
        email: document.getElementById('infosEmail').value.trim(),
        address: document.getElementById('infosAddress').value.trim(),
        city: document.getElementById('infosCity').value.trim(),
        postalCode: document.getElementById('infosPostalCode').value.trim(),
        horairesLV: document.getElementById('infosHorairesLV').value.trim(),
        horairesSamedi: document.getElementById('infosHorairesSamedi').value.trim(),
        horairesNote: document.getElementById('infosHorairesNote').value.trim()
    };

    contentData.lastModified = Date.now();
    saveContentLocal();
    showToast('Informations sauvegard\u00e9es !');

    await publishToGitHub();
}

// ========== LOCAL STORAGE ==========
function saveContentLocal() {
    try {
        localStorage.setItem('m17_content', JSON.stringify(contentData));
        console.log('Contenu sauvegarde dans localStorage');
    } catch (e) {
        console.error('Erreur sauvegarde localStorage:', e);
        showToast('Attention : stockage local plein. Configurez le token GitHub.', 'error');
    }
}

// ========== GITHUB API ==========
function getGithubToken() {
    return localStorage.getItem('m17_github_token') || '';
}

function saveGithubToken() {
    const token = document.getElementById('githubToken').value.trim();
    if (token) {
        localStorage.setItem('m17_github_token', token);
        showToast('Token GitHub sauvegard\u00e9 !');
        checkGithubToken();
    }
}

async function checkGithubToken() {
    const token = getGithubToken();
    const status = document.getElementById('githubStatus');
    const tokenInput = document.getElementById('githubToken');

    if (!token) {
        if (status) status.innerHTML = '<span class="status-dot status-disconnected"></span>Non configur\u00e9';
        return;
    }

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            if (status) status.innerHTML = `<span class="status-dot status-connected"></span>Connect\u00e9 en tant que ${user.login}`;
            if (tokenInput) tokenInput.value = '';
            if (tokenInput) tokenInput.placeholder = 'Token enregistr\u00e9 ✓';
        } else {
            if (status) status.innerHTML = '<span class="status-dot status-disconnected"></span>Token invalide';
        }
    } catch (e) {
        if (status) status.innerHTML = '<span class="status-dot status-disconnected"></span>Erreur de connexion';
    }
}

async function publishToGitHub() {
    const token = getGithubToken();
    if (!token) {
        console.log('Pas de token GitHub - sauvegarde locale uniquement');
        return false;
    }

    try {
        // Recuperer le SHA actuel du fichier
        const getResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONTENT_PATH}`,
            { headers: { 'Authorization': `token ${token}` } }
        );

        let sha = '';
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }

        // Sauvegarder le contenu (sans les images base64 trop grosses pour GitHub API)
        const contentToSave = JSON.parse(JSON.stringify(contentData));

        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(contentToSave, null, 2))));

        const putBody = {
            message: 'Mise \u00e0 jour du contenu via admin',
            content: contentBase64
        };
        if (sha) putBody.sha = sha;

        const putResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONTENT_PATH}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putBody)
            }
        );

        if (putResponse.ok) {
            showToast('Publi\u00e9 sur le site en ligne !');
            return true;
        } else {
            showToast('Erreur de publication GitHub', 'error');
            return false;
        }
    } catch (e) {
        console.error('Erreur GitHub:', e);
        showToast('Erreur de connexion GitHub', 'error');
        return false;
    }
}

// ========== FILE HANDLING ==========
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Compresser l'image pour eviter de depasser le localStorage
            compressImage(reader.result, 800, 0.7).then(resolve).catch(() => resolve(reader.result));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Compresser une image base64
function compressImage(base64, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// File upload area
const fileUploadArea = document.getElementById('fileUploadArea');
const photoFileInput = document.getElementById('photoFile');

if (fileUploadArea) {
    fileUploadArea.addEventListener('click', () => photoFileInput.click());

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--gold)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--border)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files[0]) {
            photoFileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
}

if (photoFileInput) {
    photoFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

async function handleFileSelect(file) {
    const preview = document.getElementById('imagePreview');
    const base64 = await fileToBase64(file);
    currentPhotoData = base64;
    preview.src = base64;
    preview.style.display = 'block';
    fileUploadArea.querySelector('p').textContent = file.name;
}

// URL preview
document.getElementById('photoUrl')?.addEventListener('input', (e) => {
    const preview = document.getElementById('imagePreview');
    if (e.target.value.trim()) {
        preview.src = e.target.value.trim();
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// ========== MODALS ==========
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Fermer au clic sur l'overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== CHANGE PASSWORD ==========
async function changePassword() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (!newPass || newPass.length < 6) {
        showToast('Le mot de passe doit faire au moins 6 caract\u00e8res', 'error');
        return;
    }

    if (newPass !== confirmPass) {
        showToast('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    const hash = await sha256(newPass);
    localStorage.setItem('m17_admin_hash', hash);
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showToast('Mot de passe chang\u00e9 avec succ\u00e8s !');
}

// ========== DASHBOARD STATS ==========
function updateDashboard() {
    const stats = {
        statPhotos: (contentData.galerie || []).length,
        statActus: (contentData.actualites || []).length,
        statAvis: (contentData.avis || []).length,
        statFaq: (contentData.faq || []).length,
        statServices: (contentData.services || []).length,
        statBandeau: (contentData.bandeau || []).length
    };
    for (const [id, val] of Object.entries(stats)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    // Derniere sauvegarde
    const lastSave = document.getElementById('lastSaveDate');
    if (lastSave && contentData.lastModified) {
        lastSave.textContent = new Date(contentData.lastModified).toLocaleString('fr-FR');
    }
}

// ========== PREVIEW ==========
function openPreview() {
    const modal = document.getElementById('previewModal');
    const frame = document.getElementById('previewFrame');
    frame.src = 'index.html?preview=1&t=' + Date.now();
    modal.classList.add('active');
}

// ========== EXPORT DONNEES ==========
function exportData() {
    const dataStr = JSON.stringify(contentData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mecanique17-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Donn\u00e9es export\u00e9es avec succ\u00e8s !');
}

// ========== HORAIRES EXCEPTIONNELS ==========
function addHoraireExceptionnel() {
    document.getElementById('horaireDateDebut').value = '';
    document.getElementById('horaireDateFin').value = '';
    document.getElementById('horaireMotif').value = '';
    document.getElementById('horaireModal').classList.add('active');
}

function saveHoraire() {
    const debut = document.getElementById('horaireDateDebut').value;
    const fin = document.getElementById('horaireDateFin').value;
    const motif = document.getElementById('horaireMotif').value.trim();

    if (!debut || !fin || !motif) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (!contentData.horairesExceptionnels) contentData.horairesExceptionnels = [];
    contentData.horairesExceptionnels.push({ debut, fin, motif, id: Date.now() });

    saveContentLocal();
    publishToGitHub();
    renderHoraires();
    closeModal('horaireModal');
    showToast('Fermeture exceptionnelle ajout\u00e9e !');
}

function renderHoraires() {
    const container = document.getElementById('horairesExceptionnels');
    if (!container) return;
    const horaires = contentData.horairesExceptionnels || [];

    if (horaires.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Aucune fermeture exceptionnelle enregistr\u00e9e</p>';
        return;
    }

    container.innerHTML = horaires.map(h => `
        <div class="horaire-item">
            <div class="horaire-info">
                <div class="horaire-dates">${formatDate(h.debut)} - ${formatDate(h.fin)}</div>
                <div class="horaire-motif">${h.motif}</div>
            </div>
            <button class="btn-icon" onclick="deleteHoraire(${h.id})" title="Supprimer" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:1.2rem;">&times;</button>
        </div>
    `).join('');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function deleteHoraire(id) {
    if (!confirm('Supprimer cette fermeture ?')) return;
    contentData.horairesExceptionnels = (contentData.horairesExceptionnels || []).filter(h => h.id !== id);
    saveContentLocal();
    publishToGitHub();
    renderHoraires();
    showToast('Fermeture supprim\u00e9e');
}

// ========== EDITEUR RICHE ==========
function richCmd(cmd) {
    document.execCommand(cmd, false, null);
    document.getElementById('actuTexte').focus();
}

function richLink() {
    const url = prompt('URL du lien :');
    if (url) {
        document.execCommand('createLink', false, url);
        document.getElementById('actuTexte').focus();
    }
}

// ========== AVIS EN ATTENTE ==========
function renderPendingAvis() {
    const container = document.getElementById('pendingAvisList');
    if (!container) return;

    const pending = JSON.parse(localStorage.getItem('m17_pending_avis') || '[]');
    const statEl = document.getElementById('statPending');
    if (statEl) statEl.textContent = pending.length;

    if (pending.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Aucun avis en attente</p>';
        return;
    }

    container.innerHTML = pending.map(a => {
        const stars = '\u2605'.repeat(a.rating) + '\u2606'.repeat(5 - a.rating);
        const date = new Date(a.date).toLocaleDateString('fr-FR');
        return `
            <div class="pending-avis-card">
                <div class="pending-avis-info">
                    <div class="pending-avis-stars">${stars}</div>
                    <div class="pending-avis-text">\u00ab ${a.text} \u00bb</div>
                    <div class="pending-avis-author">${a.name} <span class="pending-avis-date">- ${date}</span></div>
                </div>
                <div class="pending-avis-actions">
                    <button class="btn btn-gold btn-sm" onclick="approveAvis(${a.id})">Valider</button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="rejectAvis(${a.id})">Refuser</button>
                </div>
            </div>
        `;
    }).join('');
}

function approveAvis(id) {
    let pending = JSON.parse(localStorage.getItem('m17_pending_avis') || '[]');
    const avis = pending.find(a => a.id === id);
    if (!avis) return;

    // Ajouter aux avis approuves
    if (!contentData.avis) contentData.avis = [];
    contentData.avis.push({
        name: avis.name,
        initial: avis.initial,
        rating: avis.rating,
        text: avis.text,
        id: avis.id
    });

    // Retirer des en attente
    pending = pending.filter(a => a.id !== id);
    localStorage.setItem('m17_pending_avis', JSON.stringify(pending));

    saveContentLocal();
    publishToGitHub();
    renderPendingAvis();
    addHistory('Avis de ' + avis.name + ' valid\u00e9');
    showToast('Avis valid\u00e9 et publi\u00e9 !');
}

function rejectAvis(id) {
    if (!confirm('Refuser cet avis ?')) return;
    let pending = JSON.parse(localStorage.getItem('m17_pending_avis') || '[]');
    const avis = pending.find(a => a.id === id);
    pending = pending.filter(a => a.id !== id);
    localStorage.setItem('m17_pending_avis', JSON.stringify(pending));
    renderPendingAvis();
    addHistory('Avis de ' + (avis ? avis.name : 'inconnu') + ' refus\u00e9');
    showToast('Avis refus\u00e9');
}

// ========== IMPORT DONNEES ==========
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!confirm('Importer ces donn\u00e9es ? Cela remplacera le contenu actuel.')) return;
            contentData = imported;
            saveContentLocal();
            publishToGitHub();
            loadContent();
            addHistory('Import de donn\u00e9es depuis un fichier');
            showToast('Donn\u00e9es import\u00e9es avec succ\u00e8s !');
        } catch (err) {
            showToast('Fichier invalide : ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ========== HISTORIQUE DES MODIFICATIONS ==========
function addHistory(action) {
    let history = JSON.parse(localStorage.getItem('m17_history') || '[]');
    history.unshift({
        action: action,
        date: new Date().toISOString()
    });
    // Garder les 50 dernieres
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('m17_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('m17_history') || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Aucune modification enregistr\u00e9e</p>';
        return;
    }

    container.innerHTML = history.slice(0, 20).map(h => {
        const d = new Date(h.date);
        const dateStr = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item"><span class="history-date">${dateStr}</span> <span class="history-action">${h.action}</span></div>`;
    }).join('');
}

// Intercepter les sauvegardes pour ajouter a l'historique
const origSaveContentLocal = saveContentLocal;
saveContentLocal = function() {
    origSaveContentLocal();
    contentData.lastModified = new Date().toISOString();
};

// ========== MODE MAINTENANCE ==========
function toggleMaintenance() {
    const toggle = document.getElementById('maintenanceToggle');
    const status = document.getElementById('maintenanceStatus');
    contentData.maintenance = toggle.checked;
    status.textContent = toggle.checked ? 'Activ\u00e9' : 'D\u00e9sactiv\u00e9';
    status.style.color = toggle.checked ? 'var(--danger)' : 'var(--text-muted)';
    saveContentLocal();
    publishToGitHub();
    addHistory(toggle.checked ? 'Mode maintenance activ\u00e9' : 'Mode maintenance d\u00e9sactiv\u00e9');
    showToast(toggle.checked ? 'Mode maintenance activ\u00e9' : 'Mode maintenance d\u00e9sactiv\u00e9');
}

function loadMaintenanceState() {
    const toggle = document.getElementById('maintenanceToggle');
    const status = document.getElementById('maintenanceStatus');
    if (toggle && contentData.maintenance) {
        toggle.checked = true;
        if (status) {
            status.textContent = 'Activ\u00e9';
            status.style.color = 'var(--danger)';
        }
    }
}

// ========== INIT ==========
checkSession();

// ========== SUIVI REPARATIONS ==========
function renderReparations() {
    const list = document.getElementById('reparationsList');
    if (!list) return;

    const reps = JSON.parse(localStorage.getItem('m17_reparations') || '[]');
    const statusLabels = {
        'reception': 'Receptionne',
        'diagnostic': 'En diagnostic',
        'commande': 'Pieces commandees',
        'reparation': 'En reparation',
        'termine': 'Termine',
        'pret': 'Pret a retirer'
    };

    if (reps.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Aucune reparation en cours</p>';
        return;
    }

    list.innerHTML = reps.map(r => `
        <div class="admin-card">
            <div class="card-header">
                <div>
                    <h3>${r.immat || 'N/A'} - ${r.phone || 'N/A'}</h3>
                    <span class="rep-status-badge rep-status-${r.status}">${statusLabels[r.status] || r.status}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-gold btn-sm" onclick="openEditReparationModal(${r.id})">Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteReparation(${r.id})">Supprimer</button>
                </div>
            </div>
            <p class="card-text">${r.notes || ''}</p>
            <p class="card-date">Ajout\u00e9 le ${new Date(r.id).toLocaleDateString('fr-FR')}</p>
        </div>
    `).join('');
}

function openAddReparationModal() {
    document.getElementById('reparationModalTitle').textContent = 'Ajouter un suivi';
    document.getElementById('repPhone').value = '';
    document.getElementById('repImmat').value = '';
    document.getElementById('repStatus').value = 'reception';
    document.getElementById('repNotes').value = '';
    document.getElementById('repEditId').value = '';
    openModal('reparationModal');
}

function openEditReparationModal(id) {
    const reps = JSON.parse(localStorage.getItem('m17_reparations') || '[]');
    const rep = reps.find(r => r.id === id);
    if (!rep) return;

    document.getElementById('reparationModalTitle').textContent = 'Modifier le suivi';
    document.getElementById('repPhone').value = rep.phone || '';
    document.getElementById('repImmat').value = rep.immat || '';
    document.getElementById('repStatus').value = rep.status || 'reception';
    document.getElementById('repNotes').value = rep.notes || '';
    document.getElementById('repEditId').value = id;
    openModal('reparationModal');
}

function saveReparation() {
    const editId = document.getElementById('repEditId').value;
    const phone = document.getElementById('repPhone').value.trim();
    const immat = document.getElementById('repImmat').value.trim().toUpperCase();
    const status = document.getElementById('repStatus').value;
    const notes = document.getElementById('repNotes').value.trim();

    if (!phone && !immat) {
        showToast('Veuillez remplir le telephone ou l\'immatriculation', 'error');
        return;
    }

    let reps = JSON.parse(localStorage.getItem('m17_reparations') || '[]');

    if (editId) {
        const rep = reps.find(r => r.id === parseInt(editId));
        if (rep) {
            rep.phone = phone;
            rep.immat = immat;
            rep.status = status;
            rep.notes = notes;
        }
    } else {
        reps.push({
            id: Date.now(),
            phone: phone,
            immat: immat,
            status: status,
            notes: notes
        });
    }

    localStorage.setItem('m17_reparations', JSON.stringify(reps));
    renderReparations();
    closeModal('reparationModal');
    showToast('Suivi sauvegarde !');
    addHistory('Suivi reparation ' + immat + ' mis a jour');
}

function deleteReparation(id) {
    if (!confirm('Supprimer ce suivi ?')) return;
    let reps = JSON.parse(localStorage.getItem('m17_reparations') || '[]');
    reps = reps.filter(r => r.id !== id);
    localStorage.setItem('m17_reparations', JSON.stringify(reps));
    renderReparations();
    showToast('Suivi supprime');
}

// ========== STATISTIQUES ==========
function renderStatistiques() {
    const analytics = JSON.parse(localStorage.getItem('m17_analytics') || '{}');
    const today = new Date().toISOString().split('T')[0];
    const rdvList = JSON.parse(localStorage.getItem('m17_rdv_list') || '[]');

    // Total visits
    const totalEl = document.getElementById('statTotalVisits');
    if (totalEl) totalEl.textContent = analytics.totalVisits || 0;

    // Today visits
    const todayEl = document.getElementById('statTodayVisits');
    if (todayEl) todayEl.textContent = (analytics.dailyVisits && analytics.dailyVisits[today]) || 0;

    // RDV count
    const rdvEl = document.getElementById('statRdvCount');
    if (rdvEl) rdvEl.textContent = rdvList.length;

    // Most popular section
    const popEl = document.getElementById('statPopSection');
    if (popEl && analytics.sectionViews) {
        const sections = Object.entries(analytics.sectionViews);
        if (sections.length > 0) {
            sections.sort((a, b) => b[1] - a[1]);
            popEl.textContent = sections[0][0];
            popEl.style.fontSize = '1rem';
        }
    }

    // Section details
    const detailEl = document.getElementById('sectionStatsDetail');
    if (detailEl && analytics.sectionViews) {
        const sections = Object.entries(analytics.sectionViews).sort((a, b) => b[1] - a[1]);
        if (sections.length > 0) {
            detailEl.innerHTML = sections.map(([name, count]) =>
                '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);">' + name + '</span><span style="color:var(--gold);font-weight:700;">' + count + ' vues</span></div>'
            ).join('');
        } else {
            detailEl.innerHTML = '<p style="color:var(--text-muted);">Pas encore de donnees</p>';
        }
    }

    // RDV list
    const rdvListEl = document.getElementById('rdvListAdmin');
    if (rdvListEl) {
        if (rdvList.length === 0) {
            rdvListEl.innerHTML = '<p style="color:var(--text-muted);">Aucune demande de RDV</p>';
        } else {
            rdvListEl.innerHTML = rdvList.slice().reverse().slice(0, 20).map(r => {
                const date = r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '-';
                return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">' +
                    '<div><strong style="color:var(--text);">' + (r.nom || '') + ' ' + (r.prenom || '') + '</strong><br><span style="color:var(--text-muted);font-size:0.85rem;">' + (r.intervention || '') + '</span></div>' +
                    '<div style="text-align:right;"><span style="color:var(--gold);font-size:0.85rem;">' + (r.telephone || '') + '</span><br><span style="color:var(--text-muted);font-size:0.75rem;">' + date + '</span></div></div>';
            }).join('');
        }
    }
}

// ========== EXPORT RDV CSV ==========
function exportRdvCSV() {
    const rdvList = JSON.parse(localStorage.getItem('m17_rdv_list') || '[]');
    if (rdvList.length === 0) {
        showToast('Aucune donnee RDV a exporter', 'error');
        return;
    }

    let csv = 'Nom,Prenom,Telephone,Type intervention,Description,Date\n';
    rdvList.forEach(r => {
        csv += '"' + (r.nom || '') + '","' + (r.prenom || '') + '","' + (r.telephone || '') + '","' + (r.intervention || '') + '","' + (r.travaux || '').replace(/"/g, '""') + '","' + (r.date || '') + '"\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rdv-mecanique17-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('RDV exportes en CSV !');
}

// ========== FIDELITE ADMIN ==========
function adminAddStamp() {
    let stamps = parseInt(localStorage.getItem('m17_loyalty_stamps') || '0');
    if (stamps >= 5) {
        showToast('Maximum de tampons atteint (5/5)', 'error');
        return;
    }
    stamps++;
    localStorage.setItem('m17_loyalty_stamps', stamps);
    document.getElementById('adminStampCount').textContent = stamps;
    showToast('Tampon ajoute ! (' + stamps + '/5)');
    addHistory('Tampon de fidelite ajoute (' + stamps + '/5)');
}

function adminResetStamps() {
    if (!confirm('Remettre les tampons a zero ?')) return;
    localStorage.setItem('m17_loyalty_stamps', '0');
    document.getElementById('adminStampCount').textContent = '0';
    showToast('Tampons remis a zero');
    addHistory('Tampons de fidelite remis a zero');
}

function renderFideliteAdmin() {
    const stamps = parseInt(localStorage.getItem('m17_loyalty_stamps') || '0');
    const el = document.getElementById('adminStampCount');
    if (el) el.textContent = stamps;
}

// ========== NOTIFICATION BADGE ==========
function updateNotifBadge() {
    const pending = JSON.parse(localStorage.getItem('m17_pending_avis') || '[]');
    const rdvList = JSON.parse(localStorage.getItem('m17_rdv_list') || '[]');
    const total = pending.length;
    const badge = document.getElementById('notifBadge');
    const count = document.getElementById('notifCount');
    if (badge && count) {
        if (total > 0) {
            badge.style.display = 'inline-block';
            count.textContent = total;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Appeler updateDashboard apres le chargement du contenu
const origLoadContent = loadContent;
loadContent = async function() {
    await origLoadContent();
    updateDashboard();
    renderHoraires();
    renderHistory();
    loadMaintenanceState();
    renderPendingAvis();
    renderReparations();
    renderStatistiques();
    renderFideliteAdmin();
    updateNotifBadge();
};
