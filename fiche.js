// Fiche terrain : brouillon local, validation, partage. Aucune requête réseau.
(function () {
  'use strict';
  var CLE = 'fiche-terrain-brouillon';
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
  function lire() { try { return localStorage.getItem(CLE); } catch (e) { return null; } }
  function ecrire(v) { try { localStorage.setItem(CLE, v); } catch (e) { /* stockage bloqué : on continue sans */ } }
  function effacer() { try { localStorage.removeItem(CLE); } catch (e) { /* idem */ } }

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
  function sauver() { ecrire(JSON.stringify(etat())); }

  // ---------- texte à partager ----------
  function liste(v) { return Array.isArray(v) ? v.join(', ') : (v || ''); }
  function construire() {
    var e = etat(), c = e.champs, jours = [], services = [];
    if (c.famille === AUTRE) c.famille = c.famille_autre || AUTRE;
    c.metier = selFam.value === AUTRE ? '' : (c.metier === AUTRE ? (c.metier_autre || AUTRE) : c.metier);
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
      ['6. Ce qu\'il veut', [['Forfait', c.forfait], ['Options', liste(c.option)], ['Haut de page', c.haut], ['Intérêt', c.interet]]],
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
      'Souhaits': { 'Forfait': c.forfait || '', 'Options': c.option || [], 'Haut de page': c.haut || '', 'Intérêt': c.interet || '' },
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
  function copier(t, ok) { copierTexte(t).then(function () { message(ok); }, function () { message('Copie impossible : utilise « Télécharger ».'); }); }

  document.getElementById('partager').addEventListener('click', function () {
    if (!valider()) return;
    var f = construire();
    if (navigator.share) {
      navigator.share({ title: f.titre, text: f.texte }).catch(function (x) {
        if (x && x.name === 'AbortError') return;
        copier(f.texte, 'Partage impossible : la fiche a été copiée.');
      });
    } else copier(f.texte, 'Partage indisponible ici : la fiche a été copiée.');
  });
  document.getElementById('copier').addEventListener('click', function () {
    if (valider()) copier(construire().texte, 'Fiche copiée.');
  });
  document.getElementById('telecharger').addEventListener('click', function () {
    if (!valider()) return;
    var f = construire();
    var slug = f.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'commerce';
    var url = URL.createObjectURL(new Blob([f.texte], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'fiche-' + slug + '-' + aujourdhui() + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    message('Fichier téléchargé.');
  });
  document.getElementById('nouvelle').addEventListener('click', function () {
    if (!confirm('Vider la fiche et recommencer ? Le brouillon actuel sera effacé.')) return;
    effacer(); form.reset(); appliquer({ champs: {}, services: [] });
    document.querySelectorAll('.erreur').forEach(function (e) { e.hidden = true; });
    document.querySelectorAll('.invalide').forEach(function (e) { e.classList.remove('invalide'); });
    message('Nouvelle fiche prête.'); window.scrollTo(0, 0);
  });
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
  remplirFamilles();
  construireHoraires();
  var brut = lire(), restaure = null;
  try { restaure = brut ? JSON.parse(brut) : null; } catch (e) { restaure = null; }
  if (restaure && restaure.champs) { appliquer(restaure); message('Brouillon restauré.'); }
  else appliquer({ champs: {}, services: [] });
})();
