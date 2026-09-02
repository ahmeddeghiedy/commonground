import type { Activity, Traveler, WorkspaceState } from "../consensus/types";

export const MIN_TRAVELERS = 2;
export const MAX_TRAVELERS = 30;

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
  checkIn?: string;
}

export interface WorkspaceInvite {
  travelerId: string;
  travelerName: string;
  inviteToken: string;
}

export interface WorkspaceInviteStatus {
  travelerId: string;
  travelerName: string;
  email: string | null;
  status: "invited" | "active";
  createdAt: string;
  updatedAt: string;
}
