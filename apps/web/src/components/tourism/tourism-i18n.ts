'use client';

import { useUiStore } from '@/stores/ui-store';
import type { TourismCategory, TourismSource } from '@/lib/api/tourism';

/**
 * Self-contained bilingual FR/EN strings for the PUBLIC tourism / heritage
 * surface. Kept local (rather than in src/i18n/{fr,en}.json) so the tourism
 * module ships as a set of NEW files only — see INTEGRATION NEEDED about
 * optionally folding these keys into the central dictionaries later.
 */
const STRINGS = {
  fr: {
    title: 'Tourisme',
    subtitle: 'Lieux de patrimoine et de tourisme a decouvrir',
    empty: 'Aucun lieu pour le moment',
    emptyHint: 'Sites historiques, nature, musees et chefferies apparaitront ici.',
    error: 'Impossible de charger les lieux',
    retry: 'Reessayer',
    loadMore: 'Voir plus',
    loadingMore: 'Chargement...',
    submit: 'Proposer un lieu',
    verified: 'Verifie',
    sourceLabel: 'Source',
    provenanceHint: 'Donnee fournie a titre de source citee. Origin reste independant.',
    filterAllRegions: 'Toutes les regions',
    filterAllCategories: 'Toutes les categories',
    verifiedOnly: 'Verifies uniquement',
    readMore: 'Lire la suite',
    viewOnMap: 'Voir sur la carte',
    // Explorer
    heroTitle: 'Sur les traces du patrimoine',
    heroSubtitle:
      'Explorez les chefferies, musees, sites naturels et lieux de memoire du Cameroun. Chaque lieu cite sa source.',
    tabMap: 'Carte',
    tabList: 'Liste',
    searchPlaceholder: 'Rechercher un lieu, une region...',
    resultsCount: 'lieu(x)',
    clearFilters: 'Effacer les filtres',
    noResults: 'Aucun lieu ne correspond a votre recherche',
    noResultsHint: 'Essayez une autre region, categorie ou mot-cle.',
    mapNoGeo: 'Aucun lieu localise pour ces filtres',
    mapNoGeoHint: 'Les lieux sans coordonnees apparaissent dans la liste.',
    mapLegend: 'Legende',
    openPlace: 'Ouvrir',
    directions: 'Comment y aller',
    onMap: 'lieux sur la carte',
    // Detail page
    back: 'Retour',
    backToList: 'Tous les lieux',
    detailNotFound: 'Lieu introuvable',
    detailNotFoundHint: 'Ce lieu a peut-etre ete retire ou n’existe pas.',
    locationLabel: 'Localisation',
    aboutLabel: 'A propos',
    affinityTitle: 'Lieux pres de ta region',
    affinitySubtitle: 'Sur la base de ton village d’origine',
    nearbyTitle: 'Dans la meme region',
    addedOn: 'Ajoute le',
    coordinatesCopied: 'Coordonnees copiees',
    // Form
    formTitle: 'Proposer un lieu',
    formSubtitle:
      'Aidez a documenter le patrimoine. Indiquez votre source — elle sera verifiee avant publication.',
    fieldName: 'Nom du lieu',
    fieldNamePlaceholder: 'Ex : Chefferie de Bafut',
    fieldDescription: 'Description',
    fieldDescriptionPlaceholder: 'Decrivez ce lieu, son histoire, son interet...',
    fieldRegion: 'Region',
    fieldRegionPlaceholder: 'Ex : Nord-Ouest, Ouest...',
    fieldCategory: 'Categorie',
    fieldSource: 'Type de source',
    fieldSourceRef: 'Reference de la source',
    fieldSourceRefPlaceholder: 'Ex : URL du Ministere du Tourisme, nom de l’ONG, document...',
    fieldLatitude: 'Latitude',
    fieldLongitude: 'Longitude',
    optional: 'facultatif',
    submitAction: 'Soumettre',
    submitting: 'Envoi...',
    cancel: 'Annuler',
    requiredName: 'Le nom est obligatoire',
    requiredSourceRef: 'Merci de citer votre source',
    submitError: "Echec de l'envoi. Reessayez.",
    moderationNote:
      'Votre proposition et sa source seront verifiees par notre equipe avant publication.',
    independenceNote:
      'Les donnees officielles (Ministere / ONG) sont utilisees uniquement comme source citee. Origin ne cede aucun controle sur le graphe familial.',
  },
  en: {
    title: 'Tourism',
    subtitle: 'Heritage and tourism places to discover',
    empty: 'No places yet',
    emptyHint: 'Historic sites, nature, museums and chefferies will appear here.',
    error: 'Could not load places',
    retry: 'Try again',
    loadMore: 'Show more',
    loadingMore: 'Loading...',
    submit: 'Suggest a place',
    verified: 'Verified',
    sourceLabel: 'Source',
    provenanceHint: 'Data provided as a cited source. Origin stays independent.',
    filterAllRegions: 'All regions',
    filterAllCategories: 'All categories',
    verifiedOnly: 'Verified only',
    readMore: 'Read more',
    viewOnMap: 'View on map',
    // Explorer
    heroTitle: 'On the trail of heritage',
    heroSubtitle:
      'Explore the palaces, museums, natural sites and places of memory of Cameroon. Every place cites its source.',
    tabMap: 'Map',
    tabList: 'List',
    searchPlaceholder: 'Search a place, a region...',
    resultsCount: 'place(s)',
    clearFilters: 'Clear filters',
    noResults: 'No place matches your search',
    noResultsHint: 'Try another region, category or keyword.',
    mapNoGeo: 'No located place for these filters',
    mapNoGeoHint: 'Places without coordinates still appear in the list.',
    mapLegend: 'Legend',
    openPlace: 'Open',
    directions: 'How to get there',
    onMap: 'places on the map',
    // Detail page
    back: 'Back',
    backToList: 'All places',
    detailNotFound: 'Place not found',
    detailNotFoundHint: 'This place may have been removed or never existed.',
    locationLabel: 'Location',
    aboutLabel: 'About',
    affinityTitle: 'Places near your region',
    affinitySubtitle: 'Based on your village of origin',
    nearbyTitle: 'In the same region',
    addedOn: 'Added on',
    coordinatesCopied: 'Coordinates copied',
    // Form
    formTitle: 'Suggest a place',
    formSubtitle:
      'Help document heritage. Cite your source — it will be verified before publishing.',
    fieldName: 'Place name',
    fieldNamePlaceholder: 'E.g. Bafut Palace',
    fieldDescription: 'Description',
    fieldDescriptionPlaceholder: 'Describe this place, its history, why it matters...',
    fieldRegion: 'Region',
    fieldRegionPlaceholder: 'E.g. North-West, West...',
    fieldCategory: 'Category',
    fieldSource: 'Source type',
    fieldSourceRef: 'Source reference',
    fieldSourceRefPlaceholder: 'E.g. Ministry of Tourism URL, NGO name, document...',
    fieldLatitude: 'Latitude',
    fieldLongitude: 'Longitude',
    optional: 'optional',
    submitAction: 'Submit',
    submitting: 'Sending...',
    cancel: 'Cancel',
    requiredName: 'A name is required',
    requiredSourceRef: 'Please cite your source',
    submitError: 'Submission failed. Try again.',
    moderationNote:
      'Your suggestion and its source will be verified by our team before publishing.',
    independenceNote:
      'Official data (Ministry / NGO) is used only as a cited source. Origin cedes no control over the family graph.',
  },
} as const;

export type TourismStringKey = keyof (typeof STRINGS)['fr'];

/** Bilingual labels for each tourism category. */
const CATEGORY_LABELS: Record<'fr' | 'en', Record<TourismCategory, string>> = {
  fr: {
    HERITAGE: 'Patrimoine',
    NATURE: 'Nature',
    CULTURE: 'Culture',
    MUSEUM: 'Musee',
    CHEFFERIE: 'Chefferie',
    RELIGIOUS: 'Religieux',
    OTHER: 'Autre',
  },
  en: {
    HERITAGE: 'Heritage',
    NATURE: 'Nature',
    CULTURE: 'Culture',
    MUSEUM: 'Museum',
    CHEFFERIE: 'Chefferie',
    RELIGIOUS: 'Religious',
    OTHER: 'Other',
  },
};

/** Bilingual labels for each source type (shown verbatim as provenance). */
const SOURCE_LABELS: Record<'fr' | 'en', Record<TourismSource, string>> = {
  fr: {
    MINISTRY: 'Ministere du Tourisme',
    NGO: 'ONG',
    COMMUNITY: 'Communaute',
  },
  en: {
    MINISTRY: 'Ministry of Tourism',
    NGO: 'NGO',
    COMMUNITY: 'Community',
  },
};

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

/** Hook returning a translator scoped to tourism strings, locale-aware. */
export function useTourismT(): (key: TourismStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: TourismStringKey) => dict[key];
}

/** Hook returning a translator for tourism category labels. */
export function useCategoryLabel(): (category: TourismCategory) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = CATEGORY_LABELS[resolveLocale(locale)];
  return (category: TourismCategory) => dict[category];
}

/** Hook returning a translator for source labels (provenance display). */
export function useSourceLabel(): (source: TourismSource) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = SOURCE_LABELS[resolveLocale(locale)];
  return (source: TourismSource) => dict[source];
}

/** Locale string for Intl date formatting. */
export function useTourismLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
