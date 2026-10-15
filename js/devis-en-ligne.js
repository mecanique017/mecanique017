/* Devis a consulter et signer en ligne - MECANIQUE 17
 *
 * CONFIDENTIALITE : ce script n'utilise QUE la cle publique (anon) de Supabase,
 * qui ne permet d'appeler que deux fonctions : lire LE devis correspondant au
 * jeton secret du lien, et y repondre UNE seule fois. Aucune liste, aucun autre
 * devis n'est accessible. Toutes les donnees sont affichees avec textContent
 * (jamais interpretees comme du HTML).
 *
 * A REMPLIR apres avoir cree le projet Supabase (memes valeurs que js/ajout-client.js) :
 */
var SUPABASE_URL = 'https://qhprtrirebpchbdxfrng.supabase.co';
var SUPABASE_CLE_PUBLIQUE = 'sb_publishable_89d7a8lRSqM0nsC_PkSn-w_uVAwltpc';

(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var jeton = (new URLSearchParams(location.search).get('t') || '').trim();
    var configure = SUPABASE_URL.indexOf('https://') === 0 && SUPABASE_URL.indexOf('VOTRE') === -1 &&
        SUPABASE_CLE_PUBLIQUE.indexOf('VOTRE') === -1;
    var aSigne = false;

    function eur(x) {
        return (Number(x) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }
    function texte(el, t) { el.textContent = t == null ? '' : String(t); return el; }
    function statut(msg, ok) { var s = $('statut'); s.textContent = msg; s.className = 'statut ' + (ok ? 'ok' : 'erreur'); }
    function introuvable() { $('chargement').style.display = 'none'; $('introuvable').style.display = 'block'; }

    function rpc(nom, params) {
        return fetch(SUPABASE_URL + '/rest/v1/rpc/' + nom, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_CLE_PUBLIQUE, 'Authorization': 'Bearer ' + SUPABASE_CLE_PUBLIQUE,
                       'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        }).then(function (r) {
            if (!r.ok) { throw new Error('HTTP ' + r.status); }
            return r.json();
        });
    }

    function afficher(d) {
        var c = d.contenu, g = c.garage || {}, dv = c.devis || {};
        texte($('titre'), 'Devis n° ' + dv.numero);
        texte($('garage'), [g.nom, g.dirigeant ? g.dirigeant + ' - Entrepreneur individuel (EI)' : 'Entrepreneur individuel (EI)',
            [g.adresse, g.code_postal, g.ville].filter(Boolean).join(' '), 'SIRET ' + (g.siret || ''),
            g.telephone].filter(Boolean).join(' • '));
        var veh = c.vehicule ? [c.vehicule.marque, c.vehicule.modele, c.vehicule.immatriculation].filter(Boolean).join(' ') : '';
        texte($('pour'), 'Pour : ' + ((c.client && c.client.nom) || '') + (veh ? ' — ' + veh : '') +
            ' • émis le ' + (dv.date || '') + (dv.validite ? ' • valable jusqu’au ' + dv.validite : ''));
        var tb = $('lignes'), groupe = null;
        (c.lignes || []).forEach(function (l) {
            if (l.prestation && l.prestation !== groupe) {
                groupe = l.prestation;
                var tg = document.createElement('tr'); tg.className = 'groupe';
                var tdg = texte(document.createElement('td'), groupe); tdg.colSpan = 5; tg.appendChild(tdg); tb.appendChild(tg);
            }
            var tr = document.createElement('tr');
            var etat = { neuve: ' (pièce neuve)', occasion: ' (pièce d’occasion - PIEC)', echange_standard: ' (échange standard)' }[l.etat_piece] || '';
            var qte = l.type === 'main_oeuvre' ? (Number(l.quantite) || 0).toLocaleString('fr-FR') + ' h' : (Number(l.quantite) || 0).toLocaleString('fr-FR');
            [l.designation + etat, qte, eur(l.prix_unitaire), l.remise_pct ? l.remise_pct + ' %' : '-', eur(l.total)].forEach(function (v, i) {
                var td = texte(document.createElement('td'), v); if (i > 0) { td.className = 'n'; } tr.appendChild(td);
            });
            tb.appendChild(tr);
        });
        texte($('total'), 'Total : ' + eur(dv.total_ht));
        texte($('mentions'), (c.mentions || []).join(' — '));
        if (d.statut !== 'envoye') {
            $('zoneReponse').style.display = 'none';
            statut(d.statut === 'accepte' ? 'Ce devis a déjà été accepté. Merci !' : 'Ce devis a été refusé.', d.statut === 'accepte');
        }
        $('chargement').style.display = 'none';
        $('devis').style.display = 'block';
        preparerSignature();
    }

    // --- Zone de signature (souris, doigt, stylet) ---
    function preparerSignature() {
        var cv = $('zoneSignature'), ctx = cv.getContext('2d'), dessine = false, ratio = 1;
        // La zone prend la taille reelle affichee (x densite de l'ecran, pour une
        // signature nette sur telephone). Recalculee si la page change de taille
        // tant que rien n'est signe, et au premier contact si elle etait nulle.
        function ajuster() {
            var r = cv.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) { return false; }
            ratio = Math.min(window.devicePixelRatio || 1, 3);
            cv.width = Math.round(r.width * ratio); cv.height = Math.round(r.height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
            aSigne = false;
            return true;
        }
        ajuster();
        window.addEventListener('resize', function () { if (!aSigne) { ajuster(); } });
        function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
        cv.addEventListener('pointerdown', function (e) {
            if (cv.width < 10 * ratio || Math.abs(cv.width - cv.getBoundingClientRect().width * ratio) > 2) { ajuster(); }
            dessine = true; cv.setPointerCapture(e.pointerId); var p = pos(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]);
        });
        cv.addEventListener('pointermove', function (e) { if (!dessine) { return; } var p = pos(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); aSigne = true; });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { cv.addEventListener(ev, function () { dessine = false; }); });
        $('btnEffacer').addEventListener('click', function () {
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); aSigne = false;
        });
    }

    function repondre(decision) {
        var nom = $('nom').value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);
        var commentaire = $('commentaire').value.trim().slice(0, 1000);
        var signature = null;
        if (decision === 'accepte') {
            if (nom.length < 2) { statut('Merci d’indiquer votre nom et prénom.', false); return; }
            if (!aSigne) { statut('Merci de signer dans le cadre.', false); return; }
            if (!$('accord').checked) { statut('Merci de cocher la case « bon pour accord ».', false); return; }
            signature = $('zoneSignature').toDataURL('image/png');
        } else if (!window.confirm('Confirmer le refus de ce devis ?')) {
            return;
        }
        $('btnAccepter').disabled = $('btnRefuser').disabled = true;
        rpc('devis_repondre', { p_jeton: jeton, p_decision: decision, p_nom: nom, p_signature: signature,
                                p_commentaire: commentaire, p_navigateur: navigator.userAgent.slice(0, 300) })
            .then(function (res) {
                if (res === 'ok') {
                    $('zoneReponse').style.display = 'none';
                    statut(decision === 'accepte' ? 'Merci ! Votre accord a bien été enregistré. Le garage vous recontacte pour fixer le rendez-vous.'
                                                  : 'Votre réponse a bien été enregistrée.', true);
                } else {
                    statut('Ce devis a déjà reçu une réponse ou n’est plus valable.', false);
                }
            })
            .catch(function () {
                $('btnAccepter').disabled = $('btnRefuser').disabled = false;
                statut('Envoi impossible pour le moment. Réessayez ou appelez le 06 51 55 00 01.', false);
            });
    }

    $('btnAccepter').addEventListener('click', function () { repondre('accepte'); });
    $('btnRefuser').addEventListener('click', function () { repondre('refuse'); });

    if (!configure || !/^[0-9a-f-]{36}$/i.test(jeton)) { introuvable(); return; }
    rpc('devis_lire', { p_jeton: jeton })
        .then(function (d) { if (d && d.contenu) { afficher(d); } else { introuvable(); } })
        .catch(introuvable);
})();
