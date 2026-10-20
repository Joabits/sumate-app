export type NavigationItem = {
  id: "explore" | "my-activities" | "recently";
  label: string;
  href: string;
  iconUrl: string;
  enabled: boolean;
};

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: "explore",
    label: "Explorar",
    href: "/explore",
    iconUrl: "/assets/icons/explore.webp",
    enabled: true,
  },
  {
    id: "my-activities",
    label: "Mis actividades",
    href: "/my-activities",
    iconUrl: "/assets/icons/my_activities.webp",
    enabled: true,
  },
  {
    id: "recently",
    label: "Mi trayectoria",
    href: "/recently",
    iconUrl: "/assets/icons/recently.webp",
    enabled: true,
  },
] as const;
