import { env } from "./env";

/**
 * Structured data helpers.
 *
 * The JSON is embedded in a <script> tag, so `<` is escaped to \u003c — without
 * that, any title containing "</script>" could break out of the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: env.siteName,
    url: env.siteUrl,
    description:
      "Verified coupon codes and deals from the stores you already shop at.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${env.siteUrl}/deals?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: env.siteName,
    url: env.siteUrl,
    description:
      "COUPON BRAIN is a coupon discovery platform that checks offer expiry server-side and flags verified deals.",
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

type OfferInput = {
  name: string;
  description: string;
  url: string;
  merchantName: string;
  code: string | null;
  expiresAt: string | null;
};

/**
 * Offer + AggregateOffer shaped data for a coupon. Search engines use this to
 * understand what the deal actually is.
 */
export function offerJsonLd(offer: OfferInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.name,
    description: offer.description,
    url: offer.url,
    category: "promotional offer",
    ...(offer.expiresAt ? { priceValidUntil: offer.expiresAt } : {}),
    ...(offer.code ? { couponCode: offer.code } : {}),
    seller: {
      "@type": "Organization",
      name: offer.merchantName,
    },
  };
}

export function itemListJsonLd(items: { name: string; url: string }[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
