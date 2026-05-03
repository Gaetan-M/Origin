import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Origin — Arbre généalogique africain',
    short_name: 'Origin',
    description:
      "Documente ton arbre généalogique, retrouve tes ancêtres et préserve l'histoire de ta famille africaine.",
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#2C5F4D',
    orientation: 'portrait',
    categories: ['lifestyle', 'social', 'utilities'],
    lang: 'fr-FR',
    icons: [
      {
        src: '/origin-logo.png',
        sizes: '320x500',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
