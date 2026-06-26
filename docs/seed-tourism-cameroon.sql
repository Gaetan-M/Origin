-- ============================================================================
-- ORIGIN — Seed: real Cameroon tourism / heritage sites (idempotent)
-- ----------------------------------------------------------------------------
-- Populates `tourism_places` with ~24 genuine Cameroonian destinations across
-- all regions, with descriptions, category, GPS coordinates (for the map) and
-- provenance. Curated from public tourism references (see source_ref). Safe to
-- re-run: rows are inserted only if a place with the same name doesn't exist.
-- Attributed to the admin account (+237655922472), PUBLIC + verified.
-- Run in Supabase SQL Editor.
-- ============================================================================

WITH admin AS (
  SELECT id FROM accounts WHERE phone_number = '+237655922472' LIMIT 1
),
data(name, description, region, category, lat, lng, source_ref) AS (
  VALUES
  ('Mont Cameroun',
   'Volcan actif culminant à 4 095 m, plus haut sommet d''Afrique de l''Ouest. Randonnée mythique « la Course de l''Espoir » depuis Buea, forêts, coulées de lave et vues sur l''océan.',
   'Sud-Ouest', 'NATURE', 4.2030, 9.1700, 'Komoot / Cameroon tourism guides'),
  ('Chutes de la Lobé',
   'Rares cascades au monde se jetant directement dans l''océan Atlantique, près de Kribi. Pirogues, plage et villages Pygmées Bagyeli à proximité.',
   'Sud', 'NATURE', 2.8800, 9.9100, 'Cameroon tourism guides'),
  ('Parc national de Waza',
   'Réserve emblématique de l''Extrême-Nord : éléphants, lions, girafes, antilopes et plus de 500 espèces d''oiseaux. Meilleure saison : novembre à mai.',
   'Extrême-Nord', 'NATURE', 11.3200, 14.6600, 'Cameroon tourism guides'),
  ('Palais Royal des Bamoun (Foumban)',
   'Palais des Sultans Bamoun et son musée : trônes perlés, masques, objets royaux retraçant des siècles d''histoire de la dynastie. Cœur culturel de l''Ouest.',
   'Ouest', 'MUSEUM', 5.7250, 10.9000, 'Foumban Royal Palace & Museum'),
  ('Chefferie de Bandjoun',
   'Grande chefferie Bamiléké : case patriarcale à toit conique, place des cérémonies et musée d''art traditionnel. Architecture et rites vivants.',
   'Ouest', 'CHEFFERIE', 5.3700, 10.4200, 'Cameroon heritage references'),
  ('Chefferie de Bafut',
   'Palais du Fon de Bafut (Nord-Ouest), ensemble de cases sacrées et traditionnel ; site du patrimoine, hauts lieux de la culture des Grassfields.',
   'Nord-Ouest', 'CHEFFERIE', 6.1000, 10.1000, 'Cameroon heritage references'),
  ('Plages de Kribi',
   'Stations balnéaires du golfe de Guinée : Grand Batanga, Plage des Amoureux, sable fin, poisson braisé et eaux chaudes.',
   'Sud', 'NATURE', 2.9400, 9.9100, 'Cameroon tourism guides'),
  ('Limbé (Jardin botanique & plages noires)',
   'Ville côtière du Sud-Ouest : jardin botanique historique, sable volcanique noir, centre de réhabilitation des primates et front de mer animé.',
   'Sud-Ouest', 'NATURE', 4.0200, 9.2100, 'Cameroon tourism guides'),
  ('Lac Nyos',
   'Lac de cratère du Nord-Ouest aux eaux turquoise, célèbre et impressionnant, niché dans des collines volcaniques.',
   'Nord-Ouest', 'NATURE', 6.4400, 10.3000, 'Cameroon tourism guides'),
  ('Rhumsiki & Monts Mandara',
   'Paysage lunaire de pitons volcaniques de l''Extrême-Nord, villages Kapsiki, randonnées et couchers de soleil spectaculaires.',
   'Extrême-Nord', 'NATURE', 10.5000, 13.5700, 'Cameroon tourism guides'),
  ('Réserve de faune du Dja',
   'Forêt tropicale classée au patrimoine mondial de l''UNESCO : l''une des plus vastes et préservées d''Afrique, gorilles, chimpanzés, biodiversité unique.',
   'Sud', 'NATURE', 3.0000, 13.0000, 'UNESCO World Heritage'),
  ('Parc national de Korup',
   'L''une des plus anciennes forêts tropicales du monde (Sud-Ouest) : biodiversité exceptionnelle, sentiers, pont suspendu et oiseaux rares.',
   'Sud-Ouest', 'NATURE', 5.0700, 8.8500, 'Cameroon tourism guides'),
  ('Chutes d''Ekom-Nkam',
   'Chutes spectaculaires du Littoral (les « chutes de Tarzan »), rideau d''eau dans une forêt luxuriante près de Melong.',
   'Littoral', 'NATURE', 5.0700, 9.9700, 'Cameroon tourism guides'),
  ('Monts Bamboutos & Lac Manengouba',
   'Hauts plateaux de l''Ouest et lacs jumeaux du Manengouba (mâle et femelle), randonnées d''altitude et paysages verdoyants.',
   'Ouest', 'NATURE', 5.0300, 9.8300, 'Cameroon tourism guides'),
  ('Monument de la Réunification (Yaoundé)',
   'Monument emblématique de la capitale célébrant la réunification du Cameroun, spirale symbolique et esplanade.',
   'Centre', 'HERITAGE', 3.8700, 11.5200, 'Cameroon heritage references'),
  ('Musée National du Cameroun (Yaoundé)',
   'Ancien palais présidentiel devenu musée national : art, archéologie et histoire des peuples du Cameroun.',
   'Centre', 'MUSEUM', 3.8600, 11.5200, 'Musée National du Cameroun'),
  ('Cathédrale Notre-Dame des Victoires (Yaoundé)',
   'Cathédrale historique de Yaoundé, architecture remarquable et haut lieu de la vie religieuse de la capitale.',
   'Centre', 'RELIGIOUS', 3.8660, 11.5170, 'Cameroon heritage references'),
  ('Site mémoriel de Bimbia',
   'Ancien port de la traite négrière près de Limbé : vestiges, mémoire de la diaspora afro-descendante et lieu de recueillement.',
   'Sud-Ouest', 'HERITAGE', 3.9800, 9.3000, 'Bimbia Slave Trade history'),
  ('Lac Ossa (Édéa)',
   'Réserve du Littoral aux lacs paisibles, refuge des lamantins d''Afrique et riche avifaune, en pirogue.',
   'Littoral', 'NATURE', 3.8000, 10.0500, 'Cameroon tourism guides'),
  ('Parc national de Campo-Ma''an',
   'Massif forestier du Sud près de la côte : éléphants de forêt, gorilles, mandrills et plages voisines.',
   'Sud', 'NATURE', 2.3600, 10.1300, 'Cameroon tourism guides'),
  ('Parc national de la Bénoué',
   'Savane du Nord le long de la rivière Bénoué : hippopotames, antilopes, lions et safaris.',
   'Nord', 'NATURE', 8.3000, 13.8300, 'Cameroon tourism guides'),
  ('Parc de Mefou (sanctuaire des primates)',
   'Sanctuaire près de Yaoundé accueillant gorilles, chimpanzés et mandrills secourus ; sensibilisation et forêt.',
   'Centre', 'NATURE', 3.6300, 11.6000, 'Ape Action Africa'),
  ('Quartier des artisans de Foumban',
   'Rue des artisans Bamoun : sculpteurs sur bois, fondeurs de bronze, brodeurs et potiers ; achat direct d''art camerounais.',
   'Ouest', 'CULTURE', 5.7220, 10.9020, 'Foumban Artisanal Centre'),
  ('Grand Nord — Vieilles villes de Maroua & Garoua',
   'Marchés colorés, artisanat du cuir et du coton, architecture sahélienne et porte d''entrée des parcs du Nord.',
   'Extrême-Nord', 'CULTURE', 10.5910, 14.3150, 'Cameroon tourism guides')
)
INSERT INTO tourism_places
  (id, name, description, region, category, latitude, longitude, source, source_ref,
   verified, verified_by_account_id, submitted_by_account_id, visibility_scope, created_at, updated_at)
SELECT
  uuid_generate_v4(), d.name, d.description, d.region,
  d.category::"tourism_category", d.lat, d.lng, 'COMMUNITY'::"tourism_source", d.source_ref,
  TRUE, (SELECT id FROM admin), (SELECT id FROM admin), 'PUBLIC'::"visibility_scope", NOW(), NOW()
FROM data d
WHERE NOT EXISTS (SELECT 1 FROM tourism_places t WHERE t.name = d.name);

-- Verify
SELECT region, category, count(*) FROM tourism_places GROUP BY region, category ORDER BY region;
