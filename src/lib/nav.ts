/** Single source of truth for navigation, used by header, drawer and footer. */

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  /**
   * Only rendered in the inline header nav from `xl` up, where there is room
   * for it beside the search box. Always present in the drawer and footer.
   */
  wideOnly?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/deals", label: "All deals", description: "Every live offer, newest first" },
  { href: "/categories", label: "Categories", description: "Browse by what you're buying" },
  { href: "/stores", label: "Stores", description: "All merchants A–Z" },
  {
    href: "/deals/ending-soon",
    label: "Ending soon",
    description: "Offers expiring this week",
    wideOnly: true,
  },
];

export const FOOTER_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Discover",
    items: [
      { href: "/deals", label: "All deals" },
      { href: "/deals/ending-soon", label: "Ending soon" },
      { href: "/categories", label: "Categories" },
      { href: "/stores", label: "All stores" },
    ],
  },
  {
    title: "Shortcuts",
    items: [
      { href: "/saved", label: "Saved deals" },
      { href: "/deals?verified=true", label: "Verified only" },
      { href: "/deals?sort=discount", label: "Biggest discounts" },
      { href: "/deals?type=deal", label: "Deals with no code" },
    ],
  },
];
