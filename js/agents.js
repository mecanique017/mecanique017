// ================================================================
// AGENTS IA — MÉCANIQUE 17
// Tous les agents qui tournent automatiquement sur le site
// ================================================================

// ----------------------------------------------------------------
// AGENT 5 — PROMOTIONS SAISONNIÈRES
// Détecte la saison et adapte les offres automatiquement
// ----------------------------------------------------------------
(function AgentPromotions() {
    const mois = new Date().getMonth(); // 0 = janvier

    const saisons = {
        hiver:    { mois: [11, 0, 1],  label: '❄️ Offre Hiver',     texte: 'Hiver approche ! Faites vérifier votre batterie et vos pneus. -10% sur le diagnostic batterie.',    icone: '🔋', service: 'Batterie & Démarrage' },
        printemps:{ mois: [2, 3, 4],   label: '🌸 Offre Printemps', texte: 'Préparez votre été ! Recharge de climatisation et contrôle pré-CT. Devis gratuit.',               icone: '❄️', service: 'Climatisation' },
        ete:      { mois: [5, 6, 7],   label: '☀️ Offre Été',       texte: 'Forte chaleur = clim indispensable ! Recharge climatisation à tarif préférentiel.',                icone: '🌡️', service: 'Climatisation' },
        automne:  { mois: [8, 9, 10],  label: '🍂 Offre Automne',   texte: 'Préparez votre voiture pour l\'hiver. Pneus, batterie, freins : audit complet offert avec vidange.', icone: '🔧', service: 'Entretien complet' }
    };

    let saisonActuelle = null;
    for (const [nom, data] of Object.entries(saisons)) {
        if (data.mois.includes(mois)) { saisonActuelle = data; break; }
    }
    if (!saisonActuelle) return;

    // Injecter la bannière saisonnière dans la section actualités si elle existe
    const actu = document.querySelector('.actu-grid');
    if (!actu) return;

    const card = document.createElement('article');
    card.className = 'actu-card agent-promo-card';
    card.setAttribute('data-animate', '');
    card.innerHTML = `
        <div class="actu-badge" style="background:linear-gradient(135deg,#e8a800,#f0c040);color:#1a1a2e;">🤖 Auto</div>
        <div class="actu-placeholder">${saisonActuelle.icone}</div>
        <div class="actu-content">
            <h3>${saisonActuelle.label}</h3>
            <p>${saisonActuelle.texte}</p>
            <span class="actu-date">Mis à jour automatiquement</span>
        </div>`;
    actu.insertBefore(card, actu.firstChild);
})();


// ----------------------------------------------------------------
// AGENT 8 — MÉTÉO & ALERTES SAISONNIÈRES
// Utilise open-meteo.com (gratuit, sans clé API)
// Affiche une alerte si conditions météo extrêmes
// ----------------------------------------------------------------
(function AgentMeteo() {
    const LAT = 45.5833;
    const LON = -0.3833;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Paris`;

    const weatherAlerts = {
        // Codes météo WMO → message d'alerte garage
        froid:   { codes: [], tempMax: 5,  msg: '🥶 Températures très basses à Jarnac-Champagne — Pensez à faire vérifier votre batterie avant la panne !',     cta: 'Prendre RDV batterie' },
        chaud:   { codes: [], tempMin: 30, msg: '🌡️ Forte chaleur prévue — Votre climatisation est-elle rechargée ? Ne tombez pas en panne de froid cet été !', cta: 'Prendre RDV climatisation' },
        pluie:   { codes: [51,53,55,61,63,65,80,81,82], msg: '🌧️ Pluie annoncée — Vérifiez l\'état de vos pneus et essuie-glaces pour rouler en sécurité.',    cta: 'Contrôle sécurité gratuit' },
        neige:   { codes: [71,73,75,77,85,86],           msg: '❄️ Risque de neige/verglas — Avez-vous des pneus adaptés ? Nous intervenons sur rendez-vous.',    cta: 'Prendre RDV pneus' },
        orage:   { codes: [95,96,99],                    msg: '⛈️ Orages prévus — Protégez votre véhicule et vérifiez vos freins avant de prendre la route.',    cta: 'Vérification freins' }
    };

    fetch(url)
        .then(r => r.json())
        .then(data => {
            const temp = data.current.temperature_2m;
            const code = data.current.weathercode;
            let alerte = null;

            if (temp <= 5)  alerte = weatherAlerts.froid;
            else if (temp >= 30) alerte = weatherAlerts.chaud;
            else if (weatherAlerts.neige.codes.includes(code)) alerte = weatherAlerts.neige;
            else if (weatherAlerts.orage.codes.includes(code)) alerte = weatherAlerts.orage;
            else if (weatherAlerts.pluie.codes.includes(code)) alerte = weatherAlerts.pluie;

            if (!alerte) return;

            // Injecter la bannière météo sous le hero
            const hero = document.querySelector('.hero');
            if (!hero) return;
            const banner = document.createElement('div');
            banner.className = 'agent-meteo-banner';
            banner.innerHTML = `
                <span class="agent-meteo-msg">${alerte.msg}</span>
                <a href="#rdv" class="agent-meteo-cta">${alerte.cta} →</a>
                <button class="agent-meteo-close" onclick="this.parentElement.remove()" aria-label="Fermer">&times;</button>`;
            hero.insertAdjacentElement('afterend', banner);
        })
        .catch(() => {}); // Silencieux si pas de connexion
})();


// ----------------------------------------------------------------
// AGENT 1 — GESTIONNAIRE RDV
// Sauvegarde et organise les RDV pris via Amélie en localStorage
// Accessible depuis la page admin
// ----------------------------------------------------------------
window.AgentRDV = {
    sauvegarder(data) {
        const rdvs = this.lire();
        rdvs.push({ ...data, id: Date.now(), date: new Date().toISOString(), statut: 'en attente' });
        localStorage.setItem('m17_rdvs', JSON.stringify(rdvs));
    },
    lire() {
        try { return JSON.parse(localStorage.getItem('m17_rdvs') || '[]'); } catch { return []; }
    },
    compterAujourdhui() {
        const auj = new Date().toDateString();
        return this.lire().filter(r => new Date(r.date).toDateString() === auj).length;
    },
    compterTotal() { return this.lire().length; },
    marquerTraite(id) {
        const rdvs = this.lire().map(r => r.id === id ? { ...r, statut: 'traité' } : r);
        localStorage.setItem('m17_rdvs', JSON.stringify(rdvs));
    }
};


// ----------------------------------------------------------------
// AGENT 9 — MINI DASHBOARD FLOTTANT (admin seulement)
// Affiche un compteur en bas de page si connecté en admin
// ----------------------------------------------------------------
(function AgentDashboard() {
    if (!sessionStorage.getItem('m17_admin_logged')) return;

    const rdvs    = window.AgentRDV ? window.AgentRDV.lire() : [];
    const enAttente = rdvs.filter(r => r.statut === 'en attente').length;
    const auj     = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

    const dash = document.createElement('div');
    dash.id = 'agentDashboard';
    dash.innerHTML = `
        <div class="agent-dash-header">🤖 Dashboard — ${auj}</div>
        <div class="agent-dash-stats">
            <div class="agent-dash-stat"><span>${enAttente}</span><small>RDV en attente</small></div>
            <div class="agent-dash-stat"><span>${rdvs.length}</span><small>Total RDV</small></div>
            <div class="agent-dash-stat"><span>✅</span><small>Agents actifs</small></div>
        </div>
        <a href="admin.html" class="agent-dash-link">Ouvrir l'admin →</a>
        <button onclick="document.getElementById('agentDashboard').remove()" class="agent-dash-close">&times;</button>`;
    document.body.appendChild(dash);
})();


// ----------------------------------------------------------------
// AGENT 7 — RELANCE CLIENTS (intégration Amélie)
// Après chaque RDV enregistré, propose un rappel automatique
// Les données sont envoyées avec le formulaire via formsubmit
// ----------------------------------------------------------------
window.AgentRelance = {
    // Délais de relance selon le service
    delais: {
        'vidange':       { jours: 180, msg: 'Votre vidange date de 6 mois — pensez au prochain entretien !' },
        'climatisation': { jours: 365, msg: 'Il est temps de recharger votre climatisation pour l\'été !' },
        'distribution':  { jours: 730, msg: 'Contrôle de distribution recommandé dans 2 ans !' },
        'freins':        { jours: 365, msg: 'Vérification freins conseillée dans 12 mois.' },
        'default':       { jours: 365, msg: 'Votre prochain entretien annuel approche !' }
    },

    programmerRelance(rdvData) {
        // Sauvegarde le RDV + date de relance prévue
        const service = (rdvData.service || '').toLowerCase();
        let config = this.delais.default;
        for (const [key, val] of Object.entries(this.delais)) {
            if (service.includes(key)) { config = val; break; }
        }
        const dateRelance = new Date();
        dateRelance.setDate(dateRelance.getDate() + config.jours);

        const relances = JSON.parse(localStorage.getItem('m17_relances') || '[]');
        relances.push({
            client:      `${rdvData.prenom} ${rdvData.nom}`,
            email:       rdvData.email,
            telephone:   rdvData.telephone,
            service:     rdvData.service,
            message:     config.msg,
            dateRelance: dateRelance.toISOString(),
            fait:        false
        });
        localStorage.setItem('m17_relances', JSON.stringify(relances));
    },

    getRelancesAFaire() {
        const maintenant = new Date();
        return JSON.parse(localStorage.getItem('m17_relances') || '[]')
            .filter(r => !r.fait && new Date(r.dateRelance) <= maintenant);
    }
};
