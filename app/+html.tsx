import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        {/* SEO TITLE */}
        <title>
          Nasara Ghana – Buy & Sell Products, Find Local Businesses and Farmers
        </title>

        {/* SEO DESCRIPTION */}
        <meta
          name="description"
          content="Discover Nasara Ghana, a marketplace connecting buyers, sellers, farmers, traders and local businesses. Explore products and services, discover deals, and connect directly with sellers."
        />

        {/* CANONICAL URL */}
        <link
          rel="canonical"
          href="https://nasara1.vercel.app/"
        />

        {/* SEARCH ENGINE INDEXING */}
        <meta name="robots" content="index, follow" />

        {/* APPLE MOBILE SETTINGS */}
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-title"
          content="Nasara"
        />

        {/* SOCIAL SHARING METADATA */}
        <meta
          property="og:title"
          content="Nasara Ghana – Buy & Sell Products"
        />

        <meta
          property="og:description"
          content="Discover products, farmers, traders, local businesses and services across Ghana with Nasara."
        />

        <meta
          property="og:url"
          content="https://nasara1.vercel.app/"
        />

        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:site_name"
          content="Nasara Ghana"
        />

        {/* APP ICONS */}
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
        />

        <link
          rel="icon"
          type="image/png"
          href="/favicon.png"
        />

        <ScrollViewStyleReset />
      </head>

      <body>{children}</body>
    </html>
  );
}