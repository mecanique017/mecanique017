// ========== AMÉLIE - ASSISTANTE VIRTUELLE MÉCANIQUE 17 ==========

const AMELIE_CONTACT = {
    phone: '06 51 55 00 01',
    email: 'mecanique17@gmail.com',
    address: '38 rue Chotard, 17520 Jarnac-Champagne'
};

// Base de connaissances enrichie
const AMELIE_KB = [
    {
        id: 'horaires',
        keywords: ['horaire', 'heure', 'ouvert', 'ouverture', 'fermé', 'fermeture', 'quand', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
        answer: `Nous sommes ouverts :\n\n📅 Lundi – Vendredi : 8h00 à 18h00\n📅 Samedi : 8h00 à 12h00\n❌ Dimanche : Fermé\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'adresse',
        keywords: ['adresse', 'situé', 'localisation', 'où', 'trouver', 'plan', 'route', 'venir', 'aller', 'gps'],
        answer: `📍 Nous sommes situés au :\n\n38 rue Chotard\n17520 Jarnac-Champagne\n\nÀ proximité de Jonzac, Pons et Barbezieux-Saint-Hilaire.\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'contact',
        keywords: ['téléphone', 'appeler', 'numéro', 'mail', 'email', 'contact', 'joindre', 'message'],
        answer: `Vous pouvez nous contacter :\n\n📞 ${AMELIE_CONTACT.phone}\n✉️ ${AMELIE_CONTACT.email}\n\nNous répondons du lundi au vendredi de 8h à 18h et le samedi de 8h à 12h.\n\nEn dehors des horaires, ce numéro reste disponible pour les urgences.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'devis',
        keywords: ['devis', 'prix', 'tarif', 'coût', 'combien', 'estimation', 'gratuit', 'tarification'],
        answer: `Notre devis est 100% gratuit et sans engagement ! 🎉\n\nNous établissons un devis détaillé avant toute intervention, adapté à votre véhicule et à son moteur. Aucun travail n'est réalisé sans votre accord.\n\nNous fournissons également une facture détaillée après chaque intervention.\n\nSouhaitez-vous une demande de devis ou un rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'vidange',
        keywords: ['vidange', 'huile', 'filtre huile', 'lubrification', 'niveau huile', 'vidange moteur'],
        answer: `🔧 Vidange complète\n\nNous réalisons les vidanges sur toutes marques :\n• Changement d'huile moteur\n• Remplacement du filtre à huile\n• Vérification des niveaux\n• Contrôle visuel général\n\n💰 Tarif sur devis selon votre moteur\n⏱️ Moins d'une heure\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'freins',
        keywords: ['frein', 'freinage', 'plaquette', 'disque', 'étrier', 'pédale frein', 'bruit frein', 'freine mal'],
        answer: `🔧 Système de freinage\n\nNous intervenons sur tout le freinage :\n• Remplacement des plaquettes\n• Remplacement des disques\n• Réparation des étriers\n• Purge du liquide de frein\n\n💰 Tarif sur devis selon le véhicule\n⚠️ Ne tardez pas : un freinage défaillant est dangereux !\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'distribution',
        keywords: ['distribution', 'courroie', 'chaîne distribution', 'kit distribution', 'tendeur', 'courroie casse'],
        answer: `🔧 Courroie de distribution\n\nIntervention critique pour la longévité de votre moteur !\n• Remplacement de la courroie\n• Kit complet (galet, tendeur, pompe à eau)\n• Vérification de l'ensemble\n\n⏱️ Durée : environ 4 heures\n💰 Tarif sur devis selon votre moteur\n⚠️ À changer tous les 80 000 – 120 000 km\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'embrayage',
        keywords: ['embrayage', 'pédale embrayage', 'glisse', 'vitesse', 'boite vitesse', 'transmission', 'clutch'],
        answer: `🔧 Embrayage\n\nSymptômes : pédale dure, glissement, bruit en passant les vitesses.\n• Remplacement du kit embrayage\n• Remplacement du volant moteur si nécessaire\n• Vérification de la boîte de vitesses\n\n💰 Tarif sur devis selon votre moteur et marque\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'suspension',
        keywords: ['suspension', 'amortisseur', 'ressort', 'silent bloc', 'rotule', 'roulement', 'route', 'tient pas', 'cahotant', 'bruit virage'],
        answer: `🔧 Suspension & Amortisseurs\n\nConfort et sécurité dépendent de votre suspension :\n• Remplacement des amortisseurs\n• Remplacement des ressorts\n• Changement des silent-blocs et rotules\n• Vérification des cardans\n\n💰 Tarif sur devis\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'pneus',
        keywords: ['pneu', 'pneumatique', 'crevaison', 'jante', 'montage', 'équilibrage', 'gomme', 'usé'],
        answer: `🔧 Pneumatiques\n\nNous proposons :\n• Montage et équilibrage\n• Permutation de pneus\n• Réparation de crevaison\n• Vérification et ajustement de la pression\n\n📅 Sur rendez-vous uniquement\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'diagnostic',
        keywords: ['diagnostic', 'voyant', 'valise', 'code erreur', 'calculateur', 'electronique', 'check engine', 'témoin allumé', 'lumière tableau'],
        answer: `🔧 Diagnostic électronique\n\nUn voyant allumé sur votre tableau de bord ? Pas de panique !\n• Lecture des codes défauts\n• Diagnostic complet par valise\n• Effacement des codes après réparation\n• Remise à zéro des voyants\n\n💰 Entre 30€ et 60€\n✅ Offert pour toute réparation supérieure à 200€\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'climatisation',
        keywords: ['climatisation', 'clim', 'recharge', 'air conditionné', 'froid', 'ne refroidit pas', 'chaleur', 'ac'],
        answer: `🔧 Climatisation\n\nVotre clim ne refroidit plus ? Le gaz se perd naturellement avec le temps !\n• Recharge en gaz climatisation (R134a et R1234yf)\n• Désinfection du circuit\n• Vérification des fuites\n\n💰 Tarif sur devis selon votre véhicule\n⏱️ Intervention rapide\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'controle',
        keywords: ['contrôle technique', 'ct', 'pré-contrôle', 'visite technique', 'contre-visite', 'controle', 'passage ct'],
        answer: `🔧 Pré-contrôle technique\n\nNous réalisons uniquement le pré-contrôle technique (pas le CT lui-même) :\n• Vérification complète avant votre passage au CT\n• Identification et correction des points de défaillance\n• Remise aux normes si nécessaire\n\n✅ Vous partez serein au contrôle technique !\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'batterie',
        keywords: ['batterie', 'démarrage', 'ne démarre pas', 'démarrer', 'alternateur', 'charge batterie', 'démarreur'],
        answer: `🔧 Batterie & Démarrage\n\nProblème de démarrage ?\n• Test et diagnostic de batterie\n• Remplacement de batterie\n• Vérification de l'alternateur\n• Vérification du démarreur\n\n💰 Tarif sur devis selon le véhicule\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'entretien_complet',
        keywords: ['bougie', 'filtre habitacle', 'filtre carburant', 'filtre air', 'filtre', 'entretien complet', 'révision', 'revision'],
        answer: `🔧 Entretien complet\n\nNous réalisons tous les travaux d'entretien :\n• Remplacement des bougies\n• Filtre habitacle\n• Filtre carburant\n• Filtre à air\n• Révision complète avec contrôle général\n\n💰 Tarif sur devis selon votre véhicule et moteur\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'geometrie',
        keywords: ['géométrie', 'parallélisme', 'carrossage', 'dévie', 'tire côté', 'direction'],
        answer: `ℹ️ La géométrie et le parallélisme ne font pas partie de nos prestations actuellement.\n\nPour ce type d'intervention, je vous invite à appeler le ${AMELIE_CONTACT.phone} pour être orienté vers un prestataire de confiance dans la région.`,
        quickReplies: ['Autre question', 'Prendre RDV']
    },
    {
        id: 'carrosserie',
        keywords: ['carrosserie', 'tôlerie', 'bosses', 'rayures', 'peinture', 'pare-choc', 'choc', 'accrochage', 'cabossé'],
        answer: `ℹ️ Nous ne faisons pas de carrosserie.\n\nPour les travaux de carrosserie, n'hésitez pas à nous appeler au ${AMELIE_CONTACT.phone}, nous pourrons vous orienter vers un professionnel de confiance.`,
        quickReplies: ['Autre question', 'Prendre RDV']
    },
    {
        id: 'marques',
        keywords: ['marque', 'renault', 'peugeot', 'citroën', 'citroen', 'volkswagen', 'vw', 'bmw', 'mercedes', 'audi', 'toyota', 'opel', 'ford', 'fiat', 'dacia', 'nissan', 'hyundai', 'kia', 'seat', 'skoda', 'toutes marques'],
        answer: `✅ Nous intervenons sur toutes les marques :\n\nRenault, Peugeot, Citroën, Volkswagen, BMW, Mercedes, Audi, Toyota, Opel, Ford, Fiat, Dacia, Nissan, Hyundai, Kia, Seat, Skoda, et bien d'autres !\n\n🏆 Certifications particulières :\n• Technicien Volkswagen\n• Technicien Skoda\n• Tech-Agent Renault\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'vehicules',
        keywords: ['utilitaire', 'camping car', 'camping-car', 'fourgon', 'van', 'moto', 'scooter', 'camionnette', 'break', 'suv', 'type de vehicule'],
        answer: `✅ Nous acceptons :\n• Voitures (toutes marques)\n• Utilitaires et camionnettes\n• Camping-cars\n• Véhicules diesel, essence et hybrides\n\n❌ Nous n'intervenons pas sur les motos et scooters.\n\nSouhaitez-vous prendre rendez-vous ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'paiement',
        keywords: ['paiement', 'payer', 'carte', 'espèces', 'chèque', 'virement', 'cb', 'liquide', 'plusieurs fois', 'facilité', 'mensuel'],
        answer: `💳 Moyens de paiement acceptés :\n\n• Carte bancaire (CB)\n• Espèces\n• Virement bancaire\n• Paiement en plusieurs chèques (avec pièce d'identité)\n\nℹ️ Micro-entreprise : nos prix sont sans TVA, donc plus avantageux !\n\nNous travaillons également avec les assurances et garanties constructeur.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'facture',
        keywords: ['facture', 'reçu', 'justificatif', 'document', 'rapport intervention', 'compte rendu'],
        answer: `📄 Oui, nous fournissons :\n• Une facture détaillée après chaque intervention\n• Un rapport d'intervention écrit à la demande du client\n\nTout est transparent et documenté.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'assurance',
        keywords: ['assurance', 'garantie constructeur', 'garantie fabricant', 'garantie vehicule', 'sinistre'],
        answer: `✅ Nous travaillons avec les assurances et les garanties constructeur.\n\nN'hésitez pas à nous contacter pour plus de détails selon votre situation :\n📞 ${AMELIE_CONTACT.phone}`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'delais',
        keywords: ['délai', 'temps', 'durée', 'rapide', 'attente', 'quand prêt', 'récupérer', 'combien de temps'],
        answer: `⏱️ Délais d'intervention :\n\n• Vidange / entretien courant : moins d'une heure\n• Freins / plaquettes : 1 à 2 heures\n• Distribution : environ 4 heures\n• Diagnostic : 30 min à 1 heure\n• Climatisation : moins d'une heure\n\n📅 Délai pour obtenir un RDV : généralement dans les 2 heures !\nLe délai exact vous est confirmé lors de la prise de RDV.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'rdv_fonctionnement',
        keywords: ['sans rendez', 'sans rdv', 'passage direct', 'passer directement', 'acceptez sans', 'faut il un rdv'],
        answer: `📅 Toutes nos prestations sont réalisées uniquement sur rendez-vous.\n\nCela nous permet de vous garantir un service de qualité et un délai de prise en charge optimal.\n\nBonne nouvelle : vous pouvez généralement obtenir un RDV dans les 2 heures ! 😊`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'vehicule_laisser',
        keywords: ['laisser voiture', 'laisser le vehicule', 'journée', 'nuit', 'peut-on laisser', 'récupérer le lendemain'],
        answer: `✅ Oui, vous pouvez laisser votre véhicule toute la journée et même la nuit si nécessaire.\n\nNous vous prévenons par email dès que votre véhicule est prêt.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'depot_domicile',
        keywords: ['déposer', 'récupérer', 'domicile', 'chez moi', 'venir chercher', 'livraison voiture', 'récupération domicile'],
        answer: `🚗 Oui, il est possible que nous déposions ou récupérions votre véhicule à domicile.\n\nCette option est disponible dans un rayon de 10 km autour du garage, selon nos disponibilités.\n\nContactez-nous pour organiser cela : 📞 ${AMELIE_CONTACT.phone}`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'vehicule_pret',
        keywords: ['véhicule de prêt', 'voiture de remplacement', 'prêt voiture', 'véhicule courtoisie', 'sans voiture', 'comment faire sans'],
        answer: `🚗 Nous pouvons mettre un véhicule à disposition selon nos disponibilités.\n\nN'hésitez pas à en faire la demande lors de votre prise de rendez-vous.\n\nIl est également possible que nous déposions ou récupérions votre véhicule à domicile (rayon 10 km).`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'rappel_rdv',
        keywords: ['rappel', 'confirmation rdv', 'rappel rendez', 'sms', 'email confirmation', 'confirmer rdv'],
        answer: `📧 Oui, vous recevrez une confirmation par email après votre prise de rendez-vous.\n\nNous vous prévenons également par email dès que votre véhicule est prêt.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'deplacement',
        keywords: ['déplacement', 'venir chez', 'à domicile', 'rayon', '10 km', 'kilomètre', 'intervention extérieure'],
        answer: `📍 Oui, nous pouvons nous déplacer dans un rayon de 10 km autour de Jarnac-Champagne pour certaines interventions.\n\nContactez-nous pour vérifier les possibilités selon votre situation :\n📞 ${AMELIE_CONTACT.phone}\n✉️ ${AMELIE_CONTACT.email}`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'pro_flotte',
        keywords: ['professionnel', 'flotte', 'entreprise', 'société', 'véhicules entreprise', 'contrat pro', 'artisan', 'commerçant'],
        answer: `💼 Oui, nous proposons des tarifs spéciaux pour les professionnels et les flottes de véhicules.\n\nQue vous soyez artisan, commerçant, TPE ou PME, contactez-nous pour discuter d'un accord adapté :\n📞 ${AMELIE_CONTACT.phone}\n✉️ ${AMELIE_CONTACT.email}`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'urgence',
        keywords: ['urgence', 'en panne', 'panne', 'bloqué', 'immobilisé', 'secours', 'sos', 'aide', 'dépannage'],
        answer: `🚨 Urgence\n\nEn cas d'urgence, appelez-nous directement, même en dehors des horaires :\n\n📞 ${AMELIE_CONTACT.phone}\n\nNous intervenons généralement dans un délai de 4 heures.\n\n⚠️ Nous ne faisons pas de dépannage sur route. Pour un dépannage routier, contactez votre assistance.`,
        quickReplies: ['Appeler maintenant', 'Autre question']
    },
    {
        id: 'garanties',
        keywords: ['garantie', 'garanti', 'qualité', 'certifié', 'expérience', 'professionnel', 'confiance', 'qualification', 'formation'],
        answer: `🏆 Nos garanties et certifications :\n\n• Technicien Volkswagen agréé\n• Technicien Skoda agréé\n• Tech-Agent Renault\n• Ouvert depuis 2024\n• Mécanicien indépendant, seul garant de votre satisfaction\n\n✅ Devis gratuit avant toute intervention\n✅ Travail sur devis accepté\n✅ Facture détaillée fournie\n✅ Rapport d'intervention à la demande`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'attente',
        keywords: ['salle d\'attente', 'attendre', 'café', 'wifi', 'internet', 'pendant que voiture'],
        answer: `ℹ️ Nous n'avons pas encore de salle d'attente ni de Wi-Fi disponible sur place.\n\nSi votre intervention est longue, nous pouvons vous déposer à proximité ou vous prévenir par email quand votre véhicule est prêt.\n\nLa possibilité de récupérer votre véhicule à domicile (rayon 10 km) est aussi disponible.`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'fidelite',
        keywords: ['fidélité', 'promotion', 'promo', 'réduction', 'remise', 'offre', 'parrainage', 'avantage', 'récompense'],
        answer: `🎁 Nos avantages fidélité :\n\n• -10% sur votre 1ère vidange\n• Parrainage : -15% pour votre filleul, -10% pour vous\n• Dès la 3ème visite : tarifs préférentiels\n• Diagnostic offert une fois par an pour les clients réguliers\n• Diagnostic gratuit pour toute réparation > 200€\n\nSouhaitez-vous en profiter ?`,
        quickReplies: ['Prendre RDV', 'Autre question']
    },
    {
        id: 'rdv_confirm',
        keywords: ['rendez-vous', 'rdv', 'réserver', 'prendre rdv', 'appointment', 'disponible', 'prendre un rendez'],
        answer: null
    }
];

// Étapes du flux de prise de rendez-vous
const RDV_STEPS = [
    { field: 'prenom',          label: 'Prénom',            question: 'Quel est votre prénom ?' },
    { field: 'nom',             label: 'Nom',               question: 'Quel est votre nom de famille ?' },
    { field: 'telephone',       label: 'Téléphone',         question: 'Votre numéro de téléphone ?' },
    { field: 'email',           label: 'Email',             question: 'Votre adresse email ?\n(Tapez "-" pour passer)' },
    { field: 'adresse',         label: 'Adresse postale',   question: 'Votre adresse postale complète ?' },
    { field: 'immatriculation', label: 'Immatriculation',   question: 'L\'immatriculation de votre véhicule ?\n(ex: AB-123-CD)' },
    { field: 'service',         label: 'Intervention',      question: 'Quel type d\'intervention souhaitez-vous ?\n(ex: vidange, freins, diagnostic, distribution...)' },
    { field: 'disponibilite',   label: 'Disponibilités',    question: 'Quelles sont vos disponibilités ?\n(ex: demain matin, cette semaine, après 10h...)' }
];

// État interne d'Amélie
let amelie = {
    open: false,
    mode: null,
    rdvStep: 0,
    rdvData: {}
};

// ---- Utilitaires ----
function normalizeText(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ');
}

function findKBMatch(text) {
    const norm = normalizeText(text);
    for (const entry of AMELIE_KB) {
        for (const kw of entry.keywords) {
            if (norm.includes(normalizeText(kw))) {
                return entry;
            }
        }
    }
    return null;
}

function isRdvRequest(text) {
    const norm = normalizeText(text);
    const rdvKw = ['rendez-vous', 'rdv', 'reserver', 'reservation', 'prendre rdv',
                   'prendre un rdv', 'prendre rendez', 'appointment', 'prendre un rendez'];
    return rdvKw.some(kw => norm.includes(normalizeText(kw)));
}

// ---- Affichage ----
function amelieAddMessage(text, sender) {
    const messages = document.getElementById('amelieMessages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = 'amelie-msg amelie-msg-' + sender;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function amelieShowQuickReplies(replies) {
    const container = document.getElementById('amelieQuickReplies');
    if (!container) return;
    container.innerHTML = '';
    replies.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'amelie-quick-btn';
        btn.textContent = r;
        btn.addEventListener('click', () => amelieHandleQuickReply(r));
        container.appendChild(btn);
    });
}

function amelieClearQuickReplies() {
    const container = document.getElementById('amelieQuickReplies');
    if (container) container.innerHTML = '';
}

function amelieTypingIndicator(show) {
    const el = document.getElementById('amelieTyping');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function amelieReply(text, quickReplies, delay) {
    delay = delay || 700;
    amelieTypingIndicator(true);
    setTimeout(() => {
        amelieTypingIndicator(false);
        amelieAddMessage(text, 'bot');
        if (quickReplies && quickReplies.length) {
            amelieShowQuickReplies(quickReplies);
        } else {
            amelieClearQuickReplies();
        }
    }, delay);
}

// ---- Logique principale ----
function amelieProcessInput(userText) {
    userText = userText.trim();
    if (!userText) return;
    amelieAddMessage(userText, 'user');
    amelieClearQuickReplies();
    document.getElementById('amelieInput').value = '';

    if (amelie.mode === 'rdv') {
        amelieRdvStep(userText);
        return;
    }

    if (isRdvRequest(userText)) {
        amelieStartRdv();
        return;
    }

    const match = findKBMatch(userText);
    if (match) {
        if (match.id === 'rdv_confirm') {
            amelieStartRdv();
        } else {
            amelieReply(match.answer, match.quickReplies);
        }
        return;
    }

    const normText = normalizeText(userText);
    const greetings = ['bonjour', 'bonsoir', 'salut', 'hello', 'coucou', 'hey', 'bonne journee'];
    if (greetings.some(g => normText.includes(g))) {
        amelieReply(
            'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
            ['Prendre RDV', 'Horaires', 'Nos services', 'Tarifs & Devis']
        );
        return;
    }

    const goodbyes = ['merci', 'au revoir', 'bye', 'a bientot', 'bonne journee', 'ok merci', 'super merci', 'parfait'];
    if (goodbyes.some(g => normText.includes(g))) {
        amelieReply(
            'Avec plaisir ! N\'hésitez pas à revenir si vous avez d\'autres questions. À bientôt chez Mécanique 17 ! 😊',
            []
        );
        return;
    }

    amelieReply(
        'Je n\'ai pas bien compris votre demande. Pour toute question, vous pouvez :\n\n📞 Appeler le ' + AMELIE_CONTACT.phone + '\n✉️ Écrire à ' + AMELIE_CONTACT.email + '\n\nOu choisissez un sujet ci-dessous :',
        ['Prendre RDV', 'Horaires', 'Nos services', 'Tarifs & Devis']
    );
}

function amelieHandleQuickReply(reply) {
    amelieAddMessage(reply, 'user');
    amelieClearQuickReplies();

    if (amelie.mode === 'rdv') {
        amelieRdvStep(reply);
        return;
    }

    const r = normalizeText(reply);

    if (r.includes('rdv') || r.includes('rendez') || r.includes('reserver')) {
        amelieStartRdv();
    } else if (r.includes('horaire')) {
        const kb = AMELIE_KB.find(e => e.id === 'horaires');
        amelieReply(kb.answer, kb.quickReplies);
    } else if (r.includes('service')) {
        amelieReply(
            'Voici nos principaux services :\n\n🔧 Vidange & entretien complet\n🔧 Freinage\n🔧 Courroie de distribution (4h)\n🔧 Embrayage\n🔧 Suspension & amortisseurs\n🔧 Pneumatiques\n🔧 Diagnostic électronique\n🔧 Climatisation\n🔧 Pré-contrôle technique\n🔧 Batterie & démarreur\n🔧 Bougies, filtres\n\nToutes marques · Diesel, essence, hybride · Utilitaires et camping-cars\n\nSur quelle intervention puis-je vous renseigner ?',
            ['Prendre RDV', 'Tarifs & Devis', 'Autre question']
        );
    } else if (r.includes('tarif') || r.includes('devis') || r.includes('prix')) {
        const kb = AMELIE_KB.find(e => e.id === 'devis');
        amelieReply(kb.answer, kb.quickReplies);
    } else if (r.includes('appeler')) {
        amelieReply(
            '📞 Appelez-nous au ' + AMELIE_CONTACT.phone + '\n\nDisponible :\nLun-Ven : 8h00 – 18h00\nSam : 8h00 – 12h00\n\nCe numéro est aussi disponible pour les urgences en dehors des horaires.',
            ['Prendre RDV', 'Autre question']
        );
    } else if (r.includes('autre') || r.includes('fermer')) {
        if (r.includes('fermer')) {
            toggleAmelie();
        } else {
            amelieReply(
                'D\'accord ! Sur quel sujet puis-je vous aider ?',
                ['Prendre RDV', 'Horaires', 'Nos services', 'Tarifs & Devis', 'Urgence / Panne']
            );
        }
    } else if (r.includes('urgence') || r.includes('panne')) {
        const kb = AMELIE_KB.find(e => e.id === 'urgence');
        amelieReply(kb.answer, kb.quickReplies);
    } else {
        amelieProcessInput(reply);
    }
}

// ---- Flux RDV ----
function amelieStartRdv() {
    amelie.mode = 'rdv';
    amelie.rdvStep = 0;
    amelie.rdvData = {};
    amelieReply(
        'Parfait ! Je vais prendre vos informations pour votre demande de rendez-vous. C\'est simple et rapide 😊\n\n' + RDV_STEPS[0].question,
        []
    );
}

function amelieRdvStep(value) {
    const step = RDV_STEPS[amelie.rdvStep];

    if (step.field === 'telephone') {
        const cleaned = value.replace(/[\s.\-]/g, '');
        if (!/^(\+33|0)[0-9]{9}$/.test(cleaned) && cleaned.length < 8) {
            amelieReply('Ce numéro ne semble pas valide. Pouvez-vous le ressaisir ?\n(ex: 06 12 34 56 78)', []);
            return;
        }
    }

    if (step.field === 'email' && value !== '-') {
        if (!value.includes('@') && value.toLowerCase() !== 'non') {
            amelieReply('Cette adresse email ne semble pas valide. Pouvez-vous la ressaisir ?\n(Tapez "-" pour passer cette étape)', []);
            return;
        }
    }

    amelie.rdvData[step.field] = value;
    amelie.rdvStep++;

    if (amelie.rdvStep < RDV_STEPS.length) {
        amelieReply(RDV_STEPS[amelie.rdvStep].question, []);
    } else {
        amelieRdvFinalize();
    }
}

function amelieRdvFinalize() {
    amelie.mode = null;
    const d = amelie.rdvData;

    const recap =
        `✅ Voici le récapitulatif de votre demande :\n\n` +
        `👤 ${d.prenom} ${d.nom}\n` +
        `📞 ${d.telephone}\n` +
        `✉️ ${d.email && d.email !== '-' ? d.email : 'Non renseigné'}\n` +
        `📍 ${d.adresse || 'Non renseignée'}\n` +
        `🚗 ${d.immatriculation}\n` +
        `🔧 ${d.service}\n` +
        `📅 ${d.disponibilite}\n\n` +
        `Votre demande est bien enregistrée ! Nous vous recontactons très prochainement pour confirmer votre RDV. 😊\n\n` +
        `En cas d'urgence : 📞 ${AMELIE_CONTACT.phone}`;

    amelieSendRdvEmail(d);
    amelieReply(recap, ['Autre question', 'Fermer']);
}

function amelieSendRdvEmail(data) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/mecanique17@gmail.com';
    form.target = '_blank';
    form.style.display = 'none';

    const fields = {
        '_subject': 'Nouvelle demande RDV via Amélie',
        '_captcha': 'false',
        '_template': 'table',
        'Prénom': data.prenom,
        'Nom': data.nom,
        'Téléphone': data.telephone,
        'Email': data.email && data.email !== '-' ? data.email : '',
        'Adresse': data.adresse || '',
        'Immatriculation': data.immatriculation,
        'Service souhaité': data.service,
        'Disponibilités': data.disponibilite,
        'Source': 'Assistante virtuelle Amélie'
    };

    Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value || '';
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => { if (form.parentNode) form.parentNode.removeChild(form); }, 3000);
}

// ---- Toggle ----
function toggleAmelie() {
    const win = document.getElementById('amelieWindow');
    const bubble = document.getElementById('amelieBubble');
    if (!win) return;
    amelie.open = !amelie.open;

    if (amelie.open) {
        win.classList.add('open');
        if (bubble) bubble.classList.add('hidden');
        document.getElementById('amelieInput')?.focus();
        if (!amelie.welcomed) {
            amelie.welcomed = true;
            setTimeout(() => {
                amelieReply(
                    'Bonjour ! Je suis Amélie, votre assistante du garage Mécanique 17. Comment puis-je vous aider ? 😊',
                    ['Prendre RDV', 'Horaires', 'Nos services', 'Tarifs & Devis'],
                    400
                );
            }, 200);
        }
    } else {
        win.classList.remove('open');
        if (bubble) bubble.classList.remove('hidden');
    }
}

// ---- Événements ----
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('amelieInput');
    const sendBtn = document.getElementById('amelieSend');

    input?.addEventListener('keydown', e => {
        if (e.key === 'Enter') amelieProcessInput(input.value);
    });

    sendBtn?.addEventListener('click', () => {
        const input = document.getElementById('amelieInput');
        if (input) amelieProcessInput(input.value);
    });

    document.getElementById('amelieBubble')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') toggleAmelie();
    });
});
