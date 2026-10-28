/**
 * src/features/activities/domain/entities/activity.entity.ts
 *
 * Entidades y tipos de dominio para el módulo de actividades.
 * TypeScript puro sin dependencias de infraestructura ni frameworks.
 */

export type ActivityStatus = "draft" | "active" | "closed";

export type Cause = {
  id: string;
  name: string;
  slug: string;
};

export type Activity = {
  id: string;
  name: string;
  ownerId: string;
  imageUrl: string;
  date: string; // Formato ISO 8601 string
  capacity: number;
  status: ActivityStatus;
  creatorName?: string;
  creatorImage?: string;
};

export type ActivityListItem = Pick<
  Activity,
  | "id"
  | "name"
  | "imageUrl"
  | "date"
  | "ownerId"
  | "capacity"
  | "status"
  | "creatorName"
  | "creatorImage"
> & {
  causes?: Cause[];
  registeredCount?: number;
};

export type MyActivityListItem = ActivityListItem & {
  registeredCount: number;
};

export type ActivityDetail = {
  id: string;
  activityId: string;
  latitude: number | null;
  longitude: number | null;
  place: string | null;
  address: string | null;
  description: string | null;
};

export type ActivityParticipant = {
  id: string;
  name: string;
  image: string | null;
};

export type ActivityDetailData = Activity & {
  isOwner: boolean;
  isParticipating?: boolean;
  participants: ActivityParticipant[];
  detail: ActivityDetail | null;
  causes: Cause[];
};

export type ActivityScope = "mine" | "others";

export type TimeOfDayFilter =
  | "any"
  | "early_morning"
  | "morning"
  | "afternoon"
  | "night";

export type DatePresetFilter =
  | "upcoming"
  | "starting_soon"
  | "today"
  | "tomorrow"
  | "this_weekend"
  | "next_week"
  | "next_weekend";

export type CapacityRangeFilter =
  | "any"
  | "1-9"
  | "10-20"
  | "gt-20";

export interface SearchFilterState {
  timeOfDay: TimeOfDayFilter;
  datePreset: DatePresetFilter;
  capacityRange: CapacityRangeFilter;
  causeIds: string[];
  distanceKm: number;
}

export interface ActivitySearchParams {
  q?: string;
  timeOfDay?: TimeOfDayFilter;
  datePreset?: DatePresetFilter;
  capacityRange?: CapacityRangeFilter;
  causeIds?: string[];
  userLat?: number;
  userLon?: number;
  maxDistanceKm?: number;
}

