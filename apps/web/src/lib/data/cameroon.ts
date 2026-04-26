// Regions du Cameroun
export const REGIONS = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extreme-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest',
];

// Deduplicate a string array and sort alphabetically. The city/village/ethnie
// lists below are maintained by hand and may contain accidental duplicates
// (e.g. a town listed both under its region and among the major cities),
// which would break React list keys in the Combobox.
function uniqSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

// Principales villes du Cameroun
export const VILLES = uniqSorted([
  'Bafoussam', 'Bamenda', 'Bertoua', 'Buea', 'Douala', 'Ebolowa',
  'Edea', 'Foumban', 'Garoua', 'Kribi', 'Kumba', 'Limbe',
  'Maroua', 'Mbalmayo', 'Mbouda', 'Meiganga', 'Mokolo',
  'Nkongsamba', 'Ngaoundere', 'Yaounde',
  'Bafang', 'Bafia', 'Bangangte', 'Banyo', 'Batouri',
  'Dschang', 'Fontem', 'Guider', 'Kousseri', 'Kumbo',
  'Loum', 'Mamfe', 'Manjo', 'Melong', 'Mora',
  'Nanga-Eboko', 'Obala', 'Sangmelima', 'Tiko', 'Wum',
  'Akonolinga', 'Ambam', 'Ayos', 'Bali', 'Bankim',
  'Belabo', 'Bertoua', 'Betare-Oya', 'Bogo', 'Campo',
  'Dizangue', 'Djang', 'Eseka', 'Fifinda', 'Fundong',
  'Garoua-Boulai', 'Idenau', 'Jakiri', 'Kaele', 'Kontcha',
  'Koutaba', 'Lolodorf', 'Manfe', 'Martap', 'Mbandjock',
  'Mbengwi', 'Meyomessala', 'Mindif', 'Mokolo', 'Mouanko',
  'Moutourwa', 'Mundemba', 'Mutengene', 'Ndop', 'Nkambe',
  'Nkoteng', 'Ntui', 'Penja', 'Sa\'a', 'Tcholire',
  'Tibati', 'Tignere', 'Tombel', 'Touboro', 'Yabassi',
  'Yokadouma',
]);

// Villages d'origine (principaux villages par region)
export const VILLAGES = uniqSorted([
  // Ouest (Bamileke)
  'Bafou', 'Bafousam', 'Baham', 'Bamendjou', 'Bamougoum',
  'Bandjoun', 'Bangou', 'Bansoa', 'Bapa', 'Batcham',
  'Batié', 'Bazou', 'Dschang', 'Fongo-Tongo', 'Foumban',
  'Foumbot', 'Galim', 'Koutaba', 'Magba', 'Massangam',
  'Mbouda', 'Mifi', 'Nkong-Ni', 'Penka-Michel', 'Pete-Bandjoun',
  'Bafounda', 'Bafang', 'Bana', 'Bandja', 'Bangangte',
  'Bangoulap', 'Bangoua', 'Bakou', 'Balessing', 'Bamena',
  'Bamenkombo', 'Bayangam', 'Demdeng', 'Djembem', 'Djuttitsa',
  'Famgoum', 'Fombap', 'Fontsa-Touala', 'Fossong-Wentcheng',
  'Foto', 'Kekem', 'Kouoptamo', 'Tonga',

  // Nord-Ouest
  'Bali', 'Bamenda', 'Bafut', 'Bamunka', 'Fundong',
  'Jakiri', 'Kumbo', 'Mbengwi', 'Ndop', 'Nkambe',
  'Nso', 'Wum', 'Oku', 'Babungo', 'Bikom',

  // Littoral
  'Bonaberi', 'Deido', 'Akwa', 'Bassa', 'New-Bell',
  'Bonamoussadi', 'Douala', 'Edea', 'Loum', 'Manjo',
  'Mouanko', 'Nkongsamba', 'Penja', 'Yabassi', 'Dizangue',

  // Centre
  'Bafia', 'Mbalmayo', 'Nanga-Eboko', 'Ntui', 'Obala',
  'Okola', 'Sa\'a', 'Yaounde', 'Akonolinga', 'Eseka',
  'Mbandjock', 'Mfou', 'Monatele', 'Ngoumou', 'Soa',

  // Sud
  'Ambam', 'Campo', 'Ebolowa', 'Kribi', 'Lolodorf',
  'Meyomessala', 'Mvangan', 'Sangmelima', 'Bipindi',

  // Est
  'Batouri', 'Bertoua', 'Yokadouma', 'Abong-Mbang',
  'Belabo', 'Betare-Oya', 'Garoua-Boulai', 'Lomie', 'Moloundou',

  // Adamaoua
  'Banyo', 'Meiganga', 'Ngaoundere', 'Tibati', 'Tignere',
  'Dir', 'Kontcha', 'Martap',

  // Nord
  'Garoua', 'Guider', 'Pitoa', 'Poli', 'Tcholire',
  'Touboro', 'Lagdo', 'Dembo', 'Bibemi', 'Figuil',

  // Extreme-Nord
  'Kousseri', 'Maroua', 'Mokolo', 'Mora', 'Yagoua',
  'Bogo', 'Kaele', 'Kolofata', 'Maga', 'Mindif',
  'Moutourwa', 'Waza',

  // Sud-Ouest
  'Buea', 'Kumba', 'Limbe', 'Mamfe', 'Mundemba',
  'Tiko', 'Tombel', 'Bangem', 'Fontem', 'Mutengene',
]);

// Ethnies du Cameroun
export const ETHNIES = uniqSorted([
  // Grands groupes Bamileke
  'Bamileke', 'Bamoun', 'Bamoum',
  // Sous-groupes Bamileke (les plus connus)
  'Bandjoun', 'Bafoussam', 'Bafou', 'Baham', 'Bamendjou',
  'Bangou', 'Bansoa', 'Batcham', 'Dschang', 'Mbouda',
  'Bangangte', 'Bafang', 'Foto', 'Balessing', 'Bangoua',

  // Groupes du Littoral / Sawa
  'Sawa', 'Douala', 'Bassa', 'Bakweri', 'Bulu',
  'Bakossi', 'Mbo', 'Batanga',

  // Groupes du Centre / Sud
  'Beti', 'Ewondo', 'Eton', 'Fang', 'Boulou',
  'Manguissa', 'Mvele', 'Ntumu', 'Yambassa', 'Bafia',

  // Groupes du Nord
  'Foulbe', 'Peul', 'Fulani', 'Toupouri', 'Massa',
  'Moundang', 'Guiziga', 'Kapsiki', 'Mandara', 'Mafa',
  'Kanuri', 'Kotoko', 'Arabes Choa', 'Gbaya', 'Dii',

  // Groupes Grassfields / Nord-Ouest
  'Nso', 'Bafut', 'Kom', 'Wimbum', 'Oku',
  'Bali-Nyonga', 'Ndop', 'Aghem', 'Meta', 'Moghamo',

  // Groupes de l'Est
  'Maka', 'Kako', 'Pol', 'Bobilis', 'Pygmee',
  'Baka', 'Badjoue', 'Nzime',

  // Groupes du Sud-Ouest
  'Bayangi', 'Ejagham', 'Oroko', 'Kenyang',

  // Autres
  'Tikar', 'Widekum', 'Haoussa',
]);

// Chefferies traditionnelles
export const CHEFFERIES = uniqSorted([
  // Chefferies Bamileke (Ouest)
  'Bandjoun', 'Bafoussam', 'Bafou', 'Baham', 'Bamendjou',
  'Bangou', 'Bansoa', 'Batcham', 'Dschang', 'Foto',
  'Bangangte', 'Bafang', 'Balessing', 'Bangoua', 'Bamougoum',
  'Bapa', 'Bamena', 'Bayangam', 'Bazou', 'Fongo-Tongo',
  'Galim', 'Mbouda', 'Penka-Michel', 'Foumban', 'Foumbot',
  'Bafounda', 'Bana', 'Bandja', 'Bangoulap', 'Bakou',
  'Bamenkombo', 'Demdeng', 'Djembem', 'Djuttitsa',
  'Famgoum', 'Fombap', 'Fontsa-Touala', 'Fossong-Wentcheng',
  'Kekem', 'Kouoptamo', 'Tonga', 'Batié',
  'Nkong-Ni', 'Pete-Bandjoun', 'Mifi', 'Massangam', 'Magba',

  // Chefferies du Nord-Ouest
  'Nso (Kumbo)', 'Bafut', 'Bali-Nyonga', 'Kom (Fundong)',
  'Oku', 'Ndop', 'Babungo', 'Bikom', 'Wum', 'Nkambe',

  // Sultanats du Nord / Adamaoua
  'Sultanat de Foumban', 'Sultanat de Rey-Bouba',
  'Lamidat de Ngaoundere', 'Lamidat de Garoua',
  'Lamidat de Maroua', 'Lamidat de Tibati',
  'Lamidat de Banyo', 'Sultanat de Mandara',

  // Chefferies du Littoral
  'Deido', 'Akwa', 'Bell', 'Bassa', 'Bonaberi',

  // Chefferies du Centre / Sud
  'Ewondo', 'Eton', 'Manguissa', 'Boulou', 'Fang',
]);
