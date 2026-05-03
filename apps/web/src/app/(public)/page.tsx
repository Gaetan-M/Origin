import type { Metadata } from 'next';
import { LandingContent } from './_components/landing-content';

const SITE_URL = 'https://my-origin-tree.com';

export const metadata: Metadata = {
  title: 'Arbre généalogique africain en ligne — gratuit | Origin',
  description:
    "Crée ton arbre généalogique africain en ligne gratuitement. Documente ta famille au Cameroun, retrouve tes ancêtres, et préserve ton patrimoine familial. La première plateforme de généalogie pensée pour l'Afrique et la diaspora.",
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/',
      'en-US': '/',
      'x-default': '/',
    },
  },
  openGraph: {
    title: 'Origin — Arbre généalogique africain en ligne',
    description:
      "Documente ton arbre généalogique africain. Retrouve tes ancêtres au Cameroun et dans toute l'Afrique. Gratuit, en français et en anglais.",
    url: SITE_URL,
    images: ['/og-image.png'],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Origin',
  legalName: 'Origin',
  url: SITE_URL,
  logo: `${SITE_URL}/origin-logo.png`,
  description:
    "Plateforme généalogique pensée pour les familles africaines. Documenter, relier et transmettre l'histoire familiale africaine.",
  founder: { '@type': 'Person', name: 'Origin Team' },
  areaServed: [
    { '@type': 'Country', name: 'Cameroun' },
    { '@type': 'Country', name: 'France' },
    { '@type': 'Country', name: 'Belgique' },
    { '@type': 'Country', name: 'Canada' },
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Place', name: 'Africa' },
  ],
  knowsLanguage: ['fr', 'en'],
  sameAs: [],
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Origin',
  url: SITE_URL,
  applicationCategory: 'LifestyleApplication',
  applicationSubCategory: 'Genealogy',
  operatingSystem: 'Any (Web, iOS, Android)',
  inLanguage: ['fr-FR', 'en-US'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'XAF',
    availability: 'https://schema.org/InStock',
  },
  description:
    "Origin permet de créer un arbre généalogique en ligne pour les familles africaines. Documente tes ancêtres, retrouve ta famille au Cameroun et dans la diaspora, et préserve ton patrimoine.",
  audience: {
    '@type': 'Audience',
    name: 'African families and diaspora',
    geographicArea: { '@type': 'Place', name: 'Africa and worldwide diaspora' },
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Origin est-il gratuit ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Oui, Origin est totalement gratuit pour documenter ton arbre généalogique africain, ajouter des membres de famille et collaborer avec tes proches.",
      },
    },
    {
      '@type': 'Question',
      name: "Comment Origin diffère des autres plateformes de généalogie ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Origin est conçu spécifiquement pour les familles africaines. Il prend en compte les noms traditionnels, les unions coutumières, les villages d'origine et la transmission orale — éléments centraux de la généalogie africaine que les plateformes occidentales ignorent.",
      },
    },
    {
      '@type': 'Question',
      name: "Mes données familiales sont-elles privées et sécurisées ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Oui. Tes données restent confidentielles et tu contrôles qui peut voir quoi. L'authentification se fait par code unique envoyé par SMS ou WhatsApp — pas de mot de passe à retenir.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Origin available in English?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Origin is fully bilingual (French and English) and supports African families across the diaspora — Cameroon, France, Belgium, Canada, the United States and beyond.',
      },
    },
    {
      '@type': 'Question',
      name: 'Puis-je inviter ma famille à collaborer sur le même arbre ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Oui. Origin est conçu pour la collaboration familiale. Tu peux inviter tes proches par SMS ou via un code famille, et chacun peut contribuer à enrichir l'arbre généalogique partagé.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LandingContent />
    </>
  );
}
