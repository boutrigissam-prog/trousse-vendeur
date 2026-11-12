// Fiche terrain : liste de fiches locale, validation, partage. Aucune requête réseau.
(function () {
  'use strict';
  var CLE_LISTE = 'fiche-terrain-liste';      // tableau de fiches
  var CLE_COURANTE = 'fiche-terrain-courante'; // id de la fiche ouverte
  var CLE_ANCIEN = 'fiche-terrain-brouillon';  // ancien brouillon unique (repris une fois)
  var MSG_BLOQUE = 'Ce téléphone bloque l\'enregistrement : envoie la fiche avant de quitter la page';
  // Source unique des familles et métiers (le guide affiche les mêmes).
  var AUTRE = 'Autre (préciser)';
  var METIERS = {
    "Auto": [
      "Garage / mécanique",
      "Carrosserie",
      "Pneus",
      "Esthétique auto / lave-auto",
      "Vitres d'auto"
    ],
    "Beauté": [
      "Coiffeur",
      "Barbier",
      "Esthétique",
      "Ongles",
      "Spa",
      "Tatouage",
      "Maquillage"
    ],
    "Restauration": [
      "Restaurant",
      "Café",
      "Bistro",
      "Bar",
      "Traiteur",
      "Boulangerie-café"
    ],
    "Santé et bien-être": [
      "Physiothérapie",
      "Chiropratique",
      "Ostéopathie",
      "Massothérapie",
      "Dentiste",
      "Optométriste",
      "Clinique vétérinaire"
    ],
    "Services à domicile": [
      "Plombier",
      "Électricien",
      "Rénovation",
      "Peintre",
      "Nettoyage",
      "Déménagement",
      "Paysagiste / déneigement",
      "Serrurier",
      "Extermination"
    ],
    "Cours et studios": [
      "Yoga",
      "Pilates",
      "Boxe / gym",
      "Danse",
      "École de conduite",
      "Cours de musique",
      "Tutorat"
    ],
    "Services de proximité": [
      "Cordonnerie",
      "Retouches / couture",
      "Nettoyeur",
      "Réparation téléphones / ordinateurs",
      "Toilettage",
      "Photographe",
      "Imprimerie"
    ]
  };
  var JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var form = document.getElementById('fiche');
  var elServices = document.getElementById('services');
  var elStatut = document.getElementById('statut');

  // ---------- stockage (peut être bloqué) ----------
  function lireCle(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ecrireCle(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function effacerCle(k) { try { localStorage.removeItem(k); } catch (e) { /* idem */ } }

  // ---------- famille / métier ----------
  var selFam = document.getElementById('famille'), selMet = document.getElementById('metier');
  function option(v, t) { var o = document.createElement('option'); o.value = v; o.textContent = t || v; return o; }
  function remplirFamilles() {
    Object.keys(METIERS).concat(AUTRE).forEach(function (f) { selFam.appendChild(option(f)); });
  }
  function majMetiers() {
    var f = selFam.value, liste = METIERS[f] || [];
    selMet.innerHTML = '';
    selMet.appendChild(option('', f && f !== AUTRE ? 'Choisir…' : "Choisis d'abord une famille"));
    liste.concat(liste.length ? AUTRE : []).forEach(function (m) { selMet.appendChild(option(m)); });
    document.getElementById('bloc-metier').hidden = f === AUTRE;
    majAutres();
  }
  function majAutres() {
    document.getElementById('famille_autre').hidden = selFam.value !== AUTRE;
    document.getElementById('metier_autre').hidden = selMet.value !== AUTRE || selFam.value === AUTRE;
  }

  // ---------- lignes dynamiques ----------
  function ligneService(s) {
    s = s || {};
    var d = document.createElement('div');
    d.className = 'ligne-service';
    d.innerHTML =
      '<input type="text" class="nom" data-k="nom" aria-label="Nom du service" placeholder="Nom du service">' +
      '<input type="text" data-k="prix" aria-label="Prix à partir de" placeholder="À partir de (prix)" inputmode="decimal">' +
      '<input type="text" data-k="duree" aria-label="Durée" placeholder="Durée">' +
      '<button type="button" class="btn danger" data-retirer>Supprimer ce service</button>';
    d.querySelectorAll('[data-k]').forEach(function (i) { i.value = s[i.dataset.k] || ''; });
    elServices.appendChild(d);
  }
  function lireServices() {
    return Array.prototype.map.call(elServices.children, function (d) {
      var o = {};
      d.querySelectorAll('[data-k]').forEach(function (i) { o[i.dataset.k] = i.value.trim(); });
      return o;
    });
  }
  function construireHoraires() {
    var h = document.getElementById('horaires');
    h.innerHTML = JOURS.map(function (j, i) {
      return '<div class="jour"><b>' + j + '</b>' +
        '<div><label for="ho' + i + '">Ouverture</label><input type="time" id="ho' + i + '" name="ouv' + i + '"></div>' +
        '<div><label for="hf' + i + '">Fermeture</label><input type="time" id="hf' + i + '" name="fer' + i + '"></div>' +
        '<label class="ferme"><input type="checkbox" name="ferme' + i + '" value="oui"> Fermé</label></div>';
    }).join('');
  }

  // ---------- état du formulaire ----------
  function etat() {
    var e = { champs: {}, services: lireServices() };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') { if (el.checked) (e.champs[el.name] = e.champs[el.name] || []).push(el.value); }
      else if (el.type === 'radio') { if (el.checked) e.champs[el.name] = el.value; }
      else e.champs[el.name] = el.value.trim();
    });
    return e;
  }
  function appliquer(e) {
    form.reset();
    selFam.value = e.champs.famille || '';
    majMetiers();
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in e.champs)) return;
      var v = e.champs[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.indexOf(el.value) >= 0;
      else if (el.type === 'radio') el.checked = v === el.value;
      else el.value = v;
    });
    majAutres();
    elServices.innerHTML = '';
    (e.services && e.services.length ? e.services : [{}, {}, {}]).forEach(ligneService);
  }

  // ---------- texte à partager ----------
  function liste(v) { return Array.isArray(v) ? v.join(', ') : (v || ''); }
  function construire(e) {
    var c = e.champs, jours = [], services = [], famAutre = c.famille === AUTRE;
    if (famAutre) c.famille = c.famille_autre || AUTRE;
    c.metier = famAutre ? '' : (c.metier === AUTRE ? (c.metier_autre || AUTRE) : c.metier);
    JOURS.forEach(function (j, i) {
      var txt = c['ferme' + i] ? 'fermé' : (c['ouv' + i] || c['fer' + i] ? (c['ouv' + i] || '?') + ' – ' + (c['fer' + i] || '?') : '');
      if (txt) jours.push(j + ' : ' + txt);
    });
    e.services.forEach(function (s) {
      if (!s.nom && !s.prix && !s.duree) return;
      services.push(s.nom + (s.prix ? ' · à partir de ' + s.prix : '') + (s.duree ? ' · ' + s.duree : ''));
    });
    var langues = (c.langue || []).slice();
    if (c.langue_autre) langues.push(c.langue_autre);
    var avis = c.note || c.nb_avis ? (c.note ? c.note + '/5' : '') + (c.nb_avis ? ' (' + c.nb_avis + ' avis)' : '') : '';
    var sections = [
      ['1. Commerce', [['Nom', c.nom], ['Famille', c.famille], ['Métier', c.metier], ['Adresse', c.adresse], ['Quartier', c.quartier], ['Téléphone', c.tel], ['Courriel', c.courriel], ['Site', c.site], ['Facebook', c.facebook], ['Instagram', c.instagram], ['Fiche Google', c.google], ['Langues', langues.join(', ')]]],
      ['2. Responsable', [['Nom', c.resp_nom], ['Rôle', c.resp_role], ['Courriel', c.resp_courriel], ['Cellulaire', c.resp_cell]]],
      ['3. Services', services.map(function (s) { return ['', s]; })],
      ['4. Horaires', jours.map(function (j) { return ['', j]; })],
      ['5. Avis Google', [['Note', avis]]],
      ['6. Ce qu\'il veut', [['Forfait', c.forfait], ['Contenu mensuel', c.contenu_mensuel], ['Options', liste(c.option)], ['Haut de page', c.haut], ['Intérêt', c.interet]]],
      ['7. Prix', [['Prix de départ estimé', c.prix_depart ? c.prix_depart + ' $' : ''], ['Prix par mois estimé', c.prix_mois ? c.prix_mois + ' $' : ''], ['Budget évoqué', c.budget], ['Réaction au prix', c.reaction_prix]]],
      ['8. Matériel', [['Logo', c.logo], ['Photos', c.photos], ['Vidéo', c.video], ['Lien photos et vidéos', c.lien_medias]]],
      ['9. Notes', [['Notes', c.notes], ['CE QUI MANQUE', c.ce_qui_manque], ['Accepte d\'être recontacté', c.recontact ? 'oui' : '']]]
    ];
    var out = ['FICHE TERRAIN · ' + (c.nom || 'Sans nom') + ' · ' + aujourdhui(), 'Code dossier : ' + codeDossier(c.nom)];
    sections.forEach(function (s) {
      var lignes = s[1].filter(function (p) { return p[1]; }).map(function (p) { return p[0] ? p[0] + ' : ' + p[1] : '- ' + p[1]; });
      if (lignes.length) out.push('', s[0].toUpperCase(), lignes.join('\n'));
    });
    var donnees = {
      'Date': aujourdhui(),
      'Code dossier': codeDossier(c.nom),
      'Commerce': { 'Nom': c.nom || '', 'Famille': c.famille || '', 'Métier': c.metier || '', 'Adresse': c.adresse || '', 'Quartier': c.quartier || '', 'Téléphone': c.tel || '', 'Courriel': c.courriel || '', 'Site': c.site || '', 'Facebook': c.facebook || '', 'Instagram': c.instagram || '', 'Fiche Google': c.google || '', 'Langues': langues },
      'Responsable': { 'Nom': c.resp_nom || '', 'Rôle': c.resp_role || '', 'Courriel': c.resp_courriel || '', 'Cellulaire': c.resp_cell || '' },
      'Services': e.services.filter(function (s) { return s.nom || s.prix || s.duree; }).map(function (s) { return { 'Nom': s.nom, 'À partir de': s.prix, 'Durée': s.duree }; }),
      'Horaires': JOURS.map(function (j, i) { return { 'Jour': j, 'Ouverture': c['ouv' + i] || '', 'Fermeture': c['fer' + i] || '', 'Fermé': !!c['ferme' + i] }; }),
      'Avis Google': { 'Note': c.note || '', 'Nombre d\'avis': c.nb_avis || '' },
      'Souhaits': { 'Forfait': c.forfait || '', 'Contenu mensuel': c.contenu_mensuel || '', 'Options': c.option || [], 'Haut de page': c.haut || '', 'Intérêt': c.interet || '' },
      'Prix': { 'Prix de départ estimé ($)': c.prix_depart || '', 'Prix par mois estimé ($)': c.prix_mois || '', 'Budget évoqué': c.budget || '', 'Réaction au prix': c.reaction_prix || '' },
      'Matériel': { 'Logo': c.logo || '', 'Photos': c.photos || '', 'Vidéo': c.video || '', 'Lien photos et vidéos': c.lien_medias || '' },
      'Notes': c.notes || '',
      'Ce qui manque': c.ce_qui_manque || '',
      'Accepte d\'être recontacté': !!c.recontact
    };
    return { titre: 'Fiche terrain · ' + (c.nom || 'Sans nom'), texte: out.join('\n') + '\n\n--- données ---\n' + JSON.stringify(donnees, null, 2), nom: c.nom || '' };
  }
  // Un seul nom de dossier par commerce, toujours le même : « Garage Matte » → « garage-matte ».
  function codeDossier(nom) {
    return (nom || 'sans-nom').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sans-nom';
  }
  function deuxCh(n) { return ('0' + n).slice(-2); }
  function maintenant() { var d = new Date(); return aujourdhui() + ' ' + deuxCh(d.getHours()) + ':' + deuxCh(d.getMinutes()); }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // ---------- validation ----------
  function valider() {
    var requis = [['nom', 'err-nom'], ['famille', 'err-famille'], ['tel', 'err-tel']], premier = null;
    requis.forEach(function (r) {
      var champ = document.getElementById(r[0]), err = document.getElementById(r[1]), vide = !champ.value.trim();
      err.hidden = !vide;
      champ.classList.toggle('invalide', vide);
      champ.setAttribute('aria-invalid', vide ? 'true' : 'false');
      if (vide) { champ.setAttribute('aria-describedby', r[1]); if (!premier) premier = champ; }
    });
    if (premier) { premier.focus(); premier.scrollIntoView({ block: 'center' }); message('Il manque des champs obligatoires.'); return false; }
    return true;
  }
  function message(t) { elStatut.textContent = t; }

  // ---------- actions ----------
  function copierTexte(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, ko) {
      var a = document.createElement('textarea');
      a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select();
      try { document.execCommand('copy') ? ok() : ko(new Error('copie refusée')); } catch (x) { ko(x); } finally { document.body.removeChild(a); }
    });
  }
  function copier(t, ok, fait) {
    copierTexte(t).then(function () { message(ok); if (fait) fait(); }, function () { message('Copie impossible : utilise « Télécharger ».'); });
  }
  function slug(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function telechargerTexte(texte, fichier) {
    var url = URL.createObjectURL(new Blob([texte], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = fichier;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- liste de fiches ----------
  var fiches = [], cour = null, elBarre = document.getElementById('fiche-en-cours'), elCompte = document.getElementById('mes-fiches');
  var elPanneau = document.getElementById('panneau'), elListe = document.getElementById('p-liste'), elPStatut = document.getElementById('p-statut');
  var elBloque = document.createElement('p');
  elBloque.className = 'erreur'; elBloque.hidden = true; elBloque.textContent = MSG_BLOQUE;
  elBarre.parentNode.parentNode.insertBefore(elBloque, elBarre.parentNode.nextSibling);

  function nouvelleFiche(e) {
    var t = maintenant();
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), creee: t, modifiee: t, envoyee: '', statut: 'brouillon', nom: '', code: codeDossier(''), etat: e || { champs: {}, services: [] } };
  }
  function persister() {
    var ok = ecrireCle(CLE_LISTE, JSON.stringify(fiches)) && ecrireCle(CLE_COURANTE, cour.id);
    elBloque.hidden = ok;
    return ok;
  }
  function statutTexte(f) {
    return f.statut === 'envoyee' ? 'Envoyée le ' + f.envoyee : f.statut === 'modifiee' ? 'Modifiée depuis l\'envoi' : 'Brouillon';
  }
  function majBarre() {
    elBarre.textContent = 'Fiche en cours : ' + (cour.nom || 'Nouvelle fiche');
    elCompte.textContent = 'Mes fiches (' + fiches.length + ')';
  }
  function ajouterSiAbsente() { if (fiches.indexOf(cour) < 0) fiches.push(cour); }
  function sauver() {
    var e = etat();
    cour.etat = e; cour.nom = e.champs.nom || ''; cour.code = codeDossier(cour.nom); cour.modifiee = maintenant();
    if (cour.statut === 'envoyee') cour.statut = 'modifiee';
    ajouterSiAbsente(); persister(); majBarre();
  }
  function marquerEnvoyee() {
    cour.statut = 'envoyee'; cour.envoyee = aujourdhui(); cour.modifiee = maintenant();
    ajouterSiAbsente(); persister(); majBarre();
  }
  function reinitialiserErreurs() {
    document.querySelectorAll('.erreur[id^="err-"]').forEach(function (e) { e.hidden = true; });
    document.querySelectorAll('.invalide').forEach(function (e) { e.classList.remove('invalide'); });
    message('');
  }
  function afficher(f) {
    cour = f; appliquer(f.etat); reinitialiserErreurs(); majBarre(); ecrireCle(CLE_COURANTE, f.id);
  }
  function ouvrir(f) { afficher(f); fermerPanneau(); window.scrollTo(0, 0); }
  function nouvelle() { afficher(nouvelleFiche()); fermerPanneau(); message('Nouvelle fiche prête.'); window.scrollTo(0, 0); }
  function recentes() {
    return fiches.slice().sort(function (a, b) { return a.modifiee < b.modifiee ? 1 : a.modifiee > b.modifiee ? -1 : (a.creee < b.creee ? 1 : -1); });
  }
  function supprimer(f) {
    if (!confirm('Supprimer la fiche de ' + (f.nom || 'Nouvelle fiche') + ' ? Elle sera perdue si elle n\'a pas été envoyée')) return;
    fiches.splice(fiches.indexOf(f), 1);
    if (f === cour) { var r = recentes(); afficher(r.length ? r[0] : nouvelleFiche()); }
    persister(); majBarre(); rendreListe();
  }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }
  function boutonLigne(txt, cls, fn) { var b = el('button', 'btn ' + cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function rendreListe() {
    elListe.innerHTML = '';
    if (!fiches.length) elListe.appendChild(el('p', 'aide', 'Aucune fiche enregistrée pour l\'instant.'));
    recentes().forEach(function (f) {
      var l = el('div', 'fiche-ligne' + (f === cour ? ' cour' : '')), b = el('div', 'boutons');
      l.appendChild(el('b', '', f.nom || 'Nouvelle fiche'));
      l.appendChild(el('small', '', 'Dossier : ' + f.code));
      l.appendChild(el('small', '', f.modifiee + ' · ' + statutTexte(f)));
      b.appendChild(boutonLigne('Ouvrir', '', function () { ouvrir(f); }));
      b.appendChild(boutonLigne('Supprimer', 'danger', function () { supprimer(f); }));
      l.appendChild(b); elListe.appendChild(l);
    });
  }
  function ouvrirPanneau() { rendreListe(); elPStatut.textContent = ''; elPanneau.hidden = false; elPanneau.scrollTop = 0; }
  function fermerPanneau() { elPanneau.hidden = true; }
  function toutTelecharger() {
    if (!fiches.length) { elPStatut.textContent = 'Aucune fiche à télécharger.'; return; }
    var texte = recentes().map(function (f) { return construire(f.etat).texte; }).join('\n\n==================== FICHE SUIVANTE ====================\n\n');
    telechargerTexte(texte, 'fiches-' + aujourdhui() + '.txt');
    elPStatut.textContent = fiches.length + ' fiche(s) téléchargée(s) dans un seul fichier.';
  }

  document.getElementById('partager').addEventListener('click', function () {
    if (!valider()) return;
    var f = construire(etat());
    if (navigator.share) {
      navigator.share({ title: f.titre, text: f.texte }).then(function () { marquerEnvoyee(); }, function (x) {
        if (x && x.name === 'AbortError') return;
        copier(f.texte, 'Partage impossible : la fiche a été copiée.', marquerEnvoyee);
      });
    } else copier(f.texte, 'Partage indisponible ici : la fiche a été copiée.', marquerEnvoyee);
  });
  document.getElementById('copier').addEventListener('click', function () {
    if (valider()) copier(construire(etat()).texte, 'Fiche copiée.', marquerEnvoyee);
  });
  document.getElementById('telecharger').addEventListener('click', function () {
    if (!valider()) return;
    var f = construire(etat());
    telechargerTexte(f.texte, 'fiche-' + (slug(f.nom) || 'commerce') + '-' + aujourdhui() + '.txt');
    message('Fichier téléchargé.'); marquerEnvoyee();
  });
  document.getElementById('nouvelle').addEventListener('click', nouvelle);
  document.getElementById('p-nouvelle').addEventListener('click', nouvelle);
  document.getElementById('p-tout').addEventListener('click', toutTelecharger);
  document.getElementById('p-fermer').addEventListener('click', fermerPanneau);
  elCompte.addEventListener('click', ouvrirPanneau);
  document.getElementById('ajout-service').addEventListener('click', function () {
    ligneService(); sauver();
    var i = elServices.lastElementChild.querySelector('input'); if (i) i.focus();
  });
  elServices.addEventListener('click', function (ev) {
    if (!ev.target.hasAttribute('data-retirer')) return;
    ev.target.closest('.ligne-service').remove(); sauver();
  });
  selFam.addEventListener('change', majMetiers);
  selMet.addEventListener('change', majAutres);
  form.addEventListener('input', sauver);
  form.addEventListener('change', sauver);
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });

  // ---------- démarrage ----------
  function jsonOu(brut, defaut) { try { return brut ? JSON.parse(brut) : defaut; } catch (e) { return defaut; } }
  function demarrer() {
    remplirFamilles();
    construireHoraires();
    var l = jsonOu(lireCle(CLE_LISTE), []);
    fiches = Array.isArray(l) ? l.filter(function (f) { return f && f.id && f.etat && f.etat.champs; }) : [];
    var choix = null, ancien = jsonOu(lireCle(CLE_ANCIEN), null);
    if (ancien && ancien.champs) { // reprise de l'ancien brouillon unique
      choix = nouvelleFiche(ancien);
      choix.nom = ancien.champs.nom || ''; choix.code = codeDossier(choix.nom);
      fiches.push(choix);
      if (ecrireCle(CLE_LISTE, JSON.stringify(fiches))) effacerCle(CLE_ANCIEN);
    } else {
      var id = lireCle(CLE_COURANTE);
      choix = fiches.filter(function (x) { return x.id === id; })[0] || recentes()[0] || null;
    }
    afficher(choix || nouvelleFiche());
    if (choix) message(ancien ? 'Ancien brouillon repris dans la liste.' : 'Fiche restaurée.');
    if (!ecrireCle('fiche-terrain-test', '1')) elBloque.hidden = false; else effacerCle('fiche-terrain-test');
  }
  demarrer();
})();
