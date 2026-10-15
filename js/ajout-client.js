/* Formulaire "Devenir client" - MECANIQUE 17
 *
 * CONFIDENTIALITE : ce script n'utilise QUE la cle publique (anon) de Supabase.
 * Cette cle ne donne qu'un droit : AJOUTER une ligne dans la table
 * "demandes_clients" (regle RLS "insert seul"). Elle ne permet ni de lire,
 * ni de modifier, ni de supprimer quoi que ce soit : personne ne peut relire
 * les demandes depuis le site. Seul le proprietaire les consulte, depuis son
 * logiciel, avec la cle secrete qui n'est JAMAIS mise sur le site.
 *
 * A REMPLIR apres avoir cree le projet Supabase (Project Settings > API) :
 */
var SUPABASE_URL = 'https://qhprtrirebpchbdxfrng.supabase.co';
var SUPABASE_CLE_PUBLIQUE = 'sb_publishable_89d7a8lRSqM0nsC_PkSn-w_uVAwltpc';

(function () {
    'use strict';

    var LIMITES = {
        nom: 120, telephone: 30, email: 160, adresse: 200, code_postal: 10,
        ville: 80, immatriculation: 20, marque: 60, modele: 80,
        kilometrage: 12, message: 1000, prestation: 120
    };

    var form = document.getElementById('clientForm');
    var statut = document.getElementById('formStatut');
    var bouton = document.getElementById('btnEnvoyer');
    if (!form) { return; }

    var configure = SUPABASE_URL.indexOf('https://') === 0 &&
        SUPABASE_URL.indexOf('VOTRE') === -1 &&
        SUPABASE_CLE_PUBLIQUE.indexOf('VOTRE') === -1;

    function typeDemande() {
        if (document.getElementById('type_devis').checked) { return 'devis'; }
        if (document.getElementById('type_rdv').checked) { return 'rdv'; }
        return 'client';
    }

    // Date minimale : demain
    var demain = new Date(); demain.setDate(demain.getDate() + 1);
    document.getElementById('date_rdv').min = demain.toISOString().slice(0, 10);

    function majType() {
        var t = typeDemande();
        document.getElementById('blocPrestation').style.display = t === 'client' ? 'none' : '';
        document.getElementById('blocDate').style.display = t === 'rdv' ? '' : 'none';
        document.getElementById('blocCreneau').style.display = t === 'rdv' ? '' : 'none';
        document.getElementById('titrePage').innerHTML = t === 'devis' ? 'Demander un <span>devis</span>' :
            (t === 'rdv' ? 'Prendre <span>rendez-vous</span>' : 'Devenir <span>client</span>');
        document.getElementById('sousTitrePage').textContent = t === 'devis' ?
            'Dites-nous ce dont vous avez besoin : nous vous envoyons un devis d\u00e9taill\u00e9.' :
            (t === 'rdv' ? 'Choisissez une date : nous vous rappelons pour confirmer le rendez-vous.' :
            'Enregistrez vos coordonn\u00e9es et votre v\u00e9hicule : nous vous recontactons.');
    }
    ['type_devis', 'type_rdv', 'type_client'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', majType);
    });
    if (/[?&]type=client(&|$)/.test(location.search)) {
        document.getElementById('type_client').checked = true;
    }
    if (/[?&]type=rdv(&|$)/.test(location.search)) {
        document.getElementById('type_rdv').checked = true;
    }
    majType();

    function afficher(message, ok) {
        statut.textContent = message;          // textContent : jamais d'HTML injecte
        statut.className = 'form-statut ' + (ok ? 'ok' : 'erreur');
        statut.style.display = 'block';
    }

    function valeur(id) {
        var el = document.getElementById(id);
        var v = el ? el.value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : '';
        return LIMITES[id] ? v.slice(0, LIMITES[id]) : v;
    }

    function construireDemande() {
        var d = {};
        Object.keys(LIMITES).forEach(function (cle) { d[cle] = valeur(cle) || null; });
        d.immatriculation = d.immatriculation ? d.immatriculation.toUpperCase() : null;
        d.accepte_marketing = document.getElementById('accepte_marketing').checked;
        d.consentement = document.getElementById('consentement').checked;
        d.type_demande = typeDemande();
        if (d.type_demande === 'client') { d.prestation = null; }
        if (d.type_demande === 'rdv') {
            var iso = document.getElementById('date_rdv').value;          // AAAA-MM-JJ
            d.date_souhaitee = /^\d{4}-\d{2}-\d{2}$/.test(iso) ?
                iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : null;
            d.creneau = document.getElementById('creneau').value || null;
        }
        return d;
    }

    function erreurValidation(d) {
        if (!d.nom || d.nom.length < 2) { return 'Merci d\u2019indiquer votre nom.'; }
        if (!d.telephone && !d.email) {
            return 'Merci d\u2019indiquer un num\u00e9ro de t\u00e9l\u00e9phone ou un email.';
        }
        if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
            return 'L\u2019adresse email semble incorrecte.';
        }
        if (d.telephone && d.telephone.replace(/\D/g, '').length < 8) {
            return 'Le num\u00e9ro de t\u00e9l\u00e9phone semble incorrect.';
        }
        if (d.type_demande === 'rdv') {
            if (!d.date_souhaitee) { return 'Merci de choisir la date souhait\u00e9e.'; }
            var p = d.date_souhaitee.split('/');
            var jour = new Date(+p[2], +p[1] - 1, +p[0]);
            if (jour <= new Date()) { return 'Merci de choisir une date \u00e0 partir de demain.'; }
            if (jour.getDay() === 0) { return 'Le garage est ferm\u00e9 le dimanche : choisissez un autre jour.'; }
            if (!d.creneau) { return 'Merci de choisir un cr\u00e9neau (matin ou apr\u00e8s-midi).'; }
        }
        if (d.type_demande === 'devis' && !d.prestation && !d.message) {
            return 'Merci de choisir une prestation ou de d\u00e9crire votre besoin.';
        }
        if (!d.consentement) {
            return 'Merci de cocher la case d\u2019accord pour l\u2019enregistrement de vos coordonn\u00e9es.';
        }
        return null;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        statut.style.display = 'none';

        // Champ pi\u00e8ge anti-robots : invisible pour un humain.
        if (document.getElementById('site_web').value) {
            afficher('Merci ! Votre demande a bien \u00e9t\u00e9 envoy\u00e9e.', true);
            return;
        }
        if (!configure) {
            afficher('Ce formulaire n\u2019est pas encore activ\u00e9. Merci de nous appeler ' +
                     'au 06 51 55 00 01.', false);
            return;
        }

        var demande = construireDemande();
        var probleme = erreurValidation(demande);
        if (probleme) { afficher(probleme, false); return; }

        bouton.disabled = true;
        bouton.textContent = 'Envoi en cours...';

        fetch(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/demandes_clients', {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_CLE_PUBLIQUE,
                'Authorization': 'Bearer ' + SUPABASE_CLE_PUBLIQUE,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'      // ne renvoie rien (lecture interdite)
            },
            body: JSON.stringify(demande)
        }).then(function (reponse) {
            if (!reponse.ok) { throw new Error('HTTP ' + reponse.status); }
            form.reset();
            afficher('Merci ! Votre demande a bien \u00e9t\u00e9 envoy\u00e9e. ' +
                     'Nous vous recontactons rapidement.', true);
        }).catch(function () {
            afficher('Un probl\u00e8me est survenu. Merci de r\u00e9essayer ou de nous appeler ' +
                     'au 06 51 55 00 01.', false);
        }).then(function () {
            bouton.disabled = false;
            bouton.textContent = 'Envoyer ma demande';
        });
    });
}());
