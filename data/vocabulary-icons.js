/* Meaning-based icons. Add exact French spellings below, separated by |.
 * Priority: byEntry ID > category:word > exact word > exact Chinese meaning > category.
 * Never use substring matching: pomme de terre is not an apple, est (verb) is not east.
 */
(function(root) {
  const normalize = s => String(s || '').normalize('NFC').toLowerCase().trim().replace(/[’‘]/g,"'");
  const groups = [
    ['😴','sommeil|somnolent|avoir sommeil'],['😨','peur|effrayé|avoir peur'],['😡','colère|fâché|être en colère'],
    ['🍽️','faim|avoir faim|repas|aliment|nourriture|habitude alimentaire|manger|déjeuner|dîner'],['🥤','soif|avoir soif|boisson|boire|soda'],
    ['🥶','froid'],['🥵','chaud'],['😊','heureux|content|joyeux|agréable'],['😢','triste'],['😫','fatigué'],['🤒','malade'],
    ['😟','inquiet'],['😍','amoureux|charmant'],['😌','calme|se détendre'],['🫣','timide'],['😲','choqué'],['😎','fier'],['🩹','blessé'],
    ['✨','joli|beau|bel|magnifique'],['🤝','sympathique|sympa|ami|voisin'],['🤗','chaleureux'],['🧠','intelligent'],['😋','gourmand|délicieux|bon'],
    ['🧐','sérieux'],['🛠️','pratique|bricoler'],['🪶','facile|simple'],['🧩','difficile|problème'],['⭐','préféré|préférer'],
    ['🪪','nom|prénom|pièce d’identité'],['🎂','âge|anniversaire'],['🗓️','an|année|date|jour|journée|semaine|week-end|mois|agenda'],
    ['🌍','nationalité|pays|venir de'],['💼','profession'],['👤','personne'],['👨','homme'],['👩','femme'],['🧒','enfant'],['🎓','étudiant|université'],
    ['💬','s’appeler|parler|parler français'],['🏠','habiter'],
    ['🇫🇷','France|français|Française'],['🇮🇪','Irlande|irlandais'],['🇩🇪','Allemagne|allemand'],['🇨🇭','Suisse|suisse'],
    ['🇮🇹','Italie|italien'],['🇪🇸','Espagne|espagnol'],['🇷🇺','Russie|russe'],['🇯🇵','Japon|japonais'],['🇵🇹','Portugal|portugais'],
    ['🇨🇦','Canada|canadien'],['🇺🇸','États-Unis|américain'],['🇬🇷','Grèce|grec'],['🇹🇷','Turquie|turc'],['🇨🇳','Chine|chinois'],
    ['🇧🇪','Belgique'],['🇱🇺','Luxembourg'],['🇬🇳','Guinée'],['🇲🇱','Mali'],['🇸🇳','Sénégal'],['🇰🇲','Comores'],['🇸🇨','Seychelles'],
    ['🇩🇿','Algérie'],['🇻🇳','Vietnam'],['🇧🇷','Brésil'],['🇰🇷','Corée du Sud'],['🇲🇦','Maroc'],['🇦🇷','Argentine'],['🇨🇱','Chili'],
    ['🇵🇪','Pérou'],['🇵🇭','Philippines'],['🇳🇱','Pays-Bas'],['🇰🇪','Kenya'],['🇹🇿','Tanzanie'],['🇱🇰','Sri Lanka'],['🇦🇴','Angola'],
    ['🇬🇦','Gabon'],['🇱🇧','Liban'],['🇧🇴','Bolivie'],['🇮🇳','Inde'],['🇧🇯','Bénin'],['🇺🇾','Uruguay'],['🇨🇴','Colombie'],['🇮🇶','Irak'],['🇳🇦','Namibie'],
    ['📓','cahier'],['📖','livre|lecture|lire un livre|lire un roman|roman'],['🎒','cartable|sac à dos'],['🖊️','stylo'],
    ['✏️','crayon|crayon de couleur'],['🖍️','feutre'],['📏','règle'],['✂️','ciseaux|paire de ciseaux|couper'],['🧽','éponge'],
    ['🪑','chaise'],['🧮','calculatrice'],['🗺️','carte|plan|itinéraire'],['❓','question'],['📝','exercice'],
    ['📱','téléphone portable'],['💻','ordinateur portable'],['🔑','clé'],['👓','lunettes|paire de lunettes|magasin d’optique|opticien'],
    ['🕶️','lunettes de soleil'],['👛','portefeuille'],['🚰','gourde'],['☂️','parapluie'],['🎧','casque|écouter de la musique'],
    ['💄','trousse de maquillage|salon de beauté|esthéticien'],['📷','appareil photo|prendre des photos|photo'],['⌚','montre'],['🧳','valise|voyage|voyager'],
    ['📰','magazine'],['👕','vêtement|boutique de vêtements'],['💊','médicament|pharmacie|pharmacien'],['⛸️','patin|patins|patinage|patinoire'],
    ['❤️','aimer|adorer'],['👎','détester'],['🎬','regarder un film|film|cinéma'],['📺','regarder une série|série'],['🃏','jouer aux cartes'],
    ['🎮','jouer aux jeux vidéo|jeu'],['🎨','dessiner|peinture|créer|exposition'],['🎤','chanter|rap'],['💃','danser|danse'],
    ['🍳','cuisiner|cuisson|cuire|faire cuire|poêle|à la poêle|frit|frire'],['🛍️','faire du shopping|shopping|acheter'],
    ['🧑‍🤝‍🧑','sortir avec des amis'],['🚶','se promener|marcher|à pied'],['🏃','courir|course|jogging|footing|athlétisme'],
    ['🎭','théâtre|opéra|spectacle'],['📚','bande dessinée|BD'],['🎻','musique classique'],['🎷','jazz'],['🎵','musique|concert'],
    ['⚽','football|foot'],['🏀','basket-ball|basket'],['🏐','volley-ball'],['🎾','tennis'],['🏸','badminton'],['🏓','ping-pong'],
    ['⛳','golf'],['🏉','rugby'],['⚾','baseball'],['🏊','natation|piscine'],['🚴','cyclisme'],['🚲','vélo'],['🥾','randonnée'],
    ['⛷️','ski'],['🏂','snowboard'],['🧘','yoga'],['🧗','escalade'],['🤺','escrime'],['🏹','tir à l’arc'],['🥋','arts martiaux|judo'],
    ['🏇','équitation'],['🏋️','musculation|fitness'],['⛵','voile'],['🏄','surf'],
    ['🕒','heure|minute|quart d’heure|horaire|horaires|à quelle heure'],['🌅','matin'],['🌞','midi'],['🌇','soir'],['🌙','nuit'],
    ['🎉','soirée'],['🤝','rendez-vous'],['🎟️','séance'],['💰','prix|cher'],['📆','aujourd’hui|hier|demain|après-demain'],
    ['🔓','ouvert'],['🔒','fermé'],['🏖️','vacances'],
    ['🌸','printemps'],['☀️','été|soleil|ensoleillé'],['🍂','automne'],['❄️','hiver|neige|neiger'],['🌦️','météo|temps'],
    ['🌧️','pluie|pleuvoir'],['💨','vent'],['☁️','nuage|nuageux|couvert'],['⛈️','orage'],['🌫️','brouillard'],['⚡','éclair'],
    ['🌈','arc-en-ciel'],['🧊','gel|geler|glaçon|congélateur'],['💧','goutte|eau'],['🌡️','température|degré|à température ambiante'],
    ['⬆️','nord'],['⬇️','sud'],['⬅️','ouest'],['📍','destination|adresse|ici|là'],['🛫','départ|partir'],['🛬','arrivée|arriver'],
    ['🏙️','ville|centre-ville|quartier'],['🛣️','rue|boulevard|chemin'],['🌳','parc'],['🌷','jardin|boutique de fleurs|fleuriste'],
    ['🏞️','fleuve|rivière|campagne'],['🏰','château'],['⛪','basilique|cathédrale|église'],['🏛️','musée|monument'],['📚','bibliothèque|librairie|libraire'],
    ['☕','café'],['🍽️','restaurant'],['🍸','bar'],['🍵','salon de thé|thé'],['🏨','hôtel'],['🏦','banque'],['📮','poste'],['🏥','hôpital'],
    ['🏫','école|collège'],['🚉','gare'],['✈️','aéroport|avion'],['🚏','arrêt de bus'],['ℹ️','office de tourisme|guide touristique'],
    ['🔎','chercher|découvrir'],['✅','trouver|oui'],['👀','visiter'],['🧠','connaître'],
    ['🚇','métro'],['🚌','bus|transports en commun'],['🚊','tramway|tram'],['🚆','train|TER'],['🚄','TGV'],['🚗','voiture|covoiturage'],
    ['🚕','taxi'],['🏍️','moto'],['🛵','scooter'],['🛴','trottinette'],['🚁','hélicoptère'],['🛥️','bateau'],['🚚','camion'],['🚀','fusée'],['🐎','cheval'],
    ['🧭','direction'],['↪️','tourner|tournez'],['⬆️','tout droit|continuer|continuez'],['🚶','traverser|traversez|aller|allez'],['🚪','sortir'],
    ['🥣','petit-déjeuner|céréales'],['🍪','goûter|grignoter|grignotage'],
    ['🍅','tomate'],['🥔','pomme de terre'],['🧅','oignon'],['🥗','salade'],['🥕','carotte'],['🫑','poivron'],['🫛','petit pois|haricot vert'],
    ['🧄','ail|gousse d’ail'],['🍆','aubergine'],['🍄','champignon'],['🥦','brocoli'],['🥒','concombre'],['🌽','maïs'],
    ['🎃','potiron'],['🥬','chou|chou de Bruxelles|épinards|endive|légume'],
    ['🍊','orange|clémentine'],['🍎','pomme'],['🍐','poire'],['🍌','banane'],['🍓','fraise'],['🍑','pêche'],['🍍','ananas'],
    ['🍇','raisin'],['🍋','citron'],['🍉','pastèque'],['🍈','melon'],['🥝','kiwi'],['🍒','cerise'],['🥑','avocat'],['🥥','noix de coco|coco'],['🥭','mangue'],
    ['🥩','viande|steak|bifteck|filet|côte|côtelette|faux-filet|viande hachée'],['🐄','bœuf|veau'],['🐖','porc'],['🐑','agneau'],
    ['🍗','poulet|volaille|cuisse|aile'],['🦃','dinde'],['🦆','canard'],['🐇','lapin'],['🐟','poisson'],['🌭','saucisse'],
    ['🥓','jambon|lardon|poitrine|charcuterie'],['🍔','hamburger'],['🍢','brochette'],
    ['🥖','pain|boulangerie|boulanger'],['🍚','riz'],['🍝','pâtes'],['🥚','œuf|œufs'],['🥛','lait'],['🧀','fromage|fromagerie|fromager'],
    ['🧈','beurre|beurrer'],['🌾','farine'],['🍬','sucre|sucré'],['🧂','sel|salé|saler'],['🫗','huile|verser'],
    ['🧃','jus de fruits|jus d’orange'],['🍫','chocolat|chocolaterie|chocolatier'],['🍯','miel'],['🍲','bouillon|soupe|cocotte'],
    ['🥪','sandwich'],['🍰','gâteau|dessert|pâtisserie|pâtissier'],['🥞','crêpe'],['🥧','tarte'],
    ['🏪','commerce|magasin|marché|épicerie|épicier|commerçant|marchand'],['🛒','supermarché|faire les courses|courses|client|magasin de fruits et légumes'],
    ['🐟','poissonnerie|poissonnier'],['🥩','boucherie|boucherie-charcuterie|boucher'],['🥡','magasin du traiteur|traiteur'],['🚬','bureau de tabac|buraliste'],
    ['💇','salon de coiffure|coiffeur'],['👞','boutique de chaussures|atelier du cordonnier|cordonnier'],['💍','bijouterie|bijoutier'],['🧴','parfumerie'],
    ['🎁','boutique de souvenirs'],['🔌','magasin d’électroménager'],['⛽','station-service'],['🛠️','quincaillerie'],['👜','boutique de maroquinerie'],['🧵','mercerie'],
    ['💶','euro|centime'],['🏷️','bon marché'],['📝','recette|liste de courses'],['⚖️','kilogramme|kilo|gramme'],['🧪','litre|millilitre'],
    ['🍾','bouteille'],['🥛','verre'],['🥂','coupe'],['🫙','pot|confiture'],['📦','brique|paquet'],['🥣','bol|saladier'],['☕','tasse'],
    ['🥄','cuillère à soupe|cuillère à café|cuillère|louche'],['🤏','pincée|un peu de'],['🤲','poignée'],['🥫','boîte de conserve'],
    ['🍽️','assiette|couverts|fourchette|plat'],['🔪','couteau|couteaux'],['🍲','casserole'],['🧊','frigo|réfrigérateur'],['🧹','balai'],
    ['🧼','nettoyer|laver|rincer'],['➕','ajouter'],['🥣','mélanger|remuer|battre|mixer|batteur|fouet'],
    ['💥','casser'],['♨️','faire bouillir|bouilli|à la vapeur|mettre au bain-marie'],['🔥','griller|rôtir|chauffer|réchauffer|grillé|rôti|au four|four'],
    ['❄️','faire refroidir'],['✨','décorer'],['🍽️','servir'],['🔵','bleu'],['❌','non|ne… jamais'],['🔢','combien'],
    ['💭','émotion'],['🏅','sport'],['🌤️','après-midi|ciel'],['🚪','sortie'],['🗺️','région'],
    ['➡️','à droite de'],['⬅️','à gauche de'],['🪧','panneau'],['🚌','moyen de transport'],
    ['📆','tous les jours|plusieurs fois par semaine'],['🔁','fréquence|toujours|souvent'],['🚫','jamais'],
    ['🥩','gigot'],['🥛','yaourt|crème'],['🥗','ingrédient'],['🔢','quantité'],['🫙','contenant'],['🍴','ustensile'],
    ['💧','égoutter'],['🧽','torchon']
  ];
  const byWord = {};
  for (const [emoji,words] of groups) for (const word of words.split('|')) byWord[normalize(word)] = {emoji};
  // Context prevents confusing identical spellings with different meanings.
  byWord['06:est']={emoji:'➡️'};
  byWord['08:prendre']=byWord['08:prenez']={emoji:'🚌'};
  byWord['09:prendre']={emoji:'🍽️'};
  for (const [words,svg] of [['petit|petite','small'],['grand|grande','big'],['haut|haute','tall'],['bas|basse','short']])
    for (const word of words.split('|')) byWord[word]={svg};
  const byMeaning = {};
  for (const [meaning,emoji] of [
    ['喝','🥤'],['吃','🍽️'],['购买','🛍️'],['喜欢','❤️'],['更喜欢','⭐'],['去','🚶'],['来','🚶'],
    ['认识、了解','🧠'],['怎样','❓'],['哪里','📍'],['从不','🚫']
  ]) byMeaning[meaning]={emoji};
  const byCategory={'01':'🌍','02':'💭','03':'🎒','04':'🎨','05':'🗓️','06':'🌤️','07':'🏙️','08':'🧭','09':'🍽️','10':'🛍️','11':'🍳','12':'📚'};
  const byEntry = {}; // For a particular sense: 'entry-id': {emoji:'…'} or {svg:'small'}.
  function resolve(entry) {
    const word=normalize(entry.pair?.m.fr || entry.fr);
    const direct=byEntry[entry.id] || byWord[entry.category+':'+word] || byWord[word] || byMeaning[entry.zh];
    if (direct) return {...direct,source:'meaning'};
    if (/^数字 \d+$/.test(entry.zh)) return {emoji:'🔢',source:'meaning'};
    if (/^周[一二三四五六日]$|^[一二三四五六七八九十]+月$/.test(entry.zh)) return {emoji:'🗓️',source:'meaning'};
    return {emoji:byCategory[entry.category] || '📚',source:'category'};
  }
  // Derive feminine-form aliases from existing pairs; never duplicate the vocabulary.
  for (const entry of root.FRENCH_VOCAB?.entries || []) {
    if (!entry.pair) continue;
    const visual=resolve(entry);
    if (visual.source==='meaning' && !byEntry[entry.pair.f.id]) byEntry[entry.pair.f.id]=visual;
  }
  root.FRENCH_ICONS={byWord,byMeaning,byEntry,byCategory,resolve};
})(globalThis);
