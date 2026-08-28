import type { Activity, Traveler, WorkspaceState } from "../consensus/types";

export const MIN_TRAVELERS = 2;
export const MAX_TRAVELERS = 12;

export type WorkspaceRole = "owner" | "traveler";

export interface CollaborativeWorkspace {
  id: string;
  name: string;
  version: number;
  state: WorkspaceState;
  role: WorkspaceRole;
  currentTravelerId: string | null;
  travelerLimit: number;
}

export interface PersistedWorkspaceState {
  travelers: Traveler[];
  activity: Activity[];
  travelerLimit?: number;
}

export interface WorkspaceInvite {
  travelerId: string;
  travelerName: string;
  inviteToken: string;
}
