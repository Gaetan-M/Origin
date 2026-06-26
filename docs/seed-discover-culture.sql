-- ============================================================================
-- ORIGIN — Seed Découvrir : 134 contenus culturels réels du Cameroun (idempotent)
-- ----------------------------------------------------------------------------
-- Compilé depuis des sources web publiques (Wikipédia, UNESCO, ouvrages,
-- sites culturels) — chaque item cite sa source en bas de body. Réparti :
--   CUSTOM: 5
--   LANGUAGE: 9
--   MUSIC: 7
--   PEOPLE: 21
--   PROVERB: 48
--   RECIPE: 23
--   RITE: 6
--   TALE: 15
-- 36/134 items ont une vraie photo (Wikipédia/Wikimedia) ; les autres
-- affichent un visuel de marque propre (jamais d'image au hasard).
-- Idempotent. ⚠️ PRÉREQUIS : exécuter d'abord docs/hotfix-discover-image-people.sql
-- (ajoute image_url + l'enum PEOPLE ; PostgreSQL exige que l'enum soit committé
-- avant d'être utilisé ci-dessous).
-- À exécuter dans Supabase > SQL Editor.
-- ============================================================================

-- Filet de sécurité : la colonne (sans danger dans la même transaction).
ALTER TABLE "cultural_content" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);

WITH admin AS (
  SELECT id FROM accounts WHERE phone_number = '+237655922472' LIMIT 1
),
data(content_type, title, body, language_code, region, ethnic_group, image_url) AS (
  VALUES
  ('RECIPE', 'Ndolé', '**Origine**
Plat emblématique du Cameroun, originaire de la région du Littoral et associé au peuple Sawa (Douala). Il est souvent qualifié de plat royal camerounais.

**Ingrédients**
- Feuilles de ndolé (Vernonia, feuilles amères)
- Pâte d''arachide fraîche
- Viande de bœuf et/ou poisson fumé, morue, crevettes
- Oignons, ail, épices pilées
- Huile (souvent huile d''arachide), sel

**Préparation**
1. Faire bouillir les feuilles de ndolé deux à trois fois avec du sel pour retirer l''amertume, puis les rincer et les hacher.
2. Cuire séparément la viande et/ou le poisson avec oignons et épices.
3. Préparer une base à la pâte d''arachide, puis y incorporer les feuilles, la viande et les fruits de mer.
4. Laisser mijoter jusqu''à obtenir une sauce onctueuse.
5. Servir avec des plantains frits (miondo) ou du manioc.

**Le saviez-vous**
La plante de ndolé est réputée pour ses propriétés thérapeutiques : elle est traditionnellement utilisée contre les parasites intestinaux, les douleurs menstruelles, le paludisme et les maux de tête persistants.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Ndol%C3%A9', NULL, 'Littoral', 'Sawa (Douala)', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Le_Ndol%C3%A9.JPG'),
  ('RECIPE', 'Eru', '**Origine**
Spécialité du peuple Banyang, établi dans le département de la Manyu, dans la région du Sud-Ouest du Cameroun. Porté à l''origine par les communautés Banyang, Bayang, Bakossi et Bakweri, il est aujourd''hui apprécié dans tout le pays.

**Ingrédients**
- Feuilles d''eru / okok (Gnetum africanum) finement émincées
- Waterleaf (Talinum fruticosum) ou épinard
- Huile de palme
- Poisson fumé, crevettes (crayfish)
- Peau de bœuf (kanda)
- Sel et épices

**Préparation**
1. Émincer très finement les feuilles de Gnetum africanum.
2. Les faire mijoter assez longtemps pour les attendrir, car insuffisamment cuites elles restent filandreuses.
3. Faire revenir l''ensemble dans l''huile de palme avec le poisson fumé, les crevettes et la peau de bœuf (kanda).
4. Incorporer le waterleaf (ou l''épinard) seulement en fin de cuisson, afin de garder son moelleux.
5. Assaisonner et servir chaud, accompagné de water fufu ou de garri.

**Le saviez-vous**
L''eru associe toujours deux types de feuilles aux rôles complémentaires : l''okok, ferme et un peu fibreux, et le waterleaf, aqueux, qui apporte de la souplesse à l''ensemble. Ses ingrédients de base étant difficiles à trouver hors du Cameroun, il reste un plat fortement identitaire.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Eru_(plat)', NULL, 'Sud-Ouest', 'Banyang', 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Le_Eru%2C_un_plat_camerounais.jpg'),
  ('RECIPE', 'Achu (taro sauce jaune)', '**Origine**
Plat traditionnel préparé par le peuple Ngemba de la région du Nord-Ouest du Cameroun, également très présent chez les Bamilékés de la région de l''Ouest. Il est souvent servi lors des grandes occasions.

**Ingrédients**
- Taro bouilli et pilé
- Banane plantain
- Huile de palme
- Canwa (pierre calcaire / sel gemme)
- Épices, sel
- Bœuf ou poisson (bouilli, frit ou fumé)

**Préparation**
1. Faire bouillir les taros puis les piler jusqu''à obtenir une pâte lisse.
2. Préparer la soupe en mélangeant l''huile de palme avec l''eau et le canwa (pierre calcaire), ce qui donne à la soupe sa couleur jaune caractéristique.
3. Ajouter les épices et la viande ou le poisson.
4. Servir le taro pilé accompagné de la soupe jaune chaude.

**Le saviez-vous**
C''est l''huile de palme combinée à la pierre calcaire (canwa) qui transforme la couleur de la soupe en jaune vif, d''où son surnom de soupe jaune.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Achu', NULL, 'Nord-Ouest', 'Ngemba', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Taro_sauce_jaune_avec_peau_de_boeuf.jpg'),
  ('RECIPE', 'Mbongo Tchobi (sauce noire)', '**Origine**
Sauce traditionnelle camerounaise, aussi appelée sauce ébène ou sauce noire, réputée originaire du peuple Bassa (région du Littoral / Centre).

**Ingrédients**
- Épice de mbongo (poivre sauvage), pèbè et njansang
- Poisson (machoiron frais, carpe, anguille, silure) ou viande
- Tomate, ail, gingembre, oignons
- Condiments verts (poireau, céleri, basilic)
- Feuilles de laurier, poivre blanc moulu
- Huile de palme ou d''arachide, sel

**Préparation**
1. Griller à la poêle les graines de njansang, l''épice mbongo et le pèbè, qui noircissent et donnent à la sauce sa couleur sombre.
2. Écraser ces épices grillées avec la tomate, les condiments verts, l''ail et le gingembre jusqu''à obtenir une purée homogène.
3. Saler le poisson et le faire mijoter dans ce mélange une vingtaine de minutes.
4. À part, chauffer l''huile avec les oignons, le poivre blanc, le laurier, le sel et l''eau, puis cuire environ trente minutes.
5. Réunir les deux préparations et servir chaud avec du riz, du manioc, de la banane plantain, du macabo ou du foutou.

**Le saviez-vous**
Le plat tire son nom du mbongo, un poivre sauvage camerounais dont les graines grillées donnent à la sauce sa couleur noire profonde caractéristique.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Mbongo_Tchobi', NULL, 'Littoral', 'Bassa', 'https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg'),
  ('RECIPE', 'Koki (gâteau de haricots)', '**Origine**
Plat camerounais dont l''origine est disputée entre les peuples Mbo et Bazou. Il est associé au Sud-Ouest, au Littoral (Moungo) et à la région de l''Ouest, notamment chez les Mbo, Bafang, Maka, Bassa et Banen.

**Ingrédients**
- Haricots (niébé / Vigna unguiculata)
- Huile de palme rouge (essentielle au goût)
- Piment
- Feuilles de bananier (pour la cuisson)
- Eau, sel

**Préparation**
1. Faire tremper les haricots puis retirer leur peau.
2. Réduire les haricots en pâte fine.
3. Incorporer progressivement l''huile de palme rouge et le piment jusqu''à obtenir une préparation homogène et colorée.
4. Envelopper la pâte dans des feuilles de bananier.
5. Cuire à la vapeur jusqu''à ce que le gâteau prenne. Servir avec de la banane plantain.

**Le saviez-vous**
Le koki figure parmi les 111 éléments du patrimoine culturel immatériel national du Cameroun, inscrits par décret le 21 février 2021.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Koki', NULL, 'Littoral', 'Mbo', 'https://upload.wikimedia.org/wikipedia/commons/c/cd/D%C3%A9gustation_de_koki.jpg'),
  ('RECIPE', 'Poulet DG', '**Origine**
Plat festif de la cuisine camerounaise, apparu dans les années 1980. Il est considéré comme un plat national, sans rattachement à une ethnie unique.

**Ingrédients**
- Poulet frit
- Bananes plantains mûres, pré-frites
- Légumes (carottes, poivrons, haricots verts)
- Oignons, ail, tomate concentrée
- Huile, épices, sel, parfois cube bouillon

**Préparation**
1. Découper et faire frire le poulet.
2. Frire séparément les rondelles de plantain jusqu''à ce qu''elles soient dorées.
3. Faire revenir les légumes et les aromates dans l''huile.
4. Réunir le poulet, les plantains et les légumes, puis faire sauter l''ensemble avec la sauce tomate et les épices.
5. Servir chaud.

**Le saviez-vous**
Le nom vient d''un jeu de mots des années 1980 : DG signifie directeur général. Réservé à l''origine aux personnes de haut rang social, ce plat s''est depuis totalement démocratisé.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Poulet_DG', NULL, 'National', NULL, 'https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG'),
  ('RECIPE', 'Sanga (maïs et folong)', '**Origine**
Le Sanga est un plat traditionnel des régions du Centre et du Sud du Cameroun. Sa préparation varie selon les peuples : chez les Béti, il est cuisiné avec un concentré de suc de noix de palme, tandis que chez les Bassa il est simplement préparé à l''huile de palme.

**Ingrédients**
- Maïs frais en grains
- Feuilles de morelle noire (zom / folong)
- Noix de palme (ou huile de palme)
- Sel et piment (facultatif)

**Préparation**
1. Effeuiller et émincer finement les légumes, puis les laver soigneusement.
2. Faire revenir les feuilles jusqu''à évaporation de leur eau de végétation.
3. Égrener le maïs frais et l''ajouter aux légumes.
4. Incorporer le suc de noix de palme concentré (version Béti) ou l''huile de palme (version Bassa).
5. Laisser mijoter jusqu''à cuisson complète du maïs et des feuilles.

**Le saviez-vous**
Le Sanga peut se déguster aussi bien en entrée qu''en plat principal, et sa recette change d''une communauté à l''autre, illustrant la grande diversité culinaire camerounaise.

— Source : Camerdish — https://www.camerdish.com/recipes/potage-de-mais-sanga/', NULL, 'Centre', 'Béti / Bassa', NULL),
  ('RECIPE', 'Okok / Nnam Owondo', '**Origine**
Le Nnam Owondo (proche de l''Okok dans la cuisine béti) est un mets cher aux peuples Béti du Sud et du Centre du Cameroun. Considéré comme un totem identitaire, il s''est diffusé jusqu''aux régions côtières habitées par les Fang.

**Ingrédients**
- Arachides grillées puis moulues
- Poisson fumé ou écrevisses
- Sel et piment
- Feuilles de bananier (pour la cuisson)

**Préparation**
1. Griller puis moudre finement les arachides.
2. Mélanger la pâte d''arachide avec le poisson fumé ou les écrevisses, le sel et le piment.
3. Délayer avec un peu d''eau tiède pour obtenir une préparation homogène.
4. Envelopper le mélange dans des feuilles de bananier.
5. Cuire lentement, puis laisser tiédir avant de servir pour ne pas se brûler le palais.

**Le saviez-vous**
Le Nnam Owondo est considéré comme le totem des Béti, un peu comme le Ndolé l''est pour les populations côtières. Il accompagne traditionnellement le manioc, le bâton de manioc ou le macabo.

— Source : Afrik.com — https://www.afrik.com/cameroun-gastronomie-le-nnam-owondo-le-totem-des-beti', NULL, 'Sud', 'Béti', NULL),
  ('RECIPE', 'Nkondrè (Kondrè)', '**Origine**
Le Nkondrè (Kondrè) est une potée originaire de l''Ouest du Cameroun, en pays bamiléké. Il est associé aux grandes réceptions, aux cérémonies traditionnelles et même aux funérailles.

**Ingrédients**
- Banane plantain (de préférence pas trop mûre)
- Viande de chèvre, de bœuf ou de porc
- Huile de palme
- Épices : poivre blanc et noir, oignon de pays, pèbè, ail, thym, laurier

**Préparation**
1. Assaisonner et précuire la viande avec les épices.
2. Éplucher et couper la banane plantain en tronçons.
3. Réunir la viande et le plantain dans une marmite avec l''huile de palme.
4. Ajouter le mélange d''épices (pèbè, oignon de pays, ail, thym, laurier, poivres).
5. Laisser mijoter jusqu''à ce que le plantain soit fondant et bien imprégné des saveurs.

**Le saviez-vous**
Contrairement au plantain pilé, le Nkondrè se distingue par l''absence de lait d''arachide ; il symbolise l''hospitalité et le respect des traditions culinaires camerounaises.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Nkondr%C3%A8', NULL, 'Ouest', 'Bamiléké', 'https://upload.wikimedia.org/wikipedia/commons/2/21/Pr%C3%A9paration_du_Kondre_ch%C3%A8vre.jpg'),
  ('RECIPE', 'Kwacoco Bible', '**Origine**
Le Kwacoco Bible est une spécialité traditionnelle du peuple Bakweri, dans la région du Sud-Ouest du Cameroun. Il présente des parentés avec des plats des peuples Ibibio du Nigeria voisin.

**Ingrédients**
- Macabo / taro râpé (cocoyam)
- Huile de palme
- Poisson fumé et écrevisses
- Feuilles de macabo ou épinards
- Piment, sel et assaisonnement
- Feuilles de bananier (pour l''emballage)

**Préparation**
1. Éplucher et râper le macabo jusqu''à obtenir une pâte lisse.
2. Mélanger la pâte avec l''huile de palme, le poisson fumé, les écrevisses, le piment et les feuilles.
3. Déposer des portions au centre de feuilles de bananier et former des paquets bien fermés.
4. Disposer les paquets dans une marmite tapissée de feuilles.
5. Cuire à la vapeur environ une heure, en ajoutant de l''eau au besoin pour éviter que cela n''attache.

**Le saviez-vous**
L''origine du mot « Bible » dans le nom du plat est débattue ; une explication courante renvoie à la cuisson tout-en-un, tous les ingrédients étant réunis dans un seul paquet jugé aussi complet et nourrissant que l''est la Bible pour l''âme.

— Source : Precious Core — https://www.preciouscore.com/kwacoco-bible/', NULL, 'Sud-Ouest', 'Bakweri', NULL),
  ('RECIPE', 'Ekwang', '**Origine**
L''Ekwang est originaire du peuple Bafaw, dans la région du Sud-Ouest du Cameroun (départements du Ndian et de la Manyu). Une version proche existe au Nigeria chez les Efik et les Ibibio, sous le nom d''« Ekpang Nkukwo ».

**Ingrédients**
- Macabo râpé
- Feuilles de macabo (pour envelopper)
- Viande de bœuf et couenne
- Poisson fumé
- Huile de palme
- Écrevisses, oignon, ail, gingembre et assaisonnements

**Préparation**
1. Assaisonner et précuire séparément la viande et le poisson.
2. Éplucher et râper le macabo, puis le mélanger avec du sel et un peu d''eau pour obtenir une pâte homogène.
3. Déposer de petites cuillerées de pâte sur des carrés de feuilles de macabo et les rouler comme de petits cigares.
4. Faire braiser les rouleaux dans l''huile de palme avec le bouillon de viande et les aromates, environ 40 minutes.
5. Ajouter les écrevisses moulues, la viande et le poisson fumé, puis laisser mijoter une vingtaine de minutes.

**Le saviez-vous**
L''Ekwang figure parmi les plats emblématiques servis lors des grandes célébrations et des réunions familiales du Sud-Ouest, et témoigne des liens culinaires transfrontaliers avec le Nigeria.

— Source : Camerdish — https://www.camerdish.com/recipes/ekwang/', NULL, 'Sud-Ouest', 'Bafaw', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Ekpang.png'),
  ('RECIPE', 'Mbanga soup (sauce de noix de palme)', '**Origine**
La Mbanga soup (ou Banga soup), sauce à base de noix de palme, est un mets emblématique du peuple Bakweri, dans la région du Sud-Ouest du Cameroun. Servie traditionnellement avec le Kwacoco, l''ensemble est appelé localement « timanambusa ».

**Ingrédients**
- Noix de palme (pulpe extraite) ou pâte de noix de palme concentrée
- Viande et tripes
- Poisson fumé
- Écrevisses
- Piment, oignon, herbes aromatiques, cube et sel

**Préparation**
1. Faire bouillir les noix de palme fraîches, puis les piler au mortier.
2. Extraire la pulpe (le suc) en pressant à la main, ou utiliser une pâte de noix de palme concentrée.
3. Faire cuire le suc avec la viande, les tripes et le poisson fumé.
4. Assaisonner avec le piment, l''oignon, les écrevisses et les herbes.
5. Laisser mijoter jusqu''à obtenir une sauce onctueuse, d''une belle couleur orangée.

**Le saviez-vous**
Chez les Bakweri, le couple Kwacoco + Mbanga soup (« timanambusa ») est si emblématique qu''un dicton prévient : pour épouser une femme bakweri, il faut se préparer à savourer ce plat.

— Source : Precious Core — https://www.preciouscore.com/kwacoco-and-banga-soup/', NULL, 'Sud-Ouest', 'Bakweri', NULL),
  ('RECIPE', 'Soya (brochettes de bœuf épicées)', '**Origine**
Le soya est la version camerounaise du suya, une grillade de viande d''origine haoussa, très répandue dans le nord du Cameroun ainsi qu''au Nigeria, au Niger, au Ghana et au Soudan. C''est un grand classique de la cuisine de rue.

**Ingrédients**
- Viande de bœuf coupée en fines lamelles (parfois mouton, poulet ou abats)
- Arachides grillées et pilées en poudre
- Mélange d''épices (poivre noir, poivre rouge/piment, gingembre, clou de girofle)
- Sel, cube assaisonné
- Huile végétale
- Oignons et tomates crus pour l''accompagnement

**Préparation**
1. Couper la viande en lamelles fines et l''enfiler sur des brochettes.
2. Préparer le yaji, un mélange sec d''arachides pilées, d''épices et de sel.
3. Badigeonner légèrement la viande d''huile, puis l''enrober généreusement du mélange d''épices.
4. Griller les brochettes sur la braise en les retournant régulièrement jusqu''à cuisson.
5. Servir chaud, souvent coupé en bouchées, accompagné d''oignons et de tomates crus.

**Le saviez-vous**
Au Nigeria voisin, le suya est devenu un véritable symbole d''unité nationale, présent dans tout le pays auprès des vendeurs de rue souvent originaires du nord.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Suya_(cuisine)', NULL, 'Nord', 'Haoussa', 'https://upload.wikimedia.org/wikipedia/commons/a/ab/SuyavarietiesTX.JPG'),
  ('RECIPE', 'Bobolo / Miondo (bâton de manioc)', '**Origine**
Le bobolo et le miondo sont deux formes du célèbre bâton de manioc camerounais. Le bobolo est associé aux Beti (Ewondo) des régions du Centre et du Sud, tandis que le miondo est une spécialité des populations Sawa du littoral. Tous deux accompagnent les grands plats de sauce comme le ndolé.

**Ingrédients**
- Manioc (racine)
- Feuilles longues pour l''emballage (feuilles de balai ou de bananier selon les régions)
- Eau

**Préparation**
1. Faire tremper et fermenter le manioc dans l''eau pendant plusieurs jours.
2. Piler ou écraser la pâte de manioc fermentée jusqu''à obtenir une masse lisse.
3. Façonner la pâte en cylindres allongés et fins.
4. Envelopper chaque cylindre dans de longues feuilles bien serrées.
5. Cuire les bâtons à la vapeur jusqu''à ce qu''ils soient fermes.

**Le saviez-vous**
Le bâton de manioc est incontournable lors des grandes cérémonies camerounaises : mariages, dots et galas en proposent presque toujours.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Bobolo', NULL, 'Littoral / Centre', 'Beti (Ewondo) / Sawa', 'https://upload.wikimedia.org/wikipedia/commons/5/58/B%C3%A2tons_de_manioc_de_Tayap.JPG'),
  ('RECIPE', 'Foléré / Bissap (boisson d''oseille de Guinée)', '**Origine**
Le foléré est le nom camerounais du bissap, une boisson rouge et acidulée préparée à partir des calices séchés de l''hibiscus (Hibiscus sabdariffa), aussi appelé oseille de Guinée ou roselle. La plante est cultivée notamment dans le nord du Cameroun.

**Ingrédients**
- Calices séchés d''hibiscus (oseille de Guinée)
- Eau
- Sucre (selon le goût)
- Aromates facultatifs : menthe, gingembre, vanille, cannelle

**Préparation**
1. Rincer rapidement les calices séchés.
2. Les infuser dans de l''eau chaude (90-95 °C) à couvert, ou les faire bouillir quelques minutes en décoction.
3. Laisser reposer puis filtrer pour retirer les calices.
4. Sucrer et parfumer selon les préférences (menthe, gingembre, etc.).
5. Servir bien frais, ou chaud comme dans le nord de l''Afrique.

**Le saviez-vous**
La même boisson porte des dizaines de noms à travers le monde : karkadé en Égypte, agua de Jamaica au Mexique, zobo au Nigeria ou encore Ngai Ngai au Congo.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Hibiscus_sabdariffa', NULL, 'National', NULL, 'https://upload.wikimedia.org/wikipedia/commons/9/94/Flor_de_Jamaica.jpg'),
  ('RECIPE', 'Khati-khati / Kati-kati (poulet grillé des Grassfields)', '**Origine**
Le kati-kati est un plat traditionnel des Grassfields, dans la région du Nord-Ouest du Cameroun, particulièrement associé aux populations Nkom. Il marie la saveur fumée du poulet de village grillé à la braise avec une cuisson mijotée à l''huile de palme.

**Ingrédients**
- Poulet de ferme
- Huile de palme
- Tomates fraîches
- Poivron
- Oignon
- Ail
- Sel et poivre

**Préparation**
1. Flamber le poulet, le découper en morceaux et le rincer.
2. Mettre les morceaux dans une marmite avec un peu d''eau, l''oignon et l''ail émincés, les tomates et le poivron coupés.
3. Assaisonner de sel et de poivre, puis laisser cuire.
4. Ajouter l''huile de palme et bien mélanger.
5. Poursuivre la cuisson jusqu''à ce que l''eau s''évapore et qu''il ne reste que le poulet enrobé d''huile et de sauce réduite.

**Le saviez-vous**
Le kati-kati se sert traditionnellement avec le njama-njama (feuilles de morelle noire sautées) et un couscous de maïs.

— Source : Camerdish — https://www.camerdish.com/recipes/kati-kati-njama-njama/', NULL, 'Nord-Ouest', 'Grassfields (Nkom)', NULL),
  ('RECIPE', 'Nkui (sauce gluante de l''Ouest)', '**Origine**
Le nkui est un plat traditionnel Bamiléké de l''Ouest du Cameroun. Il s''agit d''une sauce gluante obtenue à partir de l''écorce de la plante Triumfetta pentandra, préparée tout particulièrement à l''occasion de la naissance d''un enfant et servie à la mère pour sa valeur énergétique.

**Ingrédients**
- Tiges/écorce de nkui (Triumfetta pentandra)
- Eau
- Douze condiments locaux (ngachu''u, lepka''ah, diepse''eh, zehfe, écorce et fruits du lep, etc.)
- Viande ou poisson selon les versions

**Préparation**
1. Tremper les tiges de nkui dans l''eau bouillante une vingtaine de minutes pour les ramollir.
2. Dans de l''eau tiède, pétrir les tiges à la main jusqu''à obtenir un liquide épais et gluant.
3. Réduire les condiments traditionnels en poudre.
4. Incorporer les épices à la sauce gluante et mélanger vigoureusement.
5. Servir bien chaud avec un couscous de maïs.

**Le saviez-vous**
La sauce est si gluante qu''aucun ustensile ne permet de l''attraper : le nkui se mange traditionnellement à la main.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Nkui', NULL, 'Ouest', 'Bamiléké', 'https://upload.wikimedia.org/wikipedia/commons/5/53/Nkui.jpg'),
  ('RECIPE', 'Corn chaff (maïs et haricots)', '**Origine**
Le corn chaff, aussi appelé corn tchap ou kontchap, est un plat populaire de la cuisine camerounaise, originaire notamment des régions du Sud-Ouest et du Nord-Ouest. C''est un mijoté économique et nourrissant de maïs et de haricots.

**Ingrédients**
- Haricots rouges
- Maïs (grains)
- Poisson fumé
- Oignons et tomates fraîches
- Gingembre
- Crevettes/écrevisses séchées (crayfish)
- Huile rouge (de palme)
- Sel et poivre

**Préparation**
1. Faire tremper les haricots la veille, puis les cuire 1 h à 1 h 30 jusqu''à tendreté.
2. Cuire le maïs environ 2 heures jusqu''à ce qu''il soit tendre, puis le rincer.
3. Nettoyer le poisson fumé (retirer tête et arêtes) et hacher finement oignons et tomates.
4. Faire revenir les oignons, les tomates et le gingembre dans l''huile, ajouter le poisson fumé.
5. Incorporer le maïs et les haricots, ajouter les écrevisses pilées, assaisonner et laisser mijoter 20 à 25 minutes en remuant.

**Le saviez-vous**
Plat abordable et rassasiant, le corn chaff est un classique des repas familiaux du dimanche dans les régions anglophones du Cameroun.

— Source : Camerdish — https://www.camerdish.com/recipes/corn-tchap/', NULL, 'Sud-Ouest / Nord-Ouest', NULL, NULL),
  ('RECIPE', 'Mets de pistache (egusi pudding)', '**Origine**
Le mets de pistache, appelé nnam ngon, est un plat traditionnel camerounais répandu dans les régions du Centre, du Littoral et de l''Ouest. La « pistache » désigne ici les graines de courge (egusi) séchées, riches en protéines et en bonnes graisses.

**Ingrédients**
- Graines de courge (pistache/egusi) réduites en poudre
- Viande de bœuf
- Poisson fumé
- Crevettes séchées
- Bouillon de viande ou eau
- Oignons
- Sel, poivre noir, piment

**Préparation**
1. Cuire la viande avec sel, poivre, piment et oignons jusqu''à ce qu''elle soit tendre, puis ajouter le poisson fumé en fin de cuisson.
2. Mélanger la poudre de pistache avec les assaisonnements.
3. Incorporer peu à peu le bouillon de cuisson en remuant pour obtenir une pâte lisse.
4. Ajouter la viande, le poisson et les crevettes.
5. Étaler la pâte, la rouler bien serré, l''envelopper de feuilles ou de papier aluminium et cuire à la vapeur au moins une heure.

**Le saviez-vous**
Dans de nombreuses familles, le mets de pistache est un plat de fête, préparé à l''avance pour les grandes occasions comme Noël en raison de son long temps de cuisson.

— Source : Kelian Food — https://kelianfood.com/met-de-pistache-egusi-recette-africaine-graine-de-courge/', NULL, 'Centre / Littoral', NULL, NULL),
  ('RECIPE', 'Beignets-haricots-bouillie (BHB)', '**Origine**
Le trio « beignets-haricots-bouillie », universellement abrégé BHB, est le petit-déjeuner urbain emblématique du Cameroun. Il s''est imposé avec l''urbanisation, d''abord dans les rues de Douala (Littoral) et de Yaoundé (Centre), où des vendeuses de rue le préparent dès l''aube. C''est un plat national, sans rattachement ethnique particulier.

**Ingrédients**
- Pour les beignets : farine de blé, levure, sucre, eau tiède, huile végétale pour la friture
- Pour les haricots : haricots rouges, oignon, ail, gingembre, huile de palme rouge, piment, sel
- Pour la bouillie : farine de maïs (ou de mil), eau, sucre

**Préparation**
1. La veille, faire tremper les haricots rouges une douzaine d''heures, puis les cuire lentement (environ 2 h) avec oignon, ail et gingembre ; ajouter l''huile de palme rouge en deux fois.
2. Préparer la pâte à beignets avec farine, levure, sucre et eau tiède (jamais chaude, pour ne pas tuer la levure) ; laisser lever environ une heure.
3. Façonner les beignets et les frire dans l''huile bien chaude jusqu''à ce qu''ils soient dorés et gonflés.
4. Délayer la farine de maïs à froid pour éviter les grumeaux, puis la cuire doucement en remuant jusqu''à épaississement de la bouillie.
5. Servir chaud, en associant les trois éléments dans la même assiette.

**Le saviez-vous**
Bon marché et complet (protéines des haricots, glucides du maïs et du blé, lipides de l''huile rouge), le BHB fait vivre tout un secteur informel de vendeuses de rue et est devenu un véritable marqueur d''identité urbaine.

— Source : ITAG — https://itag-fr.com/lecon.php?id=1928', NULL, 'National', NULL, NULL),
  ('RECIPE', 'Foufou (de manioc ou de maïs)', '**Origine**
Le foufou (aussi écrit fufu, et appelé « couscous » dans les régions francophones du Cameroun) est un accompagnement amylacé répandu dans tout le pays et plus largement en Afrique centrale. Selon les régions, on le prépare à partir de manioc, de maïs, de mil, de plantain ou d''igname.

**Ingrédients**
- Farine de manioc (ou manioc pilé), ou farine de maïs
- Eau
- Une pincée de sel

**Préparation**
1. Porter l''eau à ébullition dans une grande marmite.
2. Verser progressivement la farine en pluie tout en remuant sans arrêt avec une spatule en bois pour éviter les grumeaux.
3. Baisser le feu et continuer à travailler la pâte énergiquement jusqu''à obtenir une texture lisse et homogène.
4. Couvrir et laisser cuire encore quelques minutes à feu doux ; la pâte est prête lorsqu''elle se détache des parois et devient ferme et élastique.
5. Façonner en boules avec les mains légèrement humides.

**Le saviez-vous**
Le foufou est avant tout un support neutre destiné à accompagner les sauces fortes : on le mange traditionnellement avec le ndolé, l''eru, la sauce gombo, la sauce graine ou l''egusi. Au Cameroun, la version de manioc est parfois légèrement fermentée, ce qui lui donne un goût acidulé caractéristique.

— Source : Nkosi Agro — https://www.nkosiagro.com/blogs/culture-africaine/preparation-du-foufou-de-manioc', NULL, 'National', NULL, 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Ghana_fufu.jpg'),
  ('RECIPE', 'Sauce gombo', '**Origine**
La sauce gombo est une sauce gluante très répandue au Cameroun, notamment dans le Sud et le Centre. La version aux feuilles fraîches de gombo y est traditionnelle ; ces feuilles sont parfois confondues avec la corète potagère (le kelen kelen ou faux gombo).

**Ingrédients**
- Feuilles fraîches de gombo (ou gombos frais hachés)
- Viande cuite et poisson fumé
- Huile de palme
- Oignon
- Poudre d''écrevisses
- Épices : muscade africaine, clous de girofle, poivre africain (pèbè)
- Un peu de bicarbonate ou de potasse, sel, piment (facultatif)

**Préparation**
1. Nettoyer les feuilles dans l''eau salée puis les couper grossièrement.
2. Les faire bouillir 5 à 7 minutes avec un peu de bicarbonate ou de potasse, puis les égoutter ; la potasse (kanwa) aide à conserver le caractère filant du gombo.
3. Mixer un oignon et écraser légèrement les feuilles cuites.
4. Faire revenir l''oignon restant dans l''huile de palme, ajouter la pâte d''oignon et les épices moulues, laisser cuire deux minutes.
5. Incorporer la viande, le poisson fumé et la poudre d''écrevisses, laisser mijoter quelques minutes.
6. Ajouter les feuilles écrasées, mélanger et laisser mijoter encore deux minutes en remuant pour obtenir la texture filante caractéristique.

**Le saviez-vous**
Le gluant du gombo, recherché à table, dépend beaucoup du sel gemme (kanwa) et de la cuisson : trop cuire ou trop remuer casse les fils. La sauce se sert chaude sur du couscous de manioc ou de maïs, du riz ou du foutou.

— Source : Camerdish — https://www.camerdish.com/recipes/sauce-aux-feuilles-fraiches-de-gombo/', NULL, 'Sud', NULL, NULL),
  ('RECIPE', 'Pèpè soup (soupe pimentée)', '**Origine**
Le pèpè soup (« pepper soup ») est une soupe de poisson épicée très appréciée au Cameroun, notamment dans les régions côtières. C''est un plat de partage, réputé réconfortant et revigorant, sans rattachement ethnique exclusif.

**Ingrédients**
- Poissons (machoiron, bar, capitaine ou carpe)
- Njansang (env. 20-25 graines)
- Cosses de pèbè (condiment camerounais)
- Tomates fraîches, oignon, gingembre frais
- Épices locales, cube d''assaisonnement ou crevette, sel
- Eau

**Préparation**
1. Nettoyer soigneusement les poissons et les découper en tronçons.
2. Faire légèrement brunir le njansang, brûler les cosses de pèbè puis les décortiquer ; écraser ensemble tous ces condiments.
3. Réunir le poisson et les condiments écrasés dans une casserole à fond épais et faire frémir quelques minutes à feu doux.
4. Ajouter environ un demi-litre d''eau et laisser cuire une quinzaine de minutes.
5. Incorporer le cube d''assaisonnement et prolonger la cuisson cinq minutes.

**Le saviez-vous**
Légère et très parfumée, cette soupe se sert bien chaude, souvent accompagnée de macabo, d''igname ou de riz ; elle est traditionnellement réputée pour son effet réchauffant et reconstituant.

— Source : Afrik.com — https://www.afrik.com/pepe-soup-du-cameroun', NULL, 'Littoral', NULL, NULL),
  ('PEOPLE', 'Les Bamiléké', '**Origines** — Les Bamiléké sont un peuple bantou des hauts plateaux volcaniques de l''Ouest camerounais (le « Grassland »). La tradition, reprise par des auteurs comme Dieudonné Toukam, fait remonter leurs origines à d''anciennes migrations venues du nord, parfois reliées symboliquement à la vallée du Nil. Initialement regroupés sous une autorité unique, ils se sont fragmentés à partir du XIVe siècle en une multitude de groupements dirigés par des chefs portant le titre de « Fo » (Fon). L''ethnonyme « Bamiléké » lui-même est récent : il résulte de la pénétration coloniale, à partir d''une expression locale désignant « les habitants des montagnes et des ravins ».

**Particularités culturelles** — Le pays bamiléké est aujourd''hui réparti sur sept départements (Bamboutos, Haut-Nkam, Hauts-Plateaux, Koung-Khi, Menoua, Mifi et Ndé) et compte une centaine de chefferies. Chaque royaume est dirigé par un Fon héréditaire, entouré de sociétés coutumières et de notables. Ces chefferies partagent de fortes similitudes culturelles tout en restant traversées par des rivalités. La société bamiléké est réputée pour son organisation communautaire, ses tontines, son sens du commerce et de l''entreprise, son art (perlage, masques d''éléphant, statuaire) et l''architecture remarquable des cases de chefferie.

**Histoire coloniale** — Sous le protectorat allemand du Kamerun (à partir de 1884), les hautes terres de l''Ouest furent progressivement soumises, puis, après la Première Guerre mondiale, le territoire passa sous mandat français. C''est surtout durant la période française que le pays bamiléké devint l''épicentre du nationalisme camerounais. L''Union des Populations du Cameroun (UPC), principal mouvement indépendantiste fondé en 1948 et dirigé notamment par Ruben Um Nyobè, comptait de nombreux militants bamiléké et réclamait indépendance et réunification. Interdite en 1955, l''UPC bascula dans la lutte armée et organisa des maquis, en particulier en pays bamiléké et en pays bassa. L''administration coloniale française, puis le gouvernement camerounais après l''indépendance de 1960, y menèrent une répression d''une violence extrême : ratissages, bombardements, camps de regroupement et d''internement (comme celui de Bangou). Ruben Um Nyobè fut tué en septembre 1958 ; Félix Moumié fut empoisonné à Genève en 1960 ; Ernest Ouandié, dernier grand chef du maquis, fut capturé puis exécuté publiquement à Bafoussam en janvier 1971. Le bilan humain de cette répression, qui s''étend selon les sources de 1955-1958 jusqu''au milieu des années 1960, fait l''objet d''estimations très divergentes et controversées, allant de plusieurs dizaines de milliers à des chiffres beaucoup plus élevés.

**Aujourd''hui** — Les Bamiléké vivent principalement dans la région de l''Ouest du Cameroun, mais forment aussi de fortes communautés dans les grandes villes (Douala, Yaoundé) et au sein de la diaspora, où ils sont très présents dans le commerce et l''entrepreneuriat.

— Source : Wikipédia (fr) — https://fr.wikipedia.org/wiki/Bamil%C3%A9k%C3%A9s', NULL, 'Ouest', 'Bamiléké', 'https://upload.wikimedia.org/wikipedia/commons/3/36/Bamileke_dressing.jpg'),
  ('PEOPLE', 'Les Beti (Ewondo et Eton)', '**Origines** — Les Beti forment un grand ensemble de peuples bantous du Centre du Cameroun, dont les Ewondo et les Eton sont parmi les composantes les plus importantes. Les Ewondo se désignent eux-mêmes « Bëti be Kóló » ou « Kóló-Bëti ». Avec les Boulou et les Fang, ils appartiennent au vaste groupe linguistique dit « Pahouin », issu de migrations venues du nord-est à travers la forêt équatoriale. Les Eton vivent surtout dans le Centre, où ils constituent l''un des groupes les plus nombreux après les Ewondo.

**Particularités culturelles** — Les Ewondo parlent le kóló (souvent appelé « ewondo »), langue bantoue de grande diffusion dans la région de Yaoundé. La société beti est organisée en clans (Ewondo, Bene, Edzoa, Emombo…) eux-mêmes subdivisés en lignages identifiés par les « Mvog » (maisons familiales), qui structurent la généalogie. La tradition orale, les rites, la parenté et les liens claniques tiennent une place centrale.

**Histoire coloniale** — Dès 1884, les Allemands intégrèrent les terres beti à leur colonie du Kamerun. En 1889, ils établirent une station permanente qu''ils nommèrent « Jaunde » (Yaoundé), d''après le peuple local. Après la défaite de la résistance, notamment celle d''Omgba Bisogo vers 1895, l''opposition ewondo déclina et l''administration allemande s''appuya sur des chefs locaux. La figure majeure de cette période est Charles Atangana (1880-1943), officiellement intronisé chef supérieur des Ewondo et des Bané le 25 mars 1914 sous l''administration allemande. Il joua un rôle déterminant dans l''essor de Yaoundé, favorisa l''implantation des missions catholiques (Pallottins) et l''évangélisation du Centre et du Sud. Après la Première Guerre mondiale, le territoire passa sous mandat français ; Atangana, un temps écarté, fut rétabli dans ses fonctions et demeura une figure d''intermédiation entre la population et l''administration coloniale jusqu''à sa mort en 1943.

**Aujourd''hui** — Les Beti, Ewondo et Eton vivent principalement dans la région du Centre du Cameroun, autour de Yaoundé, capitale politique du pays.

— Source : Wikipédia (fr) — https://fr.wikipedia.org/wiki/Ewondo_(peuple)', NULL, 'Centre', 'Beti (Ewondo, Eton)', 'https://upload.wikimedia.org/wikipedia/commons/9/91/Charles_Atangana_portrait.jpg'),
  ('PEOPLE', 'Les Bulu', '**Origines** — Les Bulu (ou Boulou) sont un peuple bantou du Sud du Cameroun, appartenant à l''ensemble Ekang/Pahouin, qu''ils partagent avec les Beti et les Fang. La tradition rattache leur ascendance à un ancêtre commun et les rattache aux grandes migrations venues du bassin du Congo et du nord, qui les ont conduits progressivement vers la forêt méridionale du Cameroun entre le XVe et le XIXe siècle.

**Particularités culturelles** — Les Bulu parlent le bulu, langue bantoue comptant plusieurs centaines de milliers de locuteurs. Sous l''influence des missions, le bulu a longtemps servi de langue véhiculaire dans l''enseignement, la religion et le commerce dans le Sud, un rôle aujourd''hui en recul. La société est dirigée par des chefferies héréditaires et organisée en clans et lignages, sur le modèle des peuples apparentés.

**Histoire coloniale** — La progression des Bulu vers le sud et la côte fut stoppée par les forces coloniales allemandes à la fin du XIXe siècle. La période allemande du Kamerun a profondément marqué la région : elle vit notamment l''engagement de Martin-Paul Samba, originaire bulu, formé en Allemagne, qui devint un résistant à la domination coloniale ; il fut exécuté par les Allemands en 1914, au début de la Première Guerre mondiale, pour avoir comploté contre eux. La christianisation des Bulu fut largement portée par les missionnaires presbytériens américains, qui contribuèrent à la diffusion de l''écrit en langue bulu. Après 1916, le Cameroun méridional passa sous mandat français.

**Aujourd''hui** — Les Bulu vivent principalement dans la région du Sud du Cameroun. Ce groupe a donné au pays des personnalités politiques de premier plan, notamment l''ancien Premier ministre Charles Assalé et le président Paul Biya.

— Source : Wikipédia (fr) — https://fr.wikipedia.org/wiki/Boulou_(peuple)', NULL, 'Sud', 'Bulu', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Masque_boulou-Cameroun.jpg'),
  ('PEOPLE', 'Les Fang', '**Origines** — Les Fang forment un peuple bantou d''Afrique centrale, présent dans le sud du Cameroun, le nord et l''ouest du Gabon, en Guinée équatoriale (où ils sont largement majoritaires) ainsi que dans le nord-ouest du Congo. Avec les Beti et les Boulou du Cameroun, ils constituent le groupe dit « Pahouin ». Leur histoire est marquée par une longue migration : partis vers la fin du XVIIIe siècle de la savane de la rive droite de la Sanaga, sans doute sous la pression des Peul, ils progressèrent vers le sud-ouest à travers la forêt équatoriale. La tradition orale conserve le mythe de « la marche des enfants d''Afiri-Kara », récit de cette avancée migratoire périlleuse.

**Particularités culturelles** — Les Fang parlent une langue bantoue réputée pour sa richesse et ses expressions figurées. La société est organisée en plusieurs grandes tribus (Ntumu, Okak, Nzaman, Mvaï…) subdivisées en clans exogames. La culture fang est mondialement connue pour le culte des ancêtres « byeri » : les familles conservaient des reliquaires contenant des ossements ancestraux, gardés par des statues de bois finement sculptées qui ont profondément influencé l''art occidental moderne. Le « mvet », épopée chantée accompagnée d''un instrument à cordes du même nom, transmet récits et cosmologie.

**Histoire coloniale** — La migration des Fang vers le sud prit fin à la fin du XIXe siècle, arrêtée à la fois par l''océan et par l''administration coloniale (française au Gabon, allemande puis française pour la partie camerounaise). Dès les années 1840, les traitants signalaient leur présence dans l''arrière-pays. La partie nord du peuple, située au sud du Cameroun, fut intégrée à la colonie allemande du Kamerun, puis passa après 1916 sous mandat français. Les autorités coloniales et les missionnaires combattirent certaines pratiques traditionnelles, et le terme « Pahouin », d''origine coloniale, fut finalement abandonné au profit de l''ethnonyme « Fang » revendiqué par le peuple lui-même.

**Aujourd''hui** — Au Cameroun, les Fang vivent principalement dans la région du Sud, vers la frontière avec le Gabon et la Guinée équatoriale (zone d''Ambam, Ntumu). Ils restent un peuple transfrontalier majeur d''Afrique centrale.

— Source : Wikipédia (fr) — https://fr.wikipedia.org/wiki/Fang_(peuple)', NULL, 'Sud', 'Fang', 'https://upload.wikimedia.org/wikipedia/commons/8/88/A_Fang_family_%28c.1912%29.jpg'),
  ('PEOPLE', 'Les Douala', '**Origines**
Les Douala (Duala) forment l''un des peuples côtiers regroupés sous le nom de *Sawa* (« gens de la côte »). La tradition rapporte qu''ils sont issus d''une migration partie d''une zone située entre le Gabon et le Congo, remontant progressivement vers le nord jusqu''à l''estuaire du fleuve Wouri. Ils se réclament d''un ancêtre fondateur, Ewale (d''où viendrait l''ethnonyme « Du''Ewale »), et rencontrèrent sur place les Bassa et les Bakoko avant de s''établir durablement sur les rives du Wouri, là où s''est développée l''actuelle ville de Douala.

**Particularités culturelles**
Les Douala parlent le *duala*, langue bantoue qui a longtemps servi de langue véhiculaire et littéraire sur le littoral. La société se structure en grands cantons issus des lignages royaux — notamment Akwa, Bell, Deido et Bonabéri (Bèlè-Bèlè). La grande fête identitaire des peuples Sawa est le **Ngondo**, assemblée traditionnelle annuelle célébrée au bord du Wouri : elle mêle rituel de communication avec les génies des eaux, courses de pirogues et affirmation culturelle. Les courses de pirogues et les sociétés coutumières y tiennent une place importante.

**Histoire coloniale**
Le 12 juillet 1884, les rois douala — au premier rang desquels Ndumbè Lobè Bell (clan Bell) et Akwa Dika Mpondo (clan Akwa) — signent avec les représentants des firmes hanséatiques (Woermann, Jantzen et Thormählen) le **traité germano-douala**, qui place le territoire sous protectorat allemand tout en censant garantir aux autochtones leurs terres et leur commerce. À partir de 1910, l''administration allemande, sous l''impulsion du gouverneur Theodor Seitz, projette d''exproprier les Douala du **plateau Joss**, le long du fleuve, pour y créer un quartier réservé aux Européens et un grand port, repoussant les populations vers l''intérieur. Les expropriations sont engagées en janvier 1913 malgré les protestations. **Rudolf Duala Manga Bell**, roi du clan Bell, formé au droit à l''université de Bonn, prend la tête de la résistance : il invoque le traité de 1884, multiplie pétitions et recours, alerte le Reichstag (1911-1912) et cherche des appuis extérieurs. Accusé de haute trahison, il est jugé à la hâte au début de la Première Guerre mondiale et **pendu le 8 août 1914**, en même temps que son secrétaire Adolf Ngoso Din. Il demeure une figure majeure du nationalisme camerounais. Après 1916-1919, le Cameroun passe sous mandat français pour sa plus grande partie.

**Aujourd''hui**
Les Douala vivent principalement dans la région du **Littoral**, autour de la métropole de Douala, capitale économique du Cameroun.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Duala_(peuple)', NULL, 'Littoral', 'Douala (Sawa)', 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Rudolf_Manga.jpg'),
  ('PEOPLE', 'Les Bassa', '**Origines**
Les Bassa (ou Basaa) sont un peuple bantou dont la tradition orale fait remonter les origines à la vallée du Nil ou à la Nubie, avec une longue migration vers le sud-ouest, passant par la région du lac Tchad (Kanem-Bornou) à la suite d''invasions et de bouleversements. Leur grand mythe fondateur est celui de **Ngog Lituba**, le « rocher percé » sacré situé près d''Edéa, considéré comme le berceau commun des Bassa, des Bakoko (Elog-Mpo''o) et des Bati. À partir du XVe siècle environ, les différents clans familiaux se dispersent depuis ce site vers la côte et les forêts de l''intérieur.

**Particularités culturelles**
Ils parlent le *basaa*, langue bantoue (zone A). La société précoloniale était patrilinéaire et fortement hiérarchisée. La religion traditionnelle, parfois appelée *Nyambéisme*, est centrée sur Nyambe (Dieu) et accorde une grande place au culte des ancêtres et aux sociétés initiatiques. La gastronomie bassa est réputée, avec des plats emblématiques comme le *mintoumba* (pain de manioc) et la sauce *bongo''o*.

**Histoire coloniale**
Sous l''administration allemande (à partir de 1884), le pays bassa connaît des épisodes de résistance, associés à des figures comme Mahop ma Mbom. Après le passage du territoire sous mandat français (1919), l''administration ouvre des postes en pays bassa, notamment à Ngambè en 1927. De nombreux Bassa s''engagent aux côtés des Français durant la Seconde Guerre mondiale ; de retour au pays, imprégnés d''idées nouvelles, beaucoup rejoignent les mouvements nationalistes. Les Bassa constituent, avec les Bamiléké, l''un des principaux foyers de l''**Union des populations du Cameroun (UPC)**, premier grand parti indépendantiste, dont le secrétaire général **Ruben Um Nyobé** est lui-même bassa. L''interdiction du parti et la répression de l''insurrection upéciste à la fin des années 1950 frappent durement le pays bassa ; Um Nyobé est tué en 1958.

**Aujourd''hui**
Les Bassa sont aujourd''hui présents principalement dans les régions du **Littoral**, du **Centre** et du **Sud** du Cameroun.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Bassa_(peuple)', NULL, 'Littoral, Centre, Sud', 'Bassa', 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Ngog-Lituba_01.jpg'),
  ('PEOPLE', 'Les Bamoun', '**Origines**
Les Bamoun (Bamouns) sont un peuple des Grassfields de l''Ouest camerounais, partageant des ancêtres communs avec les Tikar et les Bamiléké. Selon la tradition, le royaume bamoun est fondé vers la fin du XIVe siècle (vers 1394) par Nchare Yen, qui établit sa capitale à **Foumban**. Le royaume connaît son apogée au XVIIIe siècle et s''impose comme l''un des États les plus structurés de la région.

**Particularités culturelles**
Le royaume, devenu sultanat après l''islamisation, est dirigé par une dynastie qui compte aujourd''hui une vingtaine de souverains. Les Bamoun sont célèbres pour leur **écriture propre**, le *shü-mom* (système « a ka u ku »), l''une des rares écritures conçues en Afrique subsaharienne, inventée et perfectionnée par le sultan Njoya. L''artisanat (travail du bronze, perles, broderies) et le palais royal de Foumban, doublé d''un musée, témoignent d''un riche patrimoine. La langue bamoun appartient au groupe bantoïde des Grassfields.

**Histoire coloniale**
La grande figure est le **sultan Ibrahim Njoya**, monté sur le trône à la fin du XIXe siècle. Pendant la période allemande (le Cameroun est *Kamerun* de 1884 à 1916, l''administration s''installant en pays bamoun au début du XXe siècle), Njoya entretient d''excellentes relations avec les Allemands, ce qui lui permet de mener ses grandes innovations : mise au point de son alphabet (réduit progressivement à quatre-vingts signes), création d''écoles, installation d''une imprimerie au palais pour diffuser livres et journaux en langue bamoun, rédaction d''une histoire monumentale du royaume, travaux de cartographie, et même élaboration d''une religion syncrétique. Après le départ des Allemands, l''administration **française** se montre beaucoup plus méfiante : elle démantèle progressivement le pouvoir royal, interdit l''usage des langues et de l''écriture locales — frappant en particulier le système de Njoya — puis destitue le sultan et l''exile à Yaoundé, où il meurt en 1933.

**Aujourd''hui**
Les Bamoun vivent essentiellement dans la région de l''**Ouest**, dans le département du Noun, autour de leur capitale historique Foumban.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Bamoun_(peuple)', NULL, 'Ouest', 'Bamoun', 'https://upload.wikimedia.org/wikipedia/commons/6/62/Njoya_of_Bamun.jpg'),
  ('PEOPLE', 'Les Tikar', '**Origines**
Les Tikar sont un peuple du Cameroun central dont les traditions évoquent une migration ancienne, parfois rapportée à la vallée du Nil ou à la Nubie, puis à un passage par le plateau de l''Adamaoua et le pays mboum. À partir du XVIIIe siècle environ, les Tikar descendent par petits groupes vers le sud et l''ouest, depuis des localités comme Tibati, Banyo et Bankim (Kimi), pour s''établir dans la plaine Tikar. Plusieurs chercheurs évoquent l''existence, à partir du XVIe siècle, d''un vaste ensemble politique tikar s''étendant de l''Adamaoua jusqu''aux abords de la vallée de Yoko.

**Particularités culturelles**
Les Tikar sont organisés en **chefferies traditionnelles** : le chef (fon) est entouré de cercles de notables, parmi lesquels des « frères de sang » et des cousins faisant office de ministres. Ils parlent le *tikar*, langue bantoïde. On leur reconnaît une parenté historique et culturelle avec les Bamoun, les Nso, les Bafia et les Bamiléké, parenté qui se reflète dans des structures sociales et des traits linguistiques voisins. Leur art — masques, statuaire et objets liés à la fécondité — est recherché.

**Histoire coloniale**
La documentation sur l''expérience coloniale proprement tikar reste limitée. La région est intégrée au *Kamerun* allemand, puis, après 1916-1919, répartie dans les zones sous administration française et britannique au gré du partage du Cameroun. En 1946, l''administration française émet une série de timbres consacrée aux femmes tikar, signe de l''intérêt porté à ce peuple. Faute de sources abondantes, cette période est moins bien renseignée que pour les peuples côtiers ou le royaume bamoun.

**Aujourd''hui**
Les Tikar occupent principalement le Cameroun central, à la charnière des régions du **Centre** (Mbam-et-Kim) et de l''**Adamaoua**, notamment autour de Bankim.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Tikar_(peuple)', NULL, 'Centre, Adamaoua', 'Tikar', 'https://upload.wikimedia.org/wikipedia/commons/3/39/Tikar_Mask.jpg'),
  ('PEOPLE', 'Les Peuls (Foulbé)', '**Origines**

Les Peuls (appelés *Foulbé* au Cameroun, *Fulɓe* en pluriel pulaar) sont un peuple pasteur dispersé à travers le Sahel et l''Afrique de l''Ouest. Leur grande vague migratoire atteint la région du lac Tchad à la fin du XVIe siècle, puis s''implante progressivement dans l''actuel Adamaoua. Au début du XIXe siècle, dans le sillage du jihad lancé par Ousman dan Fodio à Sokoto, le chef et lettré Modibo Adama (1786-1844) conduit la guerre sainte sur les plateaux camerounais. Il unifie les territoires conquis en un vaste émirat — l''Adamawa, nommé d''après lui — dont la capitale est établie à Yola. Les Foulbé deviennent ainsi la puissance dominante du Nord, organisée en une vingtaine de **lamidats** vassaux (Ngaoundéré, Tibati, Banyo, Tignère, Maroua, etc.).

**Particularités culturelles**

Les Foulbé parlent le *fulfulde* (ou peul de l''Adamaoua), qui s''est imposé comme langue véhiculaire de tout le Nord-Cameroun. Profondément musulmans, ils ont diffusé l''islam dans la région. Leur organisation sociale repose sur les lamidats, chefferies dirigées par un *lamido* (chef traditionnel) entouré d''une cour de dignitaires ; les palais et grandes mosquées, comme à Ngaoundéré, en sont les symboles. La société peule valorise le code moral du *pulaaku* (réserve, dignité, maîtrise de soi) et l''élevage bovin reste un marqueur identitaire central.

**Histoire coloniale**

À l''arrivée des Allemands (Kamerun, à partir de 1884), le Nord constitue le *Hinterland* de la colonie. L''administration allemande, puis française après 1916, choisit de s''appuyer sur les lamidats existants plutôt que de les démanteler : c''est une forme d''administration indirecte qui consolide le pouvoir des lamidos sur les populations soumises, y compris les groupes non musulmans de la plaine et des montagnes. Cette alliance renforce durablement l''aristocratie peule, qui sert d''intermédiaire fiscal et administratif. Les pratiques serviles héritées de la période précoloniale persistent longtemps dans les lamidats de l''Adamaoua, malgré les mesures officielles d''abolition. Sous mandat français, les autorités s''appuient sur ces chefferies pour encadrer le Nord, ancrant l''influence politique foulbé qui se prolongera après l''indépendance.

**Aujourd''hui**

Les Foulbé représentent une part importante de la population du Cameroun et vivent principalement dans les régions de l''Adamaoua, du Nord et de l''Extrême-Nord, ainsi que dans certaines zones de l''Ouest. Ngaoundéré, Maroua, Garoua et Tibati demeurent des centres majeurs de la culture peule.

— Source : Wikipédia — Peuls — https://fr.wikipedia.org/wiki/Peuls', NULL, 'Adamaoua, Nord, Extrême-Nord', 'Peuls (Foulbé)', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/LamidoGrandMosque.jpg'),
  ('PEOPLE', 'Les Kirdi', '**Origines**

*Kirdi* n''est pas le nom d''un peuple unique mais un terme collectif — d''origine kanouri-arabe, longtemps péjoratif, signifiant « païen » — appliqué par les populations musulmanes de la plaine à l''ensemble des groupes montagnards du Nord-Cameroun qui ont refusé l''islamisation. Il rassemble en réalité des dizaines de populations très différentes (Mafa, Mofou, Kapsiki, Fali, Mada, Dowayo, Moundang, etc.), parlant surtout des langues tchadiques. Le refuge dans les massifs du Mandara et leurs contreforts remonte à plusieurs siècles : le mouvement s''accentue dès le XVIe siècle pour fuir les razzias d''esclaves des empires islamisés de Bornou et du Baguirmi, puis la pression des lamidats peuls. Cette histoire de résistance a forgé une culture défensive : habitats fortifiés, villages perchés, méfiance envers les pouvoirs de la plaine.

**Particularités culturelles**

Les Kirdi pratiquaient traditionnellement des religions ancestrales (culte des ancêtres, divination, sacrifices) plutôt que l''islam. Leur organisation sociale est souvent segmentaire et décentralisée, sans grandes chefferies centralisées comparables aux lamidats — un contraste marqué avec la société peule voisine. L''agriculture en terrasses sur les pentes des monts Mandara, l''architecture de pierre et de banco, la métallurgie du fer et un riche artisanat rituel comptent parmi leurs marqueurs culturels.

**Histoire coloniale**

Le terme et la catégorie « kirdi » se figent largement à l''époque coloniale. En s''appuyant sur les lamidats peuls pour administrer le Nord (administration indirecte), Allemands puis Français renforcent la domination des plaines musulmanes sur les montagnards. Durant les premières décennies du mandat, la France consacre beaucoup d''efforts à « pacifier » et soumettre les groupes montagnards rétifs à l''autorité coloniale et aux chefs imposés. Les missions chrétiennes s''implantent ensuite dans ces zones, entraînant des conversions au catholicisme et au protestantisme. La distinction administrative et sociale entre « Foulbé » dominants et « Kirdi » dominés s''enracine alors durablement dans la structure politique du Nord.

**Aujourd''hui**

Les populations regroupées sous le terme kirdi vivent principalement dans les régions de l''Extrême-Nord et du Nord du Cameroun (massifs du Mandara, de Garoua à Mora), ainsi que dans le sud du Tchad. Beaucoup se sont depuis converties à l''islam ou au christianisme, et le mot « kirdi » est aujourd''hui contesté en raison de sa charge péjorative.

— Source : Wikipédia — Kirdi — https://fr.wikipedia.org/wiki/Kirdi', NULL, 'Extrême-Nord, Nord', 'Kirdi (peuples montagnards)', 'https://upload.wikimedia.org/wikipedia/commons/0/00/Camerun%2C_kirdi%2C_valuta_in_ferro%2C_xx_sec._02.JPG'),
  ('PEOPLE', 'Les Bakweri', '**Origines**

Les Bakweri (qui se nomment eux-mêmes *Mokpe* / *Mòkpè*) sont une population bantoue du groupe sawa, installée sur les flancs du mont Cameroun (mont Fako) et le long de la côte voisine. Selon la tradition orale, ils seraient originaires de la région ibibio, au sud-ouest de la montagne, et auraient migré vers leur habitat actuel, à l''est du mont Cameroun, vers le milieu du XVIIIe siècle.

**Particularités culturelles**

Les Bakweri parlent le *mòkpè*, langue bantoue côtière. Leur économie traditionnelle repose sur l''agriculture vivrière (taro/macabo, plantain) sur les sols volcaniques très fertiles des pentes du Fako, et sur la pêche près de la côte. La société s''organise autour de villages et de chefferies, avec des sociétés rituelles et des danses (dont l''*elephant dance*/*malé*) marquant la vie cérémonielle.

**Histoire coloniale**

Après l''établissement du protectorat allemand sur le Kamerun en 1884, les Allemands découvrent que les terres volcaniques autour du mont Cameroun, territoire bakweri, constituent un paradis agricole. Ils y mènent une politique de confiscation massive des terres indigènes au profit de grandes plantations commerciales (notamment de bananes). Par la contrainte et une série de lois foncières répressives (Crown Lands Act de 1896, mesures de 1903), l''administration coloniale aliène des centaines de kilomètres carrés parmi les terres les plus fertiles du Fako, dépossédant les Bakweri sans véritable compensation. En 1901, les Allemands transfèrent leur capitale de Douala vers Buéa, en pays bakweri. Faute d''une main-d''œuvre locale suffisante et coopérative, les colons font venir des travailleurs de l''intérieur (Bamiléké notamment). Après la défaite allemande de 1918, les Britanniques administrent le Cameroun méridional par *indirect rule*, via les chefs bakweri, mais le problème foncier perdure (revendications notamment en 1946). De cette longue spoliation naît le **Bakweri Land Claims Committee (BLCC)**, qui réclame la restitution des terres expropriées — aujourd''hui gérées par la Cameroon Development Corporation (CDC) — un contentieux porté jusque devant les instances africaines des droits de l''homme.

**Aujourd''hui**

Les Bakweri vivent principalement dans la région du Sud-Ouest du Cameroun, surtout autour de Buéa, sur les pentes du mont Cameroun et dans les villages côtiers voisins, en zones aussi bien urbaines que rurales.

— Source : Wikipédia — Bakweri — https://fr.wikipedia.org/wiki/Bakweri', NULL, 'Sud-Ouest', 'Bakweri (Mokpe)', 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Bakweri_cocoyam_farmer_from_Cameroon.jpg'),
  ('PEOPLE', 'Les Maka', '**Origines**

Les Maka (ou Makaa) sont une population bantoue de la forêt méridionale, rattachée au groupe linguistique makaa-njem. Leurs ancêtres seraient entrés dans l''actuel Cameroun depuis le bassin du fleuve Congo entre le XIVe et le XVIIe siècle. Au XIXe siècle, ils occupaient les terres au nord du fleuve Lom, à la frontière des actuelles régions de l''Est et de l''Adamaoua. La poussée des peuples Beti-Pahuin — eux-mêmes refoulés vers le sud par les Vute et les Mboum fuyant les guerriers peuls — repousse alors les Maka-Njem plus au sud, vers leur habitat actuel à la lisière de la savane et de la forêt, autour des hauts cours du Nyong et de la Doumé.

**Particularités culturelles**

Les Maka parlent le *maka* (makaa), langue bantoue. Leur organisation sociale est relativement égalitaire et décentralisée, sans pouvoir centralisé fort, la réciprocité y étant une valeur clé. L''économie repose sur une agriculture sur brûlis pratiquée dans de petites clairières gagnées sur la forêt (manioc, plantain, maïs, taro, arachide). Les croyances liées aux esprits ancestraux et aux forces de la forêt restent fortes ; la divination et, traditionnellement, des autopsies publiques visant à déterminer la cause des décès font partie des pratiques rituelles, souvent coexistant avec le christianisme.

**Histoire coloniale**

Les Maka du Sud-Est camerounais ont connu la conquête coloniale allemande puis l''administration française, étudiées en détail par l''anthropologue Peter Geschiere (*Village communities and the state*, 1982), qui analyse l''évolution de leurs communautés villageoises face à l''État depuis la conquête coloniale. Région forestière enclavée, le pays maka est marqué par l''imposition du travail et des cultures de rente, l''implantation des missions chrétiennes et l''encadrement administratif des villages, qui transforment les rapports de pouvoir locaux tout en laissant subsister les institutions lignagères.

**Aujourd''hui**

Les Maka vivent principalement dans la région de l''Est du Cameroun, autour d''Abong-Mbang, de Doumé et de Nguélémendouka (département du Haut-Nyong), avec des prolongements au nord du Gabon et de la Guinée équatoriale.

— Source : Wikipédia — Maka (peuple) — https://fr.wikipedia.org/wiki/Maka_(peuple)', NULL, 'Est', 'Maka (Makaa)', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Maka_woman_going_to_fields.jpg'),
  ('PEOPLE', 'Les Gbaya', '**Origines** — Les Gbaya (ou Baya) sont une population oubanguienne d''Afrique centrale. Selon les traditions, ils seraient originaires des régions septentrionales de l''actuelle République centrafricaine et du Nigeria, d''où ils ont migré vers le sud et l''est sous la pression des invasions peules et de la traite. Ils ont traversé les vallées de l''Aouk puis de l''Ouham, certains groupes atteignant la Bénoué et le plateau de l''Adamaoua. Ils occupent aujourd''hui l''ouest de la Centrafrique et le centre-est du Cameroun.

**Particularités culturelles** — Le gbaya appartient au groupe des langues oubanguiennes et se subdivise en plusieurs sous-groupes (Bodomo, Bokoto, Bouli, Kaka, Kara, Lai...). Société de tradition orale, l''organisation gbaya est historiquement décentralisée et acéphale, fondée sur des clans patrilinéaires, sans royaume centralisé comparable aux grands États ouest-africains. Une partie de la population est aujourd''hui musulmane, le reste partageant des croyances traditionnelles et le christianisme.

**Histoire coloniale** — Sous administration française (Oubangui-Chari et Cameroun), les Gbaya subirent durement l''exploitation coloniale : recrutement forcé de main-d''œuvre pour le chemin de fer Congo-Océan, extraction du caoutchouc (latex) au profit des compagnies concessionnaires, lourdes taxes et abus des auxiliaires indigènes. À partir de 1924, Barka Ngainoumbey, dit Karnou (« celui qui peut changer le monde »), prophète, guérisseur et féticheur gbaya du bassin de la Sangha, prêcha une résistance non violente au colonisateur, rassemblant ses partisans autour d''un symbole, le manche de houe — d''où le nom de « guerre du manche de houe ». Selon les sources, le mouvement réunit plus de 350 000 adhérents, dont environ 60 000 combattants, constituant une unité politique inédite dans la région. Le soulèvement armé éclata au milieu de 1928 et se propagea à travers l''Oubangui-Chari et le Cameroun français (régions de Bouar et Baboua) ainsi que dans le sud du Tchad. Karnou fut tué par une patrouille militaire française le 11 décembre 1928, mais la révolte se poursuivit jusqu''à sa répression en 1931 ; les meneurs furent emprisonnés et exécutés. La guerre du Kongo-Wara reste la plus vaste insurrection de l''entre-deux-guerres en Afrique équatoriale française et au Cameroun français.

**Aujourd''hui** — Les Gbaya vivent principalement dans la région de l''Est du Cameroun (autour de Bertoua et Garoua-Boulaï) ainsi qu''à l''ouest de la République centrafricaine.

— Source : Wikipédia (français) — https://fr.wikipedia.org/wiki/Guerre_du_Kongo-Wara', NULL, 'Est', 'Gbaya', 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Karnou_%2828602315084%29.jpg'),
  ('PEOPLE', 'Les Massa', '**Origines** — Les Massa (ou Masa) occupent les plaines inondables qui bordent le fleuve Logone, de part et d''autre de la frontière entre le Cameroun et le Tchad. L''homogénéité de leurs lignages patrilinéaires, tous d''une profondeur équivalente, suggère une implantation ancienne et continue plutôt que plusieurs vagues migratoires successives.

**Particularités culturelles** — La langue massa appartient à la famille des langues tchadiques, même si sa classification interne ne fait pas l''unanimité. Avant la colonisation, la société était acéphale, organisée autour du farana (communauté de base) et du nagata (territoire), sous l''autorité rituelle du « maître de la terre » (bum nagata), descendant des premiers occupants et garant des rites agraires. Éleveurs de bovins, agriculteurs (mil) et pêcheurs, les Massa accordent au bétail un rôle social central : il sert notamment de valeur d''échange pour l''acquisition d''une épouse (dot). La cure d''engraissement laitier dite guruna est une tradition emblématique, récemment reconnue par l''UNESCO au titre du patrimoine culturel immatériel. Leur cosmogonie s''articule autour de Lawna (divinité créatrice) et de Nagata (la terre).

**Histoire coloniale** — Les plaines du Logone furent rattachées au Kamerun allemand à la fin du XIXe siècle, puis, après la Première Guerre mondiale et le démantèlement de la colonie allemande, intégrées à la partie du Cameroun placée sous mandat français — la frontière coloniale séparant dès lors les Massa entre le Cameroun et le Tchad. Société dépourvue de pouvoir centralisé, les Massa furent administrés par l''intermédiaire de chefs de canton institués par le colonisateur, mode de gestion indirecte courant pour les peuples acéphales de la région.

**Aujourd''hui** — Au Cameroun, les Massa vivent principalement dans le département du Mayo-Danay (région de l''Extrême-Nord) ; ils sont également présents au Tchad, dans la région du Mayo-Kebbi Est.

— Source : Wikipédia (français) — https://fr.wikipedia.org/wiki/Massa_(peuple)', NULL, 'Extrême-Nord', 'Massa', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Sar%C3%A9_masa.JPG'),
  ('PEOPLE', 'Les Toupouri', '**Origines** — Les Toupouri (Tupuri) sont une population du Grand Nord camerounais et du sud-ouest du Tchad. Selon les traditions orales recueillies au XXe siècle, ils auraient d''abord occupé les environs de la colline d''Illi, au Tchad, avant que des scissions claniques ne provoquent des migrations à la recherche de meilleures conditions de vie ; ils partagent une parenté ancienne avec les Moundang. Le village de Doré, près de Fianga (Tchad), est considéré comme leur capitale ancestrale.

**Particularités culturelles** — La langue toupouri compte plusieurs centaines de milliers de locuteurs répartis entre le Cameroun et le Tchad. Le pouvoir politique et religieux est incarné par le Wang Doré (ou wang koulou), chef-prêtre suprême doté d''une autorité sacrée qui investit les chefs locaux ; les jumeaux y jouissent d''un statut particulier d''« envoyés de Dieu ». La grande fête annuelle est le Feo Kaho (Féo-Kagué, « fête du coq »), célébration des récoltes — surtout du mil — et du passage de l''année, lancée par le Wang Doré entre septembre et octobre, au cours de laquelle un coq est sacrifié. Le Gourna (gourna), danse et rite d''initiation masculine fondé sur une cure de lait et de bouillie préparant les jeunes hommes au mariage, constitue une autre institution emblématique, accompagnée de chants polyphoniques et de percussions.

**Histoire coloniale** — Les communautés toupouri figurent parmi les premières documentées par les explorateurs européens : l''officier français Henri Moll photographia leurs villages lors de missions de délimitation frontalière en 1905-1907. Rattachés au Kamerun allemand puis, après 1916, partagés entre le Cameroun sous mandat français et le Tchad, les Toupouri virent leur territoire coupé par la frontière coloniale, qui sépare encore aujourd''hui le peuple entre deux États. Société peu centralisée, ils conservèrent néanmoins l''autorité traditionnelle du Wang Doré sous l''administration coloniale.

**Aujourd''hui** — Au Cameroun, les Toupouri vivent surtout dans les départements du Mayo-Kani et du Mayo-Danay (région de l''Extrême-Nord), autour de localités comme Ndoukoula, Touloum et Golonghini ; ils sont également présents au sud-ouest du Tchad, dans la région de Fianga.

— Source : Wikipédia (français) — https://fr.wikipedia.org/wiki/Toupouri_(peuple)', NULL, 'Extrême-Nord', 'Toupouri', 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Toupouri_de_la_plaine_de_Extr%C3%AAme-Nord.jpg'),
  ('PEOPLE', 'Les Kotoko', '**Origines** — Les Kotoko se considèrent comme les descendants des Sao, peuple bâtisseur de la première grande civilisation du bassin du lac Tchad, dont l''apogée se situe entre le IXe et le XVe siècle et qui était réputée pour ses terres cuites et son travail raffiné du bronze. Héritiers des Sao, les Kotoko comptent parmi les plus anciennes ethnies de l''actuelle région de l''Extrême-Nord du Cameroun ; leur propre civilisation émerge vers le XVIe siècle, au sud du lac Tchad, sur les mêmes territoires que leurs ancêtres.

**Particularités culturelles** — Le kotoko désigne un ensemble de langues tchadiques. Plutôt qu''un État unique, les Kotoko s''organisèrent en cités-États ou principautés indépendantes — Kousséri, Makari, Goulfey, Mara et surtout Logone-Birni — où le prince ou sultan, choisi par les dignitaires, était intronisé au terme d''un long rituel. Très tôt attirés dans la sphère d''influence de l''empire Kanem-Bornou, les Kotoko du nord furent islamisés au cours du XIXe siècle ; des croyances traditionnelles subsistent toutefois, notamment celles liées aux esprits de l''eau.

**Histoire coloniale** — À la fin du XIXe siècle, les cités kotoko, déjà affaiblies par les bouleversements régionaux, passèrent sous la colonisation allemande dans le cadre du grand Kamerun. Après la Première Guerre mondiale et le démantèlement du Kamerun allemand, leur territoire fut partagé sous tutelle française (au Cameroun et au Tchad) et britannique (au Nigeria), divisant le peuple entre trois ensembles coloniaux. Les sultanats kotoko, tel celui de Logone-Birni, furent maintenus et intégrés à l''administration indirecte des puissances coloniales.

**Aujourd''hui** — Les Kotoko vivent principalement dans le département du Logone-et-Chari (région de l''Extrême-Nord du Cameroun), autour de Kousséri, Logone-Birni, Makari et Goulfey, ainsi qu''au Tchad et au nord-est du Nigeria.

— Source : Wikipédia (français) — https://fr.wikipedia.org/wiki/Kotoko_(peuple)', NULL, 'Extrême-Nord', 'Kotoko', 'https://upload.wikimedia.org/wikipedia/commons/2/28/The_Logon-Birni_-_general_view.jpg'),
  ('PEOPLE', 'Les Mafa', '**Origines**

Les Mafa — longtemps désignés par l''exonyme « Matakam » — sont une population de langue tchadique (famille afro-asiatique) installée dans la partie centrale des monts Mandara, à l''extrême nord du Cameroun, ainsi que dans le nord-est du Nigéria voisin. Refusant la domination des royaumes islamisés de la plaine, ils se sont réfugiés dans le massif montagneux dont l''inaccessibilité les a longtemps protégés. Ils y ont façonné un terroir agricole remarquable : les pentes escarpées sont aménagées en terrasses retenues par des murets de pierres sèches, où l''on cultive surtout le sorgho et le mil, complétés par le niébé et le sésame. Cette agriculture en terrasses, associée à un habitat dispersé sur les hauteurs, est emblématique de leur adaptation à un milieu difficile.

**Particularités culturelles**

Les Mafa parlent une langue tchadique. Leur société est acéphale, sans pouvoir centralisé, organisée en lignages et en clans. Leur système religieux traditionnel place un dieu créateur suprême, Jigilé, au-dessus d''un culte des ancêtres très vivant ; les poteries sacrées y jouent un rôle central, notamment le *vray* (pot des ancêtres) et le *mblom* (pot du clan). Leur alimentation repose sur les céréales (sorgho, mil) et les légumineuses, la viande provenant surtout des sacrifices rituels. Dans les années 1970, le mouvement artistique « Jesus Mafa » a transposé les scènes de l''Évangile dans l''univers visuel mafa.

**Histoire coloniale**

Les plaines et piémonts entourant le massif furent, dès le XVIe siècle, le théâtre de razzias esclavagistes menées par les États islamisés (sultanat du Mandara, émirats peuls). Au début du XIXe siècle, le djihad conduit par Modibbo Adama accentua cette pression : les populations non musulmanes — globalement désignées par le terme péjoratif « Kirdi » (païens) employé par les Peuls — étaient réduites en esclavage faute de pouvoir centralisé négociable. Jusqu''au début du XXe siècle, les Mafa résistèrent grâce à l''impénétrabilité des montagnes. Les puissances coloniales, d''abord allemande (Kamerun) puis française, s''appuyèrent sur les structures politiques peules et mandara pour soumettre ces groupes acéphales ; la « pacification » et la conquête effective du massif n''intervinrent que dans les années 1920-1930, accompagnées de travail forcé. Les sources rappellent enfin que le terme « Matakam », imposé par le colonisateur français, avait une connotation dépréciative : c''est en réaction à cet exonyme que le nom « Mafa » a été revendiqué.

**Aujourd''hui**

Les Mafa vivent principalement dans la région de l''Extrême-Nord du Cameroun (massif et plateau de Mokolo, monts Mandara), avec une présence dans le nord-est du Nigéria et une diaspora installée dans plusieurs villes camerounaises.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Mafa_(peuple)', NULL, 'Extrême-Nord', 'Mafa', 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Tkaczka_z_ludu_Mafa_-_Kamerun_-_001961s.jpg'),
  ('PEOPLE', 'Les Mousgoum', '**Origines**

Les Mousgoum (Musgum) sont un peuple des plaines du Logone, présent dans le nord du Cameroun (région de l''Extrême-Nord) et le sud-ouest du Tchad, avec une frange au Nigéria. Les sources les décrivent comme issus d''un brassage de populations — notamment les Sao, les Bargui, les Bornouans et les Massa. Ils sont surtout célèbres pour leur habitat traditionnel : le *tòlèk* (téleuk), case typique en forme d''obus, structure de terre crue en dôme aux parois nervurées qui facilitent l''écoulement de l''eau et l''entretien. Ces « cases obus » étaient si remarquables qu''une reconstitution fut présentée à l''Exposition coloniale de Paris en 1931.

**Particularités culturelles**

Les Mousgoum parlent le mousgoum, une langue tchadique ; les estimations donnent environ 85 900 locuteurs (près de 61 500 au Cameroun en 1982 et 24 400 au Tchad en 1993). Selon la tradition rapportée, leurs traits physiques renverraient à l''héritage sao tandis que l''apport musulman proviendrait des influences bargui et bornouane. Ils entretiennent une proximité culturelle marquée avec leurs voisins massa, tout en restant un groupe distinct, et l''islam s''est progressivement diffusé parmi eux.

**Histoire coloniale**

Les sources disponibles sur la période coloniale propre aux Mousgoum sont minces. Comme les autres peuples non musulmans du Nord regroupés sous l''appellation « Kirdi », ils furent exposés aux razzias des États islamisés de la région avant d''être intégrés successivement à la colonie allemande du Kamerun puis aux territoires sous administration française, qui gouvernaient le Nord en s''appuyant sur les chefferies peules. La reconstitution d''une case obus à l''Exposition coloniale de 1931 illustre le regard exotisant que la colonisation porta sur leur architecture.

**Aujourd''hui**

Les Mousgoum vivent aujourd''hui de part et d''autre de la frontière, dans la région de l''Extrême-Nord du Cameroun (vallée du Logone) et le sud-ouest du Tchad.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Mousgoum_(peuple)', NULL, 'Extrême-Nord', 'Mousgoum', 'https://upload.wikimedia.org/wikipedia/commons/7/71/Cases_Mousgoum_2.jpg'),
  ('PEOPLE', 'Les Baka', '**Origines**

Les Baka sont un peuple forestier d''Afrique centrale, historiquement classé parmi les « Pygmées » — terme aujourd''hui jugé péjoratif. Ils habitent les forêts tropicales humides du sud-est du Cameroun, ainsi que du nord du Gabon, du nord de la République du Congo et du sud-ouest de la République centrafricaine. Ils parlent le baka, une langue de la famille oubanguienne, distincte des langues bantoues de leurs voisins, signe d''une histoire propre au sein du monde forestier.

**Particularités culturelles**

Les Baka mènent traditionnellement une vie semi-nomade de chasseurs-cueilleurs, fondée sur la chasse, la cueillette et la pêche, et entretiennent des relations symbiotiques avec les communautés bantoues voisines, échangeant des produits de la forêt contre des biens agricoles. Leur société est généralement monogame et exogame. Ils sont mondialement réputés pour leur musique polyphonique sophistiquée, qui recourt au yodel — une technique vocale rare documentée par l''ethnomusicologue Simha Arom — accompagnée de percussions, de chants de cueillette et de berceuses. La forêt est habitée par un esprit protecteur, le *jengi* (esprit de la forêt), figure commune aux peuples pygmées, qui donne à la communauté accès à la protection de la forêt et relie les vivants aux esprits familiaux.

**Histoire coloniale**

Les sources documentent peu d''événements coloniaux propres aux Baka : vivant au cœur de la grande forêt, ils furent longtemps en marge directe des administrations allemande puis française. C''est surtout à partir des années 1950 qu''ils ont commencé à se sédentariser le long des pistes forestières et à adopter l''agriculture, tout en conservant des campements saisonniers en forêt. La période postérieure est marquée par une forte marginalisation : perte de terres ancestrales au profit de l''exploitation forestière, des concessions minières et des aires protégées, accès limité à l''éducation et à la santé, et difficultés de reconnaissance de la citoyenneté.

**Aujourd''hui**

Les Baka vivent principalement dans les régions de l''Est et du Sud du Cameroun, et plus largement dans les massifs forestiers transfrontaliers d''Afrique centrale.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Baka_(peuple_du_Cameroun_et_du_Gabon)', NULL, 'Est, Sud', 'Baka', 'https://upload.wikimedia.org/wikipedia/commons/5/54/Baka_dancers_June_2006.jpg'),
  ('PEOPLE', 'Les Banen', '**Origines**

Les Banen (ou Ban''en) sont une population bantoue du Cameroun. Le mot « Banen » est le pluriel de « Munen », qui signifie le noble, le riche au sens spirituel. Ils sont présents à la fois dans le Centre du pays (région du Mbam, autour de Ndikiniméki et Nitoukou) et sur le Littoral (vers Édéa et Douala). Ils parlent le tunen (banen), langue bantoue qui comptait environ 35 300 locuteurs en 1982 et se décline en plusieurs sous-dialectes (Topoigne, Alinga, Ndocktuna, Effombo).

**Particularités culturelles**

La société banen valorisait fortement l''indépendance personnelle : l''idéal était que chacun vive en chef sur sa propre colline, fierté qui les distinguait aux yeux des peuples voisins. Ce sont essentiellement des cultivateurs ; dès la période coloniale allemande, ils cultivaient des produits de rente comme le cacao, le café, le palmier à huile et la cola, en plus des cultures vivrières.

**Histoire coloniale**

L''histoire des Banen est marquée par la violence de la décolonisation. Sous administration allemande, leur territoire fut intégré à l''économie de plantation du Kamerun. Pendant la guerre d''indépendance menée par l''Union des populations du Cameroun (UPC), entre le milieu des années 1950 et les années 1960, la région banen devint un foyer du maquis nationaliste. Pour vider la zone des combattants, l''armée coloniale française mena une répression de grande ampleur : selon les sources, plus de 37 villages furent détruits et plus de 51 000 habitants contraints à l''exil. Ce n''est qu''environ soixante ans plus tard que les communautés banen ont entrepris de revenir vers leurs terres d''origine. En 2020, le collectif « Les Banen disent non » s''est constitué pour s''opposer à un projet d''exploitation de la forêt d''Ebo et défendre les droits ancestraux sur ces terres.

**Aujourd''hui**

Les Banen vivent surtout dans la région du Centre (département du Mbam-et-Inoubou, vers Ndikiniméki) et sur le Littoral.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Banen_(peuple)', NULL, 'Centre, Littoral', 'Banen', NULL),
  ('PEOPLE', 'Les Bafia', '**Origines**

Les Bafia sont une population bantoue d''Afrique centrale, installée au Cameroun sur la rive droite du Mbam. Les sources indiquent qu''ils ont été repoussés vers leur implantation actuelle par l''expansion peule. Ils parlent le bafia, une langue bantoue estimée à environ 60 000 locuteurs au Cameroun en 1991.

**Particularités culturelles**

Les Bafia sont essentiellement des cultivateurs, qui pratiquent aussi la chasse en saison sèche. Leur danse, exécutée selon un pas caractéristique (deux pas en avant, un pas en arrière), passe pour l''une des plus élégantes du Cameroun ; le festival Mbam''Art se tient chaque année en février. Sur le plan symbolique, ils vénèrent la tortue, emblème de justice et de paix, et respectaient autrefois le culte du Gam (araignée mygale). Aujourd''hui, ils sont à la fois animistes, musulmans et chrétiens, le christianisme prédominant depuis la fin du XIXe siècle.

**Histoire coloniale**

Les sources consultées restent minces sur les événements coloniaux propres aux Bafia. Avant la colonisation, leur installation actuelle résulte de la pression de l''expansion peule venue du Nord. La période coloniale et missionnaire se traduit surtout par une christianisation amorcée dès la fin du XIXe siècle, qui a profondément transformé le paysage religieux du groupe.

**Aujourd''hui**

Les Bafia vivent dans le département du Mbam-et-Inoubou (arrondissement et sous-préfecture de Bafia), dans la région du Centre du Cameroun.

— Source : Wikipédia (FR) — https://fr.wikipedia.org/wiki/Bafia_(peuple)', NULL, 'Centre', 'Bafia', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/CABA_NKONDO_tenu_de_travail_au_cameroun.jpg/960px-CABA_NKONDO_tenu_de_travail_au_cameroun.jpg'),
  ('PROVERB', 'La propriété de la fourmi', '**Proverbe** — « Lá sonó di si masuabe » (douala)

**Traduction** — « La propriété d''une fourmi ne s''arrache pas. »

**Signification** — Même au plus humble revient le respect de ce qui lui appartient : on ne dépouille pas un petit sous prétexte qu''il est faible. Le droit ne dépend pas de la taille de celui qui le détient.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Le secret du cœur', '**Proverbe** — « Lambo lá muléma ma moto di si mabiane » (douala)

**Traduction** — « Le secret du cœur ne se dévoile pas. »

**Signification** — Ce qui repose au fond du cœur d''un homme reste insondable. On ne peut prétendre connaître entièrement les pensées et les intentions d''autrui ; la prudence et la réserve s''imposent.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Chaque chose a son maître', '**Proverbe** — « Lambo te na mubenedi » (douala)

**Traduction** — « Chaque chose a un propriétaire. »

**Signification** — Rien n''est sans attache ni sans responsable. Avant de s''approprier ou de juger une chose, il faut savoir à qui elle revient ; tout a une origine et un ayant droit.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Le palétuvier qu''on désigne du doigt', '**Proverbe** — « Leke la muní di bó mukálá ''a tándá » (douala)

**Traduction** — « C''est en le désignant toujours du doigt que le palétuvier finit par mourir. »

**Signification** — La médisance et la calomnie répétées finissent par abattre celui qu''elles visent. À force d''être montré du doigt, l''homme le plus solide peut être détruit par les paroles.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Le sourire et le cœur', '**Proverbe** — « Lo ó mudumbu di titi etonde ó mulema » (douala)

**Traduction** — « Sourire au visage ne signifie pas bonté au cœur. »

**Signification** — Les apparences trompent : un visage aimable peut cacher de mauvaises intentions. Il faut juger les gens à leurs actes plutôt qu''à leurs amabilités de façade.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Le pêcheur bredouille', '**Proverbe** — « Lóa lá bosúbé na jombwa la belíngá » (douala)

**Traduction** — « Quand on n''a rien pêché, on regarde les corbeilles des autres. »

**Signification** — Celui qui n''a pas su réussir par lui-même envie le fruit du travail d''autrui. C''est une invitation à l''effort personnel plutôt qu''à la jalousie.

— Source : Les proverbes douala (Charles Dabrad) — https://charlesdabrad.wordpress.com/2013/06/16/les-proverbes-douala/', 'dua', 'Littoral', 'Douala', NULL),
  ('PROVERB', 'Le léopard en terre étrangère', '**Proverbe** — « Un léopard rentre ses griffes en territoire étranger. »

**Signification** — En pays inconnu, ou avant le mariage, chacun masque ses défauts et adoucit son caractère. Ce n''est qu''une fois en confiance que la vraie nature se révèle.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-camerounais/', NULL, 'Littoral', 'Douala', NULL),
  ('PROVERB', 'La poule et l''homme', '**Proverbe** — « La poule et l''homme entrent par la même porte. »

**Signification** — Tous les êtres vivants partagent un même monde et une même condition fondamentale. Le proverbe enseigne l''humilité et le respect du vivant : nul n''est au-dessus de l''ordre commun de la nature.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-camerounais/', NULL, 'Littoral', 'Douala', NULL),
  ('PROVERB', 'La vipère et le python', '**Proverbe** — « Quand la vipère est morte, le python ne peut prendre ses dents. »

**Signification** — On n''hérite pas des biens ni des qualités d''un étranger : il ne faut rien attendre de qui ne nous est pas lié. Chacun reçoit selon sa propre parenté et ses propres liens.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-camerounais/', NULL, 'Littoral', 'Douala', NULL),
  ('PROVERB', 'On ne casse pas le pont', '**Proverbe** — « Est-ce qu''on traverse un cours d''eau et casse le pont ? »

**Signification** — Lorsqu''on a bénéficié d''un avantage, on ne doit pas le garder jalousement ni le détruire derrière soi : il faut le laisser à la disposition de ceux qui viendront après, pour qu''ils progressent à leur tour.

— Source : Nofi Media — proverbes bamiléké — https://www.nofi.media/2017/07/proverbes-bamileke-reussite-collective/41466', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Tromper le coiffeur', '**Proverbe** — « Avant de tromper le coiffeur, il faut savoir que les cheveux vont encore pousser. »

**Signification** — Avant de nuire à quelqu''un, assure-toi que tu n''auras plus jamais besoin de ses services. La vie est faite de retours : celui que l''on trahit aujourd''hui peut nous être indispensable demain.

— Source : Nofi Media — proverbes bamiléké — https://www.nofi.media/2017/07/proverbes-bamileke-reussite-collective/41466', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'La panthère appartient au roi', '**Proverbe** — « La panthère attrapée par un individu appartient au roi. »

**Signification** — Les grandes réussites individuelles doivent profiter à toute la communauté. Le talent et le succès d''un seul s''inscrivent dans un bien commun : ils honorent et nourrissent le groupe entier.

— Source : Nofi Media — proverbes bamiléké — https://www.nofi.media/2017/07/proverbes-bamileke-reussite-collective/41466', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Demander au sel d''être sucré', '**Proverbe** — « Il ne faut pas demander au sel d''être sucré. »

**Signification** — On ne peut exiger d''une personne ce qui n''est pas dans sa nature. Attendre le bien d''un cœur mauvais, c''est se condamner à la déception : chacun agit selon ce qu''il est.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-bamileke/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Le serpent et ses pattes', '**Proverbe** — « Le serpent dit qu''il arrangera ses pattes quand il sera grand. »

**Signification** — Une occasion remise sans cesse à plus tard ne revient jamais. À force de différer ce qu''il faut faire, on laisse passer le moment où c''était encore possible.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-bamileke/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'L''épine et son chemin', '**Proverbe** — « L''épine sortira par où elle est entrée. »

**Signification** — Les choses se dénouent comme elles se sont nouées. Pour résoudre un problème, il faut remonter à son origine ; et une affaire finit souvent par où elle a commencé.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-bamileke/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'La chute dans la boue', '**Proverbe** — « Quand on fait une chute dans la boue, on ne nie pas qu''on s''est sali. »

**Signification** — Quand le tort est manifeste, il est vain de le nier. La sagesse consiste à reconnaître son erreur plutôt qu''à s''enfermer dans le mensonge devant l''évidence.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-bamileke/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Celui qui a trouvé un champignon', '**Proverbe** — « Celui qui a trouvé un champignon ne manque pas de regarder tout autour. »

**Signification** — Là où l''on a connu une réussite, on espère en trouver d''autres. Une bonne fortune en appelle une recherche : le succès rend attentif aux occasions voisines.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-bamileke/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Les mains liées', '**Proverbe** — « Quand tu lies les mains d''un coupable, il commet une faute avec ses pieds. »

**Signification** — Empêcher quelqu''un de mal agir d''une manière ne suffit pas : la mauvaise volonté trouve toujours un autre chemin. Le mal vient du cœur, non des seuls moyens.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'La chèvre et la rosée', '**Proverbe** — « La chèvre qui lèche la rosée finira par arriver au ruisseau. »

**Signification** — La persévérance dans les petits efforts mène au but. Avancer pas à pas, sans se décourager, conduit toujours plus loin qu''on ne croit.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'L''eau quémandée', '**Proverbe** — « L''eau quémandée ne fait jamais cuire le repas. »

**Signification** — Ce qu''on obtient en mendiant ne suffit jamais vraiment. Seul le fruit de son propre travail apporte une satisfaction durable et l''autonomie.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Des langues et des oreilles', '**Proverbe** — « Tous ont une langue, peu ont des oreilles. »

**Signification** — Beaucoup parlent, rares sont ceux qui savent écouter. Le proverbe valorise l''écoute et la retenue dans un monde où chacun veut être entendu.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'On le devient chef', '**Proverbe** — « On ne naît pas chef, on le devient. »

**Signification** — L''autorité et le respect ne sont pas un dû de naissance mais le fruit du mérite, de l''effort et de la conduite. La dignité se construit, elle ne se reçoit pas toute faite.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'L''arbre qui s''appuie', '**Proverbe** — « Pour pousser droit, l''arbre doit s''appuyer sur un autre arbre. »

**Signification** — Nul ne grandit seul. C''est par l''entraide, l''exemple et le soutien des autres que l''on se redresse et que l''on s''élève dignement.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'L''abcès dans le dos', '**Proverbe** — « Personne ne peut presser l''abcès qu''il a au dos. »

**Signification** — Il y a des épreuves qu''on ne peut surmonter seul ; pour certaines difficultés, il faut accepter la main d''autrui. Reconnaître ses limites, c''est aussi de la sagesse.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamiléké', NULL),
  ('PROVERB', 'Les paroles blessantes', '**Proverbe** — « Les paroles blessantes sont comme des flèches lancées au cœur. »

**Signification** — Les mots durs laissent des blessures profondes et durables, parfois plus que les coups. Le proverbe invite à mesurer sa parole, car elle peut atteindre l''âme.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Tourner avec la terre', '**Proverbe** — « Si la terre tourne, tu tournes avec elle. »

**Signification** — Il faut savoir s''adapter aux changements de la vie. Refuser d''évoluer avec son temps, c''est se condamner à rester en arrière.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'La calebasse cachée', '**Proverbe** — « On ne lance pas des cailloux vers l''endroit où on a caché sa calebasse. »

**Signification** — On ne doit pas compromettre ce qui fait notre propre intérêt. Agir contre soi-même par imprudence ou colère est le comble de la sottise.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Le hareng devenu sourd', '**Proverbe** — « Trop de conseils ont rendu le hareng sourd. »

**Signification** — À force d''être submergé d''avis contradictoires, on finit par ne plus rien écouter. L''excès de conseils peut nuire autant que leur absence.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Deux fois au même endroit', '**Proverbe** — « Quand on se retrouve à deux reprises au même endroit dans la forêt, c''est qu''on s''est égaré. »

**Signification** — Repasser par les mêmes erreurs est le signe qu''on a perdu sa route. Il faut alors avoir l''humilité de reconnaître son égarement et de changer de direction.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Le caïman dans sa mare', '**Proverbe** — « On ne se moque pas du caïman quand on est dans sa mare. »

**Signification** — On ne provoque pas le puissant sur son propre terrain. La prudence commande de respecter le maître des lieux tant qu''on dépend de lui.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Le piège du lièvre', '**Proverbe** — « Un piège qui prend le lièvre n''attrape pas l''éléphant. »

**Signification** — À chaque tâche ses moyens : les petits outils ne conviennent pas aux grandes entreprises. Il faut proportionner ses moyens à l''ampleur de son but.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Le cadavre d''éléphant', '**Proverbe** — « On ne dissimule pas un cadavre d''éléphant sous des feuilles. »

**Signification** — Les grandes vérités, les fautes ou les faits considérables ne peuvent rester cachés. Tôt ou tard, ce qui est énorme finit par se voir.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Le mariage, une guerre à soi-même', '**Proverbe** — « Le mariage est une guerre qu''on se déclare à soi-même. »

**Signification** — La vie de couple est un engagement exigeant, fait de concessions et de combats intérieurs. Celui qui s''y engage doit accepter d''apprendre la patience et le don de soi.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Centre', 'Beti', NULL),
  ('PROVERB', 'Tendre plusieurs pièges', '**Proverbe** — « Qui tend plusieurs pièges ne passe pas la nuit affamé. »

**Signification** — La prévoyance et la diversité des efforts protègent du besoin. Celui qui multiplie ses chances ne reste pas les mains vides.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'La sagesse des termites', '**Proverbe** — « Les termites disent : petit à petit, cela s''amoncelle. »

**Signification** — Les grandes œuvres se bâtissent par l''accumulation patiente des petits efforts. La constance, plus que la force, vient à bout des plus grandes tâches.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'Le malheur entre comme le froid', '**Proverbe** — « Le malheur pénètre la case comme le froid. »

**Signification** — Les difficultés s''infiltrent insensiblement, sans qu''on les voie venir. Il faut rester vigilant, car le mal s''installe souvent par de petites brèches négligées.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'Le ventre et l''air vicié', '**Proverbe** — « Le ventre ne garde pas longtemps l''air vicié. »

**Signification** — La vérité, comme la rancœur ou le secret pesant, finit toujours par sortir. On ne peut retenir indéfiniment ce qui cherche à s''exprimer.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'Le plat encore chaud', '**Proverbe** — « Si le plat te plaît, mange-le quand il est encore chaud. »

**Signification** — Il faut saisir les bonnes occasions au moment où elles se présentent. Ce qu''on remet trop tard perd sa saveur et peut nous échapper.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'On n''appelle pas le chien pour le battre', '**Proverbe** — « On n''appelle pas un chien pour le battre. »

**Signification** — On ne saurait inviter quelqu''un sous un bon prétexte pour ensuite lui nuire. Le proverbe condamne la traîtrise et l''hospitalité hypocrite.

— Source : Les meilleurs proverbes du Cameroun (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais-2/', NULL, 'Ouest', 'Bamoun', NULL),
  ('PROVERB', 'Les chameaux et leurs bosses', '**Proverbe** — « Les chameaux ne rient pas entre eux de leurs bosses. »

**Signification** — On ne se moque pas du défaut d''autrui quand on porte le même. Le proverbe enseigne l''humilité et la tolérance entre semblables.

— Source : Proverbes peuls (Dicocitations) — https://www.dicocitations.com/auteur/4768/Proverbes_peuls.php', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Le mensonge éphémère', '**Proverbe** — « Le mensonge arrive vite à l''âge mûr mais ne vit pas de longs jours. »

**Signification** — La fausseté peut connaître un succès rapide, mais elle ne dure pas. À la fin, c''est la vérité qui l''emporte et survit.

— Source : Proverbes peuls (Dicocitations) — https://www.dicocitations.com/auteur/4768/Proverbes_peuls.php', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Le savoir est un champ', '**Proverbe** — « Le savoir est un champ, mais s''il n''est ni labouré ni surveillé, il ne sera pas récolté. »

**Signification** — La connaissance demande un travail constant pour porter ses fruits. Sans entretien ni effort, même le meilleur savoir reste stérile.

— Source : Proverbes peuls (Dicocitations) — https://www.dicocitations.com/auteur/4768/Proverbes_peuls.php', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Le piège trop profond', '**Proverbe** — « Quand on creuse un piège pour son ennemi, il ne faut pas creuser trop profond, car on ne sait jamais. »

**Signification** — Celui qui prépare la perte d''autrui peut y tomber lui-même. Le proverbe met en garde contre l''excès dans la vengeance, qui se retourne souvent contre son auteur.

— Source : Proverbes peuls (Dicocitations) — https://www.dicocitations.com/auteur/4768/Proverbes_peuls.php', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Plus fort que l''éléphant', '**Proverbe** — « Ce qui est plus fort que l''éléphant, c''est la brousse. »

**Signification** — Même le plus puissant reste soumis à son environnement. Le contexte et l''ensemble l''emportent sur la force isolée : nul n''est invincible face au monde qui l''entoure.

— Source : Proverbes peuls (Dicocitations) — https://www.dicocitations.com/auteur/4768/Proverbes_peuls.php', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Les pieds gris de poussière', '**Proverbe** — « Des pieds gris (de poussière) valent mieux qu''un derrière gris (de poussière). »

**Signification** — Il vaut mieux être debout et actif qu''assis à ne rien faire. Le proverbe peul fait l''éloge de l''effort et de la marche vers le travail.

— Source : Nofi Media — proverbes peuls du Cameroun — https://www.nofi.media/2017/07/4-proverbes-peuls/41142', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Le pantalon du voisin', '**Proverbe** — « Il n''a pas de quoi se payer un pantalon, peut-il en donner un à son voisin ? »

**Signification** — On ne peut attendre d''aide ni de service de celui qui ne sait même pas se suffire à lui-même. Avant de réclamer d''autrui, il faut s''assurer qu''il en a les moyens.

— Source : Nofi Media — proverbes peuls du Cameroun — https://www.nofi.media/2017/07/4-proverbes-peuls/41142', NULL, 'Nord', 'Peul', NULL),
  ('PROVERB', 'Le rythme du tam-tam', '**Proverbe** — « Si le rythme du tam-tam change, le pas de danse doit s''y adapter. »

**Signification** — Il faut savoir ajuster sa conduite aux circonstances. Celui qui s''obstine à danser sur l''ancien rythme se trouve vite en décalage avec le monde.

— Source : African Heritage (afrolegends.com) — https://afrolegends.com/tag/proverbe-camerounais/', NULL, 'Sud-Ouest', 'Bakossi', NULL),
  ('PROVERB', 'Ce qui reste dans la bouche', '**Proverbe** — « Ce qui reste dans ta bouche n''a pas de prix. »

**Signification** — Le silence et la discrétion sont précieux : tant qu''une parole n''est pas dite, on en reste maître. Garder pour soi ce qui doit l''être est une grande sagesse.

— Source : Proverbes camerounais (proverbes-francais.fr) — https://www.proverbes-francais.fr/proverbes-camerounais/', NULL, 'Sud-Ouest', 'Bakossi', NULL),
  ('TALE', 'Kulu la tortue et Zé la panthère', '**Le conte**

Une année, le gibier vint à manquer dans la forêt et la faim s''installa. Zé la panthère, qui se croyait la plus habile, proposa à Kulu la tortue de chasser ensemble et promit de lui enseigner l''art de poser des pièges. Mais, infidèle à sa parole, la panthère abandonna bientôt la tortue à elle-même.

Kulu, qui ne savait rien faire, rencontra le lièvre. Celui-ci se moqua de son ignorance et, pour la narguer, lui montra comment fonctionnait un piège. En faisant la démonstration, le lièvre se prit lui-même au collet ; Kulu l''acheva et cacha sa viande. La même mésaventure arriva à l''antilope, venue à son tour railler la tortue.

Voyant Kulu rapporter tant de gibier, Zé la panthère voulut chasser de nouveau avec elle. La tortue, jouant l''innocente, demanda comment les bêtes se laissaient prendre. La panthère, sûre d''elle, fit la démonstration et se retrouva captive de son propre piège. Elle eut beau crier qu''elle montrait « tout juste comment marche un piège », Kulu la considéra comme un gibier comme un autre, la tua et l''apporta au village, où tous se régalèrent de sa chair.

**Morale**

La ruse et la persévérance triomphent de la force et de la trahison : qui trahit son compagnon et croit le tromper finit pris à son propre piège.

**Origine**

Conte du cycle de Kulu la tortue, figure du décepteur dans la tradition beti du Centre et du Sud Cameroun.

— Source : Le blog de fryou — https://fryou-maison.over-blog.fr/article-conte-kulu-tortue-et-ze-panthere-61882530.html', NULL, 'Centre', 'Beti', NULL),
  ('TALE', 'Kulu la tortue et Ngoa le porc', '**Le conte**

Kulu la tortue, jadis chasseur prospère, fut frappé par la famine à cause d''un mauvais sort. Affamé, il rendit visite à son ami et voisin Ngoa le porc, qui vivait dans l''abondance. Généreux, Ngoa lui offrit un festin de crabes et de poissons. Rongé par la jalousie mais réconforté, Kulu finit par lui emprunter soixante-cinq francs pour payer la dot du mariage de son fils, Wudu la petite tortue. Ngoa prêta la somme de bon cœur.

Les mois passèrent sans remboursement ni mariage. Quand Ngoa vint réclamer son dû, Kulu se cacha et ordonna à sa femme de se faire passer pour une pierre à moudre. Après plusieurs visites infructueuses, Ngoa, exaspéré, écarta la « pierre » d''un geste brusque, et la femme de Kulu poussa un cri de douleur.

Kulu réapparut alors, prétendant revenir de la chasse, et refusa de rembourser sa dette tant que Ngoa n''aurait pas retrouvé « la pierre » qu''il avait déplacée. C''est depuis ce jour, dit-on, que le porc fouille sans cesse la terre de son groin : il cherche éternellement la pierre disparue.

**Morale**

L''ingratitude et la mauvaise foi se retournent contre celui qui trahit l''amitié ; le conte explique aussi pourquoi le porc fouit la terre.

**Origine**

Conte du cycle de Kulu la tortue, tradition beti du Centre-Cameroun.

— Source : Le blog de fryou — https://fryou-maison.over-blog.fr/article-conte-kulu-tortue-et-ngoa-porc-63243405.html', NULL, 'Centre', 'Beti', NULL),
  ('TALE', 'Kulu la tortue qui voulait porter l''éléphant', '**Le conte**

Il y a très longtemps, une tortue nommée Kulu se vantait auprès de tous d''une force prodigieuse. Elle prétendait pouvoir soulever n''importe quel animal de la forêt, fût-ce l''éléphant lui-même. Ses fanfaronnades firent tant de bruit que toutes les bêtes se rassemblèrent au village pour assister à l''exploit.

Avant de se lancer, Kulu prévint la foule : elle allait réveiller son fétiche, qui lui donnerait la force nécessaire, et nul ne devait rire, car le rire annulerait la magie. Un féticheur sortit alors de la case de Kulu, s''approcha de l''éléphant et se mit à psalmodier des formules en exécutant une danse aux gesticulations grotesques.

Les contorsions du sorcier étaient si comiques que l''assistance entière éclata de rire. Aussitôt, Kulu accusa la foule : leur rire avait détruit le pouvoir du fétiche, et il lui était désormais impossible de porter l''éléphant. Depuis, on dit en proverbe « l''éléphant porté par la tortue » pour désigner celui qui cherche une excuse afin de masquer son incapacité.

**Morale**

Le vantard se réfugie toujours derrière de fausses excuses pour cacher qu''il ne peut tenir ses promesses.

**Origine**

Conte du cycle de Kulu la tortue, tradition beti du Cameroun.

— Source : Contes et légendes du Cameroun (Dreame) — https://www.dreame.com/fr/story/3832225280-contes-et-l%C3%A9gendes-du-cameroun/0928321792-kulu-la-tortue-qui-voulait-porter-l%E2%80%99%C3%A9l%C3%A9phant.html', NULL, 'Centre', 'Beti', NULL),
  ('TALE', 'Idilè et l''habit de l''éléphant', '**Le conte**

Dans un village de la grande forêt du Pongo régnait un roi qui voulut célébrer ses quatre-vingt-dix-neuf ans de règne par une grande fête. Il demanda que tous ses notables paraissent vêtus d''habits magnifiques et engagea Idilè, un tailleur d''un talent si grand que sa réputation dépassait les frontières de la région. Des envieux semèrent pourtant le doute dans l''esprit du roi sur les capacités du couturier.

En dix jours, Idilè habilla tous les dignitaires. Restait Njou, l''énorme éléphant, premier notable du roi : sa carrure démesurée faisait échouer chaque essayage. Le délai approchait, le roi s''impatientait, et Idilè, désemparé, appela ses fidèles : son ami Esôkèsôkè, son cousin Sonjésonjé et le neveu de celui-ci, Isokoloko.

La dernière nuit avant la fête, les quatre compagnons tissèrent directement sur le corps de Njou un habit chatoyant et multicolore. Quand l''éléphant parut devant la foule, tous se levèrent et applaudirent, y compris le roi sceptique. En récompense, le roi éleva Idilè à un rang noble supérieur.

**Morale**

Le talent, la persévérance et l''entraide de compagnons fidèles triomphent de la jalousie et du doute.

**Origine**

Conte de la forêt du Pongo, tradition sawa (bantou côtier) du Littoral camerounais.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/conte-camerounais-idile-et-le-tresor/', NULL, 'Littoral', 'Sawa', NULL),
  ('TALE', 'Idilè et le trésor', '**Le conte**

Dans un village de la grande forêt du Pongo, la famine sévissait. Pour éprouver son peuple, le roi annonça qu''un trésor était caché dans la forêt et distribua à chacun des outils : machettes, pelles, pioches. Pendant des semaines, les villageois retournèrent des collines et asséchèrent des rivières, cherchant en vain l''or promis.

Idilè, un jeune garçon avisé, vivait avec sa vieille mère. Plutôt que de creuser au hasard, tous deux se servirent des outils pour défricher un coin de forêt, puis y cultivèrent du maïs, des arachides, des concombres, du manioc, de l''igname et du plantain. Les autres se moquaient de lui.

Quand les villageois revinrent les mains vides, la récolte d''Idilè débordait d''abondance. Il partagea ses vivres avec toute la communauté et mit fin à la famine. Suivant son exemple, le village se mit à cultiver et devint le grenier de toute la région. Le roi, reconnaissant, équipa pour Idilè un atelier de couture.

**Morale**

Le véritable trésor n''est pas l''or que l''on déterre, mais le travail réfléchi, l''effort patient et l''autonomie qui nourrissent toute la communauté.

**Origine**

Conte de la forêt du Pongo, tradition sawa du Littoral camerounais.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/conte-camerounais-idile-et-ses-oeuvres/', NULL, 'Littoral', 'Sawa', NULL),
  ('TALE', 'L''œil de l''éléphant', '**Le conte**

Un jeune éléphanteau traversait une rivière lorsque, soudain, l''un de ses yeux se détacha et tomba dans l''eau. Pris de panique, l''animal se débattit de toutes ses forces, frappant la surface et soulevant des nuages de vase et de boue. Plus il s''agitait, plus l''eau devenait trouble, et impossible de retrouver l''œil perdu.

Les animaux des environs — poissons, grenouilles, oiseaux — lui répétaient de se calmer, mais l''éléphanteau, affolé, continuait de remuer en tous sens. Enfin, épuisé, il écouta leurs conseils et s''immobilisa.

À mesure qu''il restait tranquille, le courant emporta les sédiments et l''eau s''éclaircit peu à peu. La vase retomba au fond, et l''œil apparut au lit de la rivière. De sa trompe, l''éléphanteau le récupéra, le remit en place et acheva paisiblement sa traversée.

**Morale**

La panique et l''agitation aggravent les difficultés. Quand on perd son sang-froid, on perd tout ; c''est en restant calme que la clarté revient et que la solution apparaît d''elle-même.

**Origine**

Conte d''origine camerounaise, transmis sans attribution régionale précise (valeur nationale).

— Source : Blog Éloquence — https://blogeloquence.com/un-conte-dorigine-camerounaise-loeil-de-lelephant/', NULL, 'National', NULL, NULL),
  ('TALE', 'Le mythe de la tortue chez les Bafia', '**Le conte**

Les ancêtres nyokon, soucieux de régler équitablement les différends qui divisaient les hommes, choisirent la tortue comme totem sacré. Au cours d''un rituel, ils partagèrent une tortue en deux et l''enterrèrent au bord d''un chemin, faisant de sa carapace et de ses os des fétiches voués à rendre la justice.

Dès lors, la tortue ne fut plus une bête ordinaire mais le symbole vivant du jugement divin. Sa chair devint un interdit alimentaire absolu. Les Bafia rapprochent en effet le corps écailleux de la tortue de celui du lépreux : dans leur langue, un même mot (« kui » / « kwi ») désigne l''animal et la maladie, tous deux perçus comme la marque d''un châtiment pour avoir transgressé l''ordre naturel.

Rencontrer une tortue en chemin était au contraire signe de bonne fortune : il fallait la présenter à ses oncles maternels. En traitant la tortue comme une instance de justice plutôt que comme un gibier, les Bafia rappelaient à tous le respect des limites et l''attachement à la paix de la communauté.

**Morale**

Le respect des interdits sacrés fonde la justice, la paix et l''harmonie de la communauté.

**Origine**

Mythe explicatif des Bafia (ancêtres nyokon), région du Centre, Cameroun.

— Source : Wikipédia — https://fr.wikipedia.org/wiki/Mythe_de_la_tortue_chez_les_Bafia', NULL, 'Centre', 'Bafia', NULL),
  ('TALE', 'Le Lièvre et la Tortue (version bamiléké)', '**Le conte**

Une grande sécheresse frappa le village et la rivière se tarit. Le lièvre, orgueilleux et fier de sa rapidité, défia la tortue à la course vers un point d''eau lointain, persuadé de l''humilier facilement.

Mais la tortue, au lieu de compter sur ses seules forces, mobilisa toute sa parenté. Elle posta discrètement une cousine tortue à chaque étape du parcours. Lorsque le lièvre, hors d''haleine, arrivait à un point de passage, une tortue s''y trouvait déjà et lançait : « Je suis là ! » De relais en relais, le lièvre s''épuisait à courir tandis que les tortues, fraîches, se succédaient.

La dernière tortue franchit la ligne d''arrivée pendant que le lièvre s''effondrait de fatigue, vaincu sans comprendre comment. Là où la version européenne célèbre la lenteur obstinée, la version africaine met en avant la solidarité du clan.

**Morale**

L''union et l''intelligence collective l''emportent sur le talent individuel et sur l''orgueil. Comme le dit le proverbe : « Tout seul, on va vite ; ensemble, on va loin. »

**Origine**

Version recueillie dans la tradition bamiléké, région de l''Ouest, Cameroun.

— Source : Contes africains pour enfants (itag-fr) — https://itag-fr.com/lecon.php?id=2741', NULL, 'Ouest', 'Bamiléké', NULL),
  ('TALE', 'Le duel de l''oreille, du moustique et de la main', '**Le conte**

Dans un village vivaient Toï l''oreille, Yungu le moustique et Mpiki la main. Yungu était le plus riche, mais aussi le plus faible ; il possédait une palmeraie. Mpiki, lui, était le plus pauvre mais le plus fort, et louait ses bras. Yungu l''engagea pour récolter les noix de palme et en extraire l''huile, contre cent vingt-cinq francs.

Le travail achevé, Mpiki réclama son salaire, mais Yungu se déroba, prétextant qu''il devait d''abord vendre l''huile. Quand Mpiki découvrit que l''huile était déjà vendue, il revint exiger son dû. Usant de sa richesse et de ses appuis auprès de l''administration, Yungu fit jeter Mpiki en prison.

Un magistrat, en visite, remarqua l''innocence de Mpiki et le fit libérer. Apprenant cela, Yungu terrifié alla se réfugier dans l''oreille de Toï. Lorsque Mpiki passa près de là, cherchant son ennemi, il frappa l''oreille à coups répétés pour atteindre le moustique. C''est depuis ce jour, dit-on, que la main gifle l''oreille pour chasser le moustique qui y bourdonne.

**Morale**

L''injustice du puissant finit par retomber sur lui ; et celui qui abrite le coupable s''expose à recevoir les coups destinés à l''autre.

**Origine**

Conte sawa (bantou), région du Littoral, Cameroun.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/conte-le-duel-historique-entre-loreille-le-moustique-et-la-main-tamtam-du-mboa/', NULL, 'Littoral', 'Sawa', NULL),
  ('TALE', 'La sauterelle, le coq et l''aigle', '**Le conte**

Le coq et l''aigle étaient deux amis inséparables qui partageaient tout. Mais le coq gardait au cœur une rancune secrète contre la sauterelle, une guérisseuse qu''il accusait d''avoir jadis laissé mourir son neveu.

Lorsque l''enfant de l''aigle tomba gravement malade de la variole, le coq conseilla d''aller chercher la sauterelle, prétendant vouloir aider. Mais, le lendemain matin, il guetta la guérisseuse sur son chemin, l''attaqua et la tua avant qu''elle ne pût soigner le petit. Puis il mentit sur ce qui s''était passé. Privé de remède, l''enfant de l''aigle finit par mourir.

Quand l''aigle découvrit la vérité, il était trop tard. Fou de douleur et de rage, il jura d''exterminer la descendance du coq de génération en génération et de transmettre sa haine à tous ses petits. C''est depuis ce jour, dit-on, que l''aigle fond du ciel pour emporter le moindre poussin qui se trouve à sa portée.

**Morale**

La haine née d''une rancune cachée détruit les amitiés et frappe des innocents ; la vengeance se perpétue de génération en génération et ne s''éteint que par le pardon.

**Origine**

Conte de la région de Dibombari (peuple bakoko), Littoral, Cameroun.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/soir-au-village-le-coq-et-laigle/', NULL, 'Littoral', 'Bakoko', NULL),
  ('TALE', 'Le bobolo qui se moquait du koki', '**Le conte**

Dans un village vivaient deux compagnons faits de manioc : Ekoki, le koki, et Ebobolo, le bobolo. Le vieux koki subissait sans cesse le même supplice dans la cuisine de grand-mère Ewongo : dès qu''arrivaient des invités ou qu''on préparait un festin, on le ligotait autour de la tête, on le cuisait, et il en ressortait vieilli et noirci.

Le jeune bobolo, insouciant et moqueur, prenait plaisir à se gausser sans cesse des malheurs répétés du koki, riant de le voir toujours ainsi ficelé et brûlé.

Mais le sort se retourna. Un jour, ce fut au tour du bobolo de passer à la marmite — et son châtiment fut cent fois pire. Là où le koki n''était lié qu''à la tête, le bobolo fut entièrement ficelé de la bouche à la queue, puis bouilli dans l''eau brûlante jusqu''à devenir, lui aussi, vieux et laid.

**Morale**

Il ne faut jamais se réjouir du malheur d''autrui, car le même sort peut frapper chacun à son tour.

**Origine**

Conte sawa, mettant en scène des mets traditionnels de manioc, Littoral et Centre du Cameroun.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/conte-africain-le-bobolo-qui-se-moquait-du-koki-ligote-sur-la-tete-a-fini-par-se-faire-ligoter-tout-le-corps/', NULL, 'Littoral', 'Sawa', NULL),
  ('TALE', 'Kolondo et la méchanceté des hommes', '**Le conte**

Dans un petit village de Yapaki Bakoko vivaient deux frères : Kolondo, un homme privé de ses jambes, aigri, jaloux et possessif, et Elomba, son cadet, valide et travailleur.

Un jour, Elomba revint du marché de Bomono avec des souliers neufs et un pantalon. Pensant à son frère, il lui rapporta une belle chemise, car Kolondo, sans jambes, ne pouvait porter de chaussures. Mais à la vue des souliers, Kolondo fut envahi par la colère et l''envie. Il prit la plaisanterie de son frère pour une moquerie et, malgré les explications raisonnables d''Elomba, il décida que jamais celui-ci ne profiterait de ses souliers.

Dévoré par son obsession, Kolondo prépara en secret un poison magique et s''en servit pour tuer son propre frère. Mais à quoi lui servaient désormais ces souliers, lui qui ne pouvait les chausser, maintenant qu''il avait perdu son unique frère ?

**Morale**

L''envie et la convoitise détruisent les liens du sang. Mieux vaut se contenter de ce que l''on a que de jalouser le bien d''autrui, car la rancune ne mène qu''à la ruine.

**Origine**

Conte de Yapaki Bakoko (peuple bakoko), région du Littoral, Cameroun.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/kolondo-lecureuil-heliosciurus-gambianus-et-la-mechancete-des-hommes/', NULL, 'Littoral', 'Bakoko', NULL),
  ('TALE', 'La bague qui a séparé les deux frères', '**Le conte**

Láda et Dindá, de la famille Mbom Mbedi, étaient deux frères de la côte si unis qu''ils partageaient tout, même les choses les plus intimes. Lorsque Dindá partit outre-mer épouser la femme qu''il aimait, il n''avait pas de bague de fiançailles ; son frère Láda lui prêta la sienne.

À son retour, Dindá avait grossi et la bague refusait de quitter son doigt. Láda exigea qu''on lui rende immédiatement son bien, ou bien que l''on coupe le doigt de son frère. Les pourparlers échouèrent, et l''on trancha le doigt de Dindá.

Cet acte d''une cruauté inouïe bouleversa toute la famille et la communauté. On se réunit, et Dindá ordonna à tous les autres frères de cesser de collaborer avec Láda. De cette querelle naquit, dit la tradition, la séparation durable entre les communautés douala et pongo, animosité qui se perpétue de génération en génération.

**Morale**

La convoitise et l''intransigeance peuvent rompre à jamais les liens les plus sacrés ; un bien prêté par amour doit se traiter avec précaution et reconnaissance.

**Origine**

Conte étiologique sawa expliquant la séparation des Douala et des Pongo, Littoral, Cameroun.

— Source : Le Tamtam du Mboa — https://tamtamdumboa.com/la-bargue-qui-a-separe-deux-freres/', NULL, 'Littoral', 'Sawa', NULL),
  ('TALE', 'Les Jengu, esprits des eaux', '**Le conte**

Chez les peuples sawa de la côte camerounaise — Douala, Bakweri, Malimba, Bakoko, Oroko — on raconte l''existence des Jengu (au pluriel miengu), des esprits des eaux semblables à de belles sirènes aux longs cheveux et aux dents écartées. Ils habitent les fleuves, les lacs et la mer, et servent d''intermédiaires entre le monde des vivants et celui des ancêtres.

On dit que les miengu commandent au destin des hommes et des animaux des cours d''eau. Vénérés comme des génies bienfaisants, ils apportent la bonne fortune, guérissent les maladies et dispensent une sagesse spirituelle à ceux qui les honorent. Gardiens du monde naturel, ils relient les fidèles aux esprits ancestraux.

Leur culte culmine dans la grande cérémonie du Ngondo, à Douala, sur le fleuve Wouri. La veille, les initiés se rassemblent à l''île de Jebale pour préparer les offrandes. Le jour venu, un plongeur s''immerge plusieurs minutes dans le fleuve pour visiter le royaume des ancêtres ; il en ressort porteur d''un message des miengu sur l''année à venir.

**Morale**

Respecter et honorer les esprits des eaux, gardiens de la nature et messagers des ancêtres, attire la protection, la guérison et la prospérité sur la communauté.

**Origine**

Légende et croyance des peuples sawa (Douala et apparentés), région du Littoral, Cameroun.

— Source : Wikipedia — https://en.wikipedia.org/wiki/Jengu', NULL, 'Littoral', 'Douala', NULL),
  ('TALE', 'Ngonnso'', mère fondatrice des Nso', '**Le conte**

La princesse Ngonnso'' était issue de la maison royale de Rifem, dans l''actuelle région de l''Adamaoua. En désaccord avec le choix du successeur au trône, elle se révolta et quitta sa terre natale pour aller fonder, plus loin, un nouveau royaume.

C''est ainsi qu''elle établit la chefferie des Nso (le Nso Fondom), dont elle devint la première reine-mère et la dirigeante. De son nom et de son geste fondateur naquit tout un peuple, attaché aux Grassfields de l''Ouest camerounais.

À sa mémoire fut sculptée une statue sacrée, la déesse Ngonnso'', incarnation de la vision du monde des Nso et objet d''une profonde vénération. Autour d''elle s''organisent encore aujourd''hui des rituels destinés à assurer la survie et la prospérité de la communauté. En 1902, lors d''une expédition coloniale, la statue fut dérobée et emportée en Allemagne ; un long combat mené par son peuple a permis d''obtenir l''engagement de sa restitution au Cameroun.

**Morale**

Le courage d''une femme fondatrice et le respect des ancêtres scellent l''identité et l''unité d''un peuple à travers les générations.

**Origine**

Légende fondatrice du peuple nso (Nso Fondom), région du Nord-Ouest, Cameroun.

— Source : Open Restitution Africa — https://openrestitution.africa/case-study/the-restitution-journey-of-ngonnso-from-the-nso-kingdom-in-cameroon/', NULL, 'Nord-Ouest', 'Nso', NULL),
  ('LANGUAGE', 'Le duala (langue des Sawa)', 'Le **duala** (ou douala) est une langue **bantoue** de la grande famille **nigéro-congolaise**, parlée principalement dans la ville de Douala et ses environs, ainsi que dans une partie du Sud-Ouest du Cameroun. C''est la langue véhiculaire historique du grand peuple **Sawa** (populations côtières du Littoral).

Elle est la langue maternelle de plus de **550 000 personnes** et est comprise par plus de **1 500 000 locuteurs**. Le duala est proche d''autres parlers côtiers comme le pongo, le malimba, l''oli (ewodi) ou le bakweri. Langue à tons, elle a été l''une des premières langues camerounaises dotées d''une littérature écrite et d''une tradition de cantiques, sous l''influence des missions protestantes au XIXe siècle.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Duala_(langue)', 'dua', 'Littoral', 'Duala (Sawa)', NULL),
  ('LANGUAGE', 'L''ewondo (kóló)', 'L''**ewondo** (plus exactement *kóló*) est une langue **bantoue** parlée dans le Centre du Cameroun par le peuple **Beti**. C''est la langue nationale la plus parlée à **Yaoundé**, la capitale, et dans les régions voisines, avec plus de **2 millions** de locuteurs et environ 577 700 locuteurs de langue maternelle recensés en 1982.

L''ewondo sert de **langue véhiculaire** dans le Centre, utilisée par les commerçants, transporteurs et travailleurs migrants. Le terme « ewondo » résulte d''une confusion attribuée aux premiers colonisateurs (vers 1895) : les locuteurs se désignent eux-mêmes comme *Bëti be Kóló*. La langue est proche du bulu et de l''éton, au sein du sous-groupe beti.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Ewondo_(peuple)', 'ewo', 'Centre', 'Beti / Ewondo', NULL),
  ('LANGUAGE', 'Le fe''efe''e (nufi), langue bamiléké', 'Le **fe''efe''e**, le plus souvent appelé **nufi**, est une langue **bamiléké** (groupe grassfields, famille nigéro-congolaise) de la région de l''**Ouest** du Cameroun. Il est parlé principalement dans le département du **Haut-Nkam**, autour de la ville de **Bafang**.

Le nom *nufi* signifie littéralement « chose nouvelle » : avant l''arrivée des missionnaires français Barthélemy Tuem et Paul Gontier, la langue n''était qu''orale ; lorsqu''un système d''écriture lui fut donné dans les années 1920, les villageois s''exclamèrent « *nu fī* » d''émerveillement. Cette codification précoce (grammaire, lexiques, traductions) a fait du fe''efe''e l''une des langues bamiléké les mieux documentées et enseignées aujourd''hui.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Nufi', 'fmp', 'Ouest', 'Bamiléké (Bafang)', NULL),
  ('LANGUAGE', 'Le fulfulde de l''Adamaoua (peul)', 'Le **peul de l''Adamaoua** (autonyme : **fulfulde**) est une variété de la langue **peule**, de la famille **nigéro-congolaise** (branche atlantique, et non bantoue). Il est parlé par les **Peuls** dans les régions de l''**Adamaoua**, du **Nord** et de l''**Extrême-Nord** du Cameroun, ainsi qu''au Nigéria, au Tchad et au Soudan voisins.

Au Cameroun, le fulfulde est la **première langue africaine véhiculaire** du pays sur le plan géographique : il est parlé par environ un demi-million de Peuls sous trois formes dialectales, mais sert de langue d''échange à de nombreuses autres communautés du septentrion. À l''échelle continentale, l''ensemble peul compte plus de 60 millions de locuteurs à travers le Sahel et l''Afrique de l''Ouest et centrale.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Peul_de_l''Adamaoua', 'fub', 'Adamaoua', 'Peuls (Foulbé)', NULL),
  ('LANGUAGE', 'Le bassa (ɓasàa)', 'Le **bassa** (ou *ɓasàa*) est une langue **bantoue** (classée **A.40** dans la nomenclature Guthrie), parlée par environ **800 000 personnes**, soit près de 5 % de la population camerounaise.

Son foyer se situe autour de la ville d''**Édéa**, entre Douala et Yaoundé : dans la région du **Centre** (département du Nyong-et-Kéllé) et dans la région du **Littoral** (départements du Nkam et de la Sanaga-Maritime). Langue à tons, elle possède une riche tradition orale (contes, proverbes, chants) et est portée par le peuple bassa, l''un des plus anciennement établis dans cette zone forestière du sud du pays.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Bassa_(langue_bantoue)', 'bas', 'Centre', 'Bassa', NULL),
  ('LANGUAGE', 'Le ghomala'', langue bamiléké des Hauts-Plateaux', 'Le **ghomala''** est une langue **bamiléké** (groupe grassfields, famille nigéro-congolaise) parlée dans la région de l''**Ouest** du Cameroun, dans les départements de la Mifi, du Koung-Khi, de la Menoua, des Bamboutos et des Hauts-Plateaux. On l''estime à environ **260 000 locuteurs**.

Le ghomala'' regroupe plusieurs variantes : parlers du Centre (Bandjoun, Baham, Bayangam), du Nord (**Bafoussam**), du Sud (Bandenkop) et le ngemba (Bamendjou, Bansoa, Bamougoum…). Le bamiléké-bafoussam (*fussep*) en constitue une variété de référence. Comme les autres langues bamiléké, le ghomala'' est une langue tonale, support d''une forte identité communautaire dans les chefferies de l''Ouest.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Langues_Bamil%C3%A9k%C3%A9', 'bbj', 'Ouest', 'Bamiléké', NULL),
  ('LANGUAGE', 'Le boulou (bulu)', 'Le **boulou** (ou *bulu*) est une langue **bantoue** du sous-groupe **beti-fang**, parlée principalement au Cameroun par environ **1 600 000 locuteurs**, dont près de **800 000** comme langue maternelle.

C''est la langue des Bulu, peuple beti des forêts équatoriales du **Sud** du Cameroun. Au début du XXe siècle, le bulu a servi de langue véhiculaire et de langue d''évangelisation dans une large partie du Sud, ce qui lui a valu une importante littérature religieuse et orale. Il est très proche de l''ewondo et du fang, avec lesquels il forme un continuum linguistique beti.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Boulou_(langue)', 'bum', 'Sud', 'Bulu (Beti)', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Masque_boulou-Cameroun.jpg/960px-Masque_boulou-Cameroun.jpg'),
  ('LANGUAGE', 'Le yemba (bamiléké de Dschang)', 'Le **yemba** (ou *yémba*, parfois « bamiléké-Dschang ») est une langue **bamiléké** majeure de la région de l''**Ouest** du Cameroun. C''est la langue de **Dschang** et du département de la **Menoua**.

Le nombre de locuteurs est estimé entre **300 000 et 500 000** selon les sources. Comme les autres langues grassfields, le yemba est tonal et dispose d''un alphabet standardisé (alphabet général des langues camerounaises) ainsi que de matériel pédagogique, ce qui en fait l''une des langues bamiléké les plus enseignées dans la zone de Dschang.

— Source : Wikipedia — https://en.wikipedia.org/wiki/Yemba_language', 'ybb', 'Ouest', 'Bamiléké (Dschang)', NULL),
  ('LANGUAGE', 'Le medumba (langue de Bangangté)', 'Le **medumba** est une langue **bamiléké** parlée au Cameroun, surtout dans le département du **Ndé** (principaux foyers : **Bangangté**, Bakong, Bangoulap, Bahouoc, Tonga…) et chez les Bahouoc de Bali dans le Nord-Ouest. On l''estime à environ **210 000 locuteurs**.

Depuis la 16e édition d''Ethnologue, le medumba n''est plus classé parmi les langues bamiléké « modernes » mais parmi les langues **nun**. C''est une langue fortement tonale : son alphabet compte 33 lettres (23 consonnes, 10 voyelles) et **5 tons** (3 ponctuels et 2 mélodiques). Le medumba est la langue support de plusieurs danses et chants traditionnels du pays bangangté, comme le bend-skin et le mangambeu.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/M%C3%A9dumba', 'byv', 'Ouest', 'Bamiléké (Bangangté)', NULL),
  ('RITE', 'Le Ngondo, culte des oracles de l''eau des Sawa', 'Le **Ngondo** est la grande fête traditionnelle et rituelle des peuples **Sawa** du littoral camerounais. Le mot signifie « assemblée » ou « réunion » : à l''origine, c''était l''assemblée annuelle réunissant les chefferies sawa pour rendre hommage aux ancêtres et aux esprits de l''eau.

Le **rite central** se déroule sur les berges du fleuve **Wouri**, à Douala. Un initié plonge en apnée depuis une pirogue sacrée avec un **vase** contenant les vœux et doléances de la communauté ; il remonte après une longue immersion avec un **message des oracles**, déchiffré dans une case sacrée puis transmis aux chefs et au public. La cérémonie symbolise le dialogue entre les vivants et les ancêtres, garants de la paix, de la fertilité et de la prospérité.

Les festivités s''étalent de septembre au premier dimanche de décembre et rassemblent les Sawa du Littoral, du Centre, du Sud et du Sud-Ouest. Le Ngondo a été **inscrit au patrimoine culturel immatériel de l''humanité par l''UNESCO en 2024**.

— Source : UNESCO PCI — https://ich.unesco.org/fr/RL/le-ngondo-culte-des-oracles-de-l-eau-et-traditions-culturelles-associees-chez-les-sawa-02140', NULL, 'Littoral', 'Sawa (Duala)', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/GedNgondoMessager.JPG/960px-GedNgondoMessager.JPG'),
  ('RITE', 'Le Nguon, rituels de gouvernance des Bamoun', 'Le **Nguon** est un ensemble de **rituels de gouvernance** observés par la communauté **Bamoun** de l''Ouest du Cameroun, autour de la ville de **Foumban**. Vieux de plus de **six cents ans**, il met en relation le *Mfon* (le roi/sultan) et son peuple afin de favoriser le dialogue, l''harmonie et la paix, sur une période de trois jours.

Tous les deux ans, début décembre, des chefs rituels consultent secrètement la communauté sur l''état du royaume, puis pénètrent de nuit dans le palais pour s''adresser au Mfon. Le lendemain, le monarque est soumis à un véritable **« procès » public** de sa gouvernance : les chefs rituels lisent les griefs recueillis auprès du peuple, et le Mfon peut être sanctionné d''une amende, voire destitué. Le Nguon illustre un **mécanisme africain de reddition de comptes** antérieur à la colonisation, valorisant la liberté d''expression et l''humilité. Il a été inscrit au patrimoine culturel immatériel de l''humanité par l''**UNESCO en 2023**.

— Source : UNESCO PCI — https://ich.unesco.org/fr/RL/le-nguon-rituels-de-gouvernance-et-expressions-associees-dans-la-communaute-bamoun-01955', NULL, 'Ouest', 'Bamoun', NULL),
  ('RITE', 'Le Mpo''o, rite funéraire des Bassa', 'Le **Mpo''o** désigne le grand rite funéraire et initiatique du peuple **Bassa** (région du Centre et du Littoral, autour d''Édéa). Dans cette société à forte tradition orale, il occupe une place capitale : gardien des lois et de la morale du clan, il constitue le lien le plus solide avec les origines historiques et les fondations mythiques de la culture bassa.

La cérémonie est une **mise en scène publique du symbolique**, régulée par le groupe des **initiés**. Elle se déroule du **coucher du soleil jusqu''au lendemain matin** et s''organise en trois phases essentielles, mêlant chants, danses, et transmission des savoirs ancestraux. Le Mpo''o accompagne le passage du défunt vers le monde des ancêtres et réaffirme la cohésion de la communauté autour de sa mémoire collective.

— Source : Étude — rites funéraires bassa — http://www.fins-wins.org/presse/De%20la%20Vie%20%C3%A0%20la%20Vie.pdf', NULL, 'Centre', 'Bassa', NULL),
  ('RITE', 'Les funérailles bamiléké et le culte des crânes', 'Chez les **Bamiléké** de l''Ouest du Cameroun, les **funérailles** sont un rite séculaire qui accorde une place centrale aux morts et au culte des ancêtres. Chaque descendant a le devoir d''honorer la mémoire de son ascendant : c''est par ce rite que le défunt, après l''exhumation de son crâne, accède au **rang d''ancêtre**.

Le processus d''ancestralisation suit le schéma des **doubles funérailles** : de l''enterrement du corps à l''**exhumation du crâne**, considéré comme le siège de l''esprit, organisant une véritable « résurrection » du mort en ancêtre. Les crânes sont conservés et honorés dans une **case des ancêtres**, où on peut les consulter, les « nourrir » et les associer aux grands événements familiaux. Entretenir ces crânes est jugé essentiel pour éviter la colère des esprits — maladie, infertilité, malheur. Le rite s''accompagne de danses initiatiques et rythme la vie sociale des chefferies de l''Ouest.

— Source : Cairn.info (revue Communications) — https://www.cairn.info/revue-communications-2015-2-page-93.htm', NULL, 'Ouest', 'Bamiléké', NULL),
  ('RITE', 'Le So, rite d''initiation fang-beti', 'Le **So** est un **rite d''initiation** et une **société secrète** du groupe **Fang-Beti** du sud du Cameroun. Il est lié à l''art de la guerre et à la transmission des principes communautaires : c''est au cours du cérémonial du So que les jeunes sont formés aux valeurs, à la discipline et aux savoirs du groupe.

Le rite tire son nom de la grande antilope nocturne (*so*), son animal éponyme. On y emploie des **masques à cornes**, les cornes symbolisant la lune, qui interviennent de nuit pour chasser les esprits perturbateurs. Comme beaucoup de rites beti, le So est conçu pour resserrer les liens entre le monde des humains et le surnaturel ; son **secret** est jalousement gardé par les initiés. Sa pratique a fortement évolué sous l''impact de la colonisation et de l''évangélisation.

— Source : Université de Sherbrooke (mémoire) — https://savoirs.usherbrooke.ca/handle/11143/12662', NULL, 'Sud', 'Fang-Beti', NULL),
  ('RITE', 'Le festival Lela des Bali Nyonga', 'Le **Lela** est le grand festival annuel des **Bali Nyonga**, chefferie d''origine **Chamba** des Grassfields, dans la région du **Nord-Ouest** du Cameroun. D''une durée de quatre jours, généralement en décembre, il commémore les guerres menées par les Chamba au cours de leurs migrations et possède une signification à la fois religieuse, militaire, diplomatique et politique. Son nom vient de *lera*, une flûte en bambou jouée pendant les festivités.

Le festival se structure en phases : le **premier jour** est religieux, au cours duquel, à un cours d''eau sacré, les drapeaux blancs (*Tutuwan*) sont purifiés et les divinités du pays apaisées ; le **deuxième jour** commémore les victoires guerrières par des manœuvres et démonstrations martiales ; le **troisième jour**, politique, voit le *Fon* nommer de nouveaux dignitaires (*nkom*) et prononcer un discours sur l''état du royaume. Réinterprété au fil de l''histoire coloniale et post-coloniale, le Lela est devenu l''un des marqueurs identitaires majeurs des Grassfields.

— Source : R. Fardon, Lela in Bali (ResearchGate) — https://www.researchgate.net/publication/290985435_Lela_in_Bali_History_through_ceremony_in_Cameroon', NULL, 'Nord-Ouest', 'Bali Nyonga (Chamba)', NULL),
  ('CUSTOM', 'La chefferie traditionnelle bamiléké', 'La **chefferie** est l''institution centrale de l''organisation sociale **bamiléké**, dans la région de l''**Ouest** du Cameroun. C''est une sorte de **micro-État** centralisé autour d''un roi (le *Fo* ou chef) jouissant d''un pouvoir semi-divin, qui incarne et représente sa communauté. Le chef est désigné de manière traditionnelle, généralement au décès de son père.

Il ne gouverne pas seul : il est entouré de **notables**, de reines et de **sociétés secrètes et coutumières**. La communication avec les ancêtres et Dieu relève le plus souvent du **Conseil suprême des notables** (le « Conseil des neuf »). L''accès aux sociétés secrètes passe par l''**initiation**, base des coutumes. Très hiérarchisée (notables, fils de chef, serviteurs, villageois), la chefferie demeure un pilier de l''identité bamiléké, célébrée par une architecture de palais et de cases richement sculptées.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Chefferie_bamil%C3%A9k%C3%A9e', NULL, 'Ouest', 'Bamiléké', NULL),
  ('CUSTOM', 'L''organisation en lignages', 'Dans de nombreuses sociétés camerounaises, et particulièrement chez les **Bamiléké**, le **lignage** constitue l''épine dorsale de l''organisation sociale. Les familles y sont hiérarchisées selon des critères précis qui déterminent leur statut et leur influence au sein de la communauté.

L''étude des chefferies montre comment se reconstituent les **clientèles successives** et leur hiérarchisation progressive en strates sociales — notables, fils de chef, serviteurs, villageois. Le lignage régit l''héritage, la succession (souvent un seul héritier principal perpétue le nom et le patrimoine), l''accès à la terre et la place de chacun dans les rites. Il fonde aussi la **parenté élargie**, où la solidarité familiale dépasse de loin le foyer nucléaire et structure la transmission de la mémoire des ancêtres.

— Source : Persée — Journal des Africanistes — https://www.persee.fr/doc/jafr_0399-0346_1976_num_46_1_1776', NULL, 'Ouest', 'Bamiléké', NULL),
  ('CUSTOM', 'La dot et le mariage coutumier', 'La **dot** est au cœur du **mariage traditionnel** camerounais. Chacun de ses éléments porte une signification précise, témoignant du respect, de l''estime et des vœux de prospérité adressés aux jeunes mariés ; elle exprime la reconnaissance envers la famille de la mariée.

La dot peut comprendre des **tissus précieux, des instruments de musique, des sommes symboliques d''argent, des produits traditionnels ou du bétail**. Elle remplit une double fonction : une valeur de **compensation** envers la famille à laquelle on « ôte » un membre, et une **épreuve** destinée à éprouver le sérieux du prétendant. Les modalités varient d''une région à l''autre, mais la valeur traditionnelle reste la même. Signe de sa persistance, le **23 décembre 2024**, l''Assemblée nationale du Cameroun a adopté la loi n°2024/016 conférant une **reconnaissance juridique** au mariage coutumier.

— Source : Actu Cameroun — https://actucameroun.com/2024/12/26/la-dot-a-desormais-un-statut-legal-au-cameroun/', NULL, 'National', NULL, NULL),
  ('CUSTOM', 'Le totem', 'Le **totem** repose sur la croyance qu''un **animal** peut être un ancêtre de la famille ou du groupe, et qu''il en protège l''environnement. Au Cameroun, les totems ne sont ni des icônes ni des idoles : ils jouent le rôle de **lien symbolique entre la nature et le sacré**.

Dans les **Grassfields** (Ouest et Nord-Ouest), les chefs se réfèrent à de puissants animaux — **éléphant, buffle, gorille, mygale, python, lion, panthère**. L''**éléphant**, par exemple, symbolise la grandeur, la sagesse et la douceur, et figure abondamment dans l''art des chefferies (masques, perlages, sculptures). Le totem oriente certaines interdictions alimentaires et comportementales, et reste un repère identitaire fort des lignages camerounais.

— Source : Ministère du Tourisme (Cameroun) — https://mintoul.gov.cm/infos-pratiques/us-et-coutumes/', NULL, 'National', NULL, NULL),
  ('CUSTOM', 'Le respect des aînés et le culte des ancêtres', 'Le **respect des aînés** est une valeur fondamentale au Cameroun, indissociable du **culte des ancêtres**. Les aînés sont les dépositaires de la mémoire, de la sagesse et de l''autorité morale ; lors des cérémonies importantes, ce sont eux et les dignitaires des familles qui **invoquent les ancêtres** et les forces bienveillantes.

Les ancêtres sont perçus comme des intermédiaires actifs entre les vivants et le sacré. Une mort suspecte, une infortune ou une défaillance peuvent être interprétées comme le signe d''un dysfonctionnement dans la relation avec eux — un message d''ancêtres « fâchés » qu''il faut apaiser par des rites. Ce respect structure la vie quotidienne : préséance des aînés dans la parole, salutations, partage et transmission, et entretien de la relation aux disparus à travers les chefferies et les cases familiales.

— Source : Ministère du Tourisme (Cameroun) — https://mintoul.gov.cm/infos-pratiques/us-et-coutumes/', NULL, 'National', NULL, NULL),
  ('MUSIC', 'Le makossa', 'Le **makossa** est le genre musical urbain emblématique du **Littoral** camerounais. Le mot vient du **duala** : il évoque « les contorsions » / « (je) danse », et dérive d''une danse duala appelée *kossa*.

Le genre s''est forgé dans les années 1960, notamment dans les boîtes de nuit de Santa Isabel (Guinée équatoriale), où des musiciens camerounais ont croisé les **rythmes latino-américains** ; du mélange de ces sonorités avec des rythmes traditionnels comme l''**assiko** est né le makossa. Caractérisé par une ligne de basse marquée et des cuivres, il a été **popularisé dans le monde par Manu Dibango** avec le tube *Soul Makossa* (1972), succès international. C''est l''un des genres camerounais les plus exportés.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Musique_camerounaise', NULL, 'Littoral', 'Duala', NULL),
  ('MUSIC', 'Le bikutsi', 'Le **bikutsi** — littéralement « danse-frappe-sol » — est un rythme traditionnel originaire du peuple **Beti**, dans la région du **Centre**, autour de **Yaoundé**. À l''origine, il était surtout pratiqué et chanté par les **femmes**, ce qui en a fait un genre porteur d''une parole féminine forte.

Il s''est développé à partir des styles traditionnels des Beti / Ewondo et s''est popularisé avec l''exode vers Yaoundé, avant de s''électrifier (guitares au son percussif imitant le balafon). Parmi ses figures notables, **K-Tino** (Catherine Edoa Ngoa), issue de l''ethnie Ewondo, interprète ses chansons en langue ewondo mêlée de français. Le bikutsi demeure l''un des deux grands piliers de la musique populaire camerounaise, aux côtés du makossa.

— Source : Wikipedia — https://en.wikipedia.org/wiki/Bikutsi', NULL, 'Centre', 'Beti / Ewondo', NULL),
  ('MUSIC', 'L''assiko', 'L''**assiko** est un genre musical et une danse présents dans les régions **côtière, Centre, Sud et Nord-Ouest** du Cameroun, avec de nombreuses variantes locales. C''est une forme de **musique de vin de palme** (*palm-wine music*), portée traditionnellement par la **guitare** accompagnée de percussions (souvent une bouteille frappée au couteau marquant le tempo).

Après l''indépendance (1960), cette variante locale s''est popularisée grâce à des artistes comme **Jean Bikoko** et **Bernard Dikoumé**. L''assiko a aussi influencé la genèse du makossa. Il se distingue par son jeu de guitare vif et syncopé et par une danse énergique, et reste un patrimoine vivant de la musique de danse camerounaise.

— Source : Wikipédia FR — https://fr.wikipedia.org/wiki/Musique_camerounaise', NULL, 'Littoral', 'Bassa / peuples côtiers', NULL),
  ('MUSIC', 'Le mvet, cithare-harpe des conteurs beti-fang', 'Le **mvet** (ou *mvett*) est un instrument à cordes — une **cithare sur bâton** — emblématique des peuples **Fang, Beti, Bulu et Ewondo** des forêts du **Sud** et du **Centre** du Cameroun (et des pays voisins : Gabon, Guinée équatoriale…).

Il est constitué d''une tige de raphia ou de bambou d''un à deux mètres, munie en général de **trois calebasses** servant de résonateurs et d''un chevalet vertical central séparant quatre ou cinq cordes, jouées de part et d''autre. Au-delà de l''instrument, le mvet désigne toute une **tradition de chant épique** : les conteurs (*mbomo mvet*), considérés comme des dépositaires d''un savoir quasi divin, récitent des épopées mythologiques et historiques (notamment le cycle d''Engong/Oveng), mêlant philosophie, récits de guerre et connaissance du monde.

— Source : Wikipedia — https://en.wikipedia.org/wiki/Mvet', NULL, 'Sud', 'Fang-Beti', NULL),
  ('MUSIC', 'Le balafon', 'Le **balafon** est un **xylophone** traditionnel d''Afrique de l''Ouest et centrale, très présent au Cameroun, notamment dans les **Grassfields** (Ouest) et chez les populations du septentrion. Il se compose de **lames de bois** accordées, frappées à l''aide de mailloches, sous lesquelles sont fixées des **calebasses** servant de résonateurs.

Dans la musique camerounaise, le balafon accompagne danses, récitations et cérémonies ; on en joue parfois en interludes lors de performances de mvet. Son timbre percussif a profondément marqué l''esthétique des musiques modernes du pays — le jeu de guitare du bikutsi, par exemple, cherche à imiter la sonorité du balafon. C''est l''un des instruments mélodiques traditionnels les plus reconnaissables du patrimoine camerounais.

— Source : Wikipedia — Music of Cameroon — https://en.wikipedia.org/wiki/Music_of_Cameroon', NULL, 'Ouest', NULL, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/African_Balafon_in_Museu_Oscar_Niemeyer.jpg/960px-African_Balafon_in_Museu_Oscar_Niemeyer.jpg'),
  ('MUSIC', 'Le bend-skin (ben skin)', 'Le **bend-skin** (ou *ben skin*) est une musique et une **danse** des **Bamiléké** de l''**Ouest** du Cameroun. L''expression « bend skin » signifie « se pencher en avant », ce qui décrit le mouvement caractéristique de la danse, exécutée principalement par les **femmes**.

Originaire du pays **bangangté**, il est souvent chanté en **medumba** (la langue de Bangangté) et dans d''autres parlers bamiléké. La musique s''appuie sur des **tambours** et des **maracas**, parfois fabriqués avec des canettes de soda. Le genre s''est popularisé vers **1993**, dans le quartier New-Bell de Douala, en pleine crise économique, avant d''être adopté par les milieux urbains de tout le pays. Il est étroitement lié au mangambeu, un autre style bamiléké.

— Source : Wikipedia — https://en.wikipedia.org/wiki/Bend-skin', NULL, 'Ouest', 'Bamiléké (Bangangté)', NULL),
  ('MUSIC', 'Le mangambeu', 'Le **mangambeu** est une danse et une musique traditionnelle **bamiléké** du Cameroun, originaire du pays **bangangté** (région de l''Ouest). Le genre tirerait son nom de la fille de Moussa Tontchap, dont le talent de danseuse aurait marqué le public.

Le mangambeu accompagne diverses **cérémonies et fêtes** — célébrations de naissances, mariages, réjouissances communautaires. Il s''appuie sur un univers sonore où la **sanza** (lamellophone) tient une place notable, et il est étroitement associé au bend-skin, autre style et danse bamiléké. Le mangambeu illustre la vitalité des musiques de l''Ouest, profondément ancrées dans la vie sociale des chefferies des Grassfields.

— Source : Agence Anadolu (AA) — https://www.aa.com.tr/fr/afrique/cameroun-le-mangambeu-un-air-de-sanza-une-danse-une-culture-/2668507', NULL, 'Ouest', 'Bamiléké (Bangangté)', NULL)
)
INSERT INTO cultural_content
  (id, author_account_id, content_type, title, body, language_code, region, ethnic_group,
   image_url, visibility_scope, moderation_status, is_from_verified_authority, created_at, updated_at)
SELECT
  uuid_generate_v4(), (SELECT id FROM admin), d.content_type::"cultural_content_type",
  d.title, d.body, d.language_code, d.region, d.ethnic_group, d.image_url,
  'PUBLIC'::"visibility_scope", 'APPROVED'::"moderation_status", TRUE, NOW(), NOW()
FROM data d
WHERE NOT EXISTS (
  SELECT 1 FROM cultural_content c
  WHERE c.content_type = d.content_type::"cultural_content_type"
    AND lower(c.title) = lower(d.title)
);

-- Backfill images for rows inserted by an earlier run.
UPDATE cultural_content c SET image_url = d.image_url
FROM (VALUES
  ('RECIPE', 'Ndolé', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Le_Ndol%C3%A9.JPG'),
  ('RECIPE', 'Eru', 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Le_Eru%2C_un_plat_camerounais.jpg'),
  ('RECIPE', 'Achu (taro sauce jaune)', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Taro_sauce_jaune_avec_peau_de_boeuf.jpg'),
  ('RECIPE', 'Mbongo Tchobi (sauce noire)', 'https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg'),
  ('RECIPE', 'Koki (gâteau de haricots)', 'https://upload.wikimedia.org/wikipedia/commons/c/cd/D%C3%A9gustation_de_koki.jpg'),
  ('RECIPE', 'Poulet DG', 'https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG'),
  ('RECIPE', 'Nkondrè (Kondrè)', 'https://upload.wikimedia.org/wikipedia/commons/2/21/Pr%C3%A9paration_du_Kondre_ch%C3%A8vre.jpg'),
  ('RECIPE', 'Ekwang', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Ekpang.png'),
  ('RECIPE', 'Soya (brochettes de bœuf épicées)', 'https://upload.wikimedia.org/wikipedia/commons/a/ab/SuyavarietiesTX.JPG'),
  ('RECIPE', 'Bobolo / Miondo (bâton de manioc)', 'https://upload.wikimedia.org/wikipedia/commons/5/58/B%C3%A2tons_de_manioc_de_Tayap.JPG'),
  ('RECIPE', 'Foléré / Bissap (boisson d''oseille de Guinée)', 'https://upload.wikimedia.org/wikipedia/commons/9/94/Flor_de_Jamaica.jpg'),
  ('RECIPE', 'Nkui (sauce gluante de l''Ouest)', 'https://upload.wikimedia.org/wikipedia/commons/5/53/Nkui.jpg'),
  ('RECIPE', 'Foufou (de manioc ou de maïs)', 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Ghana_fufu.jpg'),
  ('PEOPLE', 'Les Bamiléké', 'https://upload.wikimedia.org/wikipedia/commons/3/36/Bamileke_dressing.jpg'),
  ('PEOPLE', 'Les Beti (Ewondo et Eton)', 'https://upload.wikimedia.org/wikipedia/commons/9/91/Charles_Atangana_portrait.jpg'),
  ('PEOPLE', 'Les Bulu', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Masque_boulou-Cameroun.jpg'),
  ('PEOPLE', 'Les Fang', 'https://upload.wikimedia.org/wikipedia/commons/8/88/A_Fang_family_%28c.1912%29.jpg'),
  ('PEOPLE', 'Les Douala', 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Rudolf_Manga.jpg'),
  ('PEOPLE', 'Les Bassa', 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Ngog-Lituba_01.jpg'),
  ('PEOPLE', 'Les Bamoun', 'https://upload.wikimedia.org/wikipedia/commons/6/62/Njoya_of_Bamun.jpg'),
  ('PEOPLE', 'Les Tikar', 'https://upload.wikimedia.org/wikipedia/commons/3/39/Tikar_Mask.jpg'),
  ('PEOPLE', 'Les Peuls (Foulbé)', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/LamidoGrandMosque.jpg'),
  ('PEOPLE', 'Les Kirdi', 'https://upload.wikimedia.org/wikipedia/commons/0/00/Camerun%2C_kirdi%2C_valuta_in_ferro%2C_xx_sec._02.JPG'),
  ('PEOPLE', 'Les Bakweri', 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Bakweri_cocoyam_farmer_from_Cameroon.jpg'),
  ('PEOPLE', 'Les Maka', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Maka_woman_going_to_fields.jpg'),
  ('PEOPLE', 'Les Gbaya', 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Karnou_%2828602315084%29.jpg'),
  ('PEOPLE', 'Les Massa', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Sar%C3%A9_masa.JPG'),
  ('PEOPLE', 'Les Toupouri', 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Toupouri_de_la_plaine_de_Extr%C3%AAme-Nord.jpg'),
  ('PEOPLE', 'Les Kotoko', 'https://upload.wikimedia.org/wikipedia/commons/2/28/The_Logon-Birni_-_general_view.jpg'),
  ('PEOPLE', 'Les Mafa', 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Tkaczka_z_ludu_Mafa_-_Kamerun_-_001961s.jpg'),
  ('PEOPLE', 'Les Mousgoum', 'https://upload.wikimedia.org/wikipedia/commons/7/71/Cases_Mousgoum_2.jpg'),
  ('PEOPLE', 'Les Baka', 'https://upload.wikimedia.org/wikipedia/commons/5/54/Baka_dancers_June_2006.jpg'),
  ('PEOPLE', 'Les Bafia', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/CABA_NKONDO_tenu_de_travail_au_cameroun.jpg/960px-CABA_NKONDO_tenu_de_travail_au_cameroun.jpg'),
  ('LANGUAGE', 'Le boulou (bulu)', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Masque_boulou-Cameroun.jpg/960px-Masque_boulou-Cameroun.jpg'),
  ('RITE', 'Le Ngondo, culte des oracles de l''eau des Sawa', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/GedNgondoMessager.JPG/960px-GedNgondoMessager.JPG'),
  ('MUSIC', 'Le balafon', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/African_Balafon_in_Museu_Oscar_Niemeyer.jpg/960px-African_Balafon_in_Museu_Oscar_Niemeyer.jpg')
) AS d(content_type, title, image_url)
WHERE lower(c.title) = lower(d.title)
  AND c.content_type = d.content_type::"cultural_content_type"
  AND (c.image_url IS NULL OR c.image_url = '');

SELECT content_type, count(*) AS n, count(image_url) AS with_photo
FROM cultural_content GROUP BY content_type ORDER BY content_type;
