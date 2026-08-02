import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const siteName = 'Ruckus';
const description =
  'Ruckus is a campus event platform. Discover what is happening on your campus, RSVP before events fill, and check in when you arrive.';
const productionOrigin = 'https://ruckus-iota.vercel.app';
const socialCard = `${productionOrigin}/social-card.png`;

/**
 * The HTML shell for every web route. Expo Router serves a single-page bundle,
 * so this document is what search engines and social scrapers see. Route-level
 * titles are set by each screen once the app has hydrated.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Ruckus — your campus, happening now</title>
        <meta name="description" content={description} />
        <meta name="application-name" content={siteName} />
        <link rel="canonical" href={productionOrigin} />

        {/* Dark and light are both first-class; the app follows the system setting. */}
        <meta name="color-scheme" content="dark light" />
        <meta
          name="theme-color"
          content="#F7F7F4"
          media="(prefers-color-scheme: light)"
        />
        <meta name="theme-color" content="#0F1113" media="(prefers-color-scheme: dark)" />

        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content="Ruckus — your campus, happening now" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={productionOrigin} />
        <meta property="og:image" content={socialCard} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ruckus — your campus, happening now" />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={socialCard} />

        {/* Expo's recommended reset so <ScrollView> scrolls rather than the body. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
