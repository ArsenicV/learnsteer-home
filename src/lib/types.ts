export type StageStatus = 'Completed' | 'In progress' | 'Planned';

export interface RoadmapStage {
  id: string;
  title: string;
  status: StageStatus;
  date_label: string;
  description: string;
  sort_order: number;
}

export interface Contributor {
  id: string;
  name: string;
  role: string;
  team: string;
  image_path: string | null;
  link: string | null;
  sort_order: number;
}

export interface JoinSubmission {
  name: string;
  email: string;
  role: string;
  why: string;
}

export interface SiteContent {
  [key: string]: any;
}
