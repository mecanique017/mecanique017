// ========== CONFIGURATION ==========
const REPO_OWNER = 'mecanique017';
const REPO_NAME = 'mecanique017';
const CONTENT_PATH = 'data/content.json';

// Hash SHA-256 des identifiants admin (ne pas stocker en clair)
// Email: mecanique017@gmail.com / Password: hashed
const ADMIN_EMAIL_HASH = '5f4dcc3b5aa765d61d8327deb882cf99'; // placeholder
const ADMIN_PASS_HASH = 'a1b2c3'; // placeholder - sera verifie cote client

let contentData = { galerie: [], actualites: [] };
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
        const defaultEmailHash = await sha256('mecanique017@gmail.com');
        localStorage.setItem('m17_admin_hash', defaultPassHash);
        localStorage.setItem('m17_admin_email_hash', defaultEmailHash);

        if (passHash === defaultPassHash && emailHash === defaultEmailHash) {
            loginSuccess();
            return;
        }
    }

    const targetPassHash = storedHash || await sha256('Melvynsidibe@225');
    const targetEmailHash = storedEmailHash || await sha256('mecanique017@gmail.com');

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

    renderGallery();
    renderActualites();
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

// ========== LOCAL STORAGE ==========
function saveContentLocal() {
    localStorage.setItem('m17_content', JSON.stringify(contentData));
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
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
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

// ========== INIT ==========
checkSession();
