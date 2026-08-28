import { env } from "cloudflare:workers";
import { workspaceSchemaStatements } from "../../../db/schema";
import { buildWorkspaceState, detectConflicts, generateScenarios } from "../../features/consensus/scoring";
import type { Activity, Traveler, WorkspaceState } from "../../features/consensus/types";
import type { CollaborativeWorkspace, PersistedWorkspaceState, WorkspaceInvite, WorkspaceRole } from "../../features/collaboration/types";
import { MAX_TRAVELERS } from "../../features/collaboration/types";

interface WorkspaceRow {
  id: string;
  name: string;
  destination: string;
  nights: number;
  state_json: string;
  owner_token_hash: string;
  version: number;
}

interface MemberRow {
  traveler_id: string;
  token_hash: string;
}

function database(): D1Database {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error("Workspace database is unavailable");
  return db;
}

let schemaReady: Promise<void> | null = null;
async function ensureSchema() {
  if (!schemaReady) {
    const db = database();
    schemaReady = db.batch(workspaceSchemaStatements.map((statement) => db.prepare(statement))).then(() => undefined);
  }
  await schemaReady;
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function parsePersistedState(row: WorkspaceRow): PersistedWorkspaceState {
  return JSON.parse(row.state_json) as PersistedWorkspaceState;
}

function travelerLimit(row: WorkspaceRow) {
  const limit = parsePersistedState(row).travelerLimit;
  return typeof limit === "number" && limit >= 2 && limit <= MAX_TRAVELERS ? limit : MAX_TRAVELERS;
}

function persistedState(state: WorkspaceState, limit = MAX_TRAVELERS): PersistedWorkspaceState {
  return { travelers: state.travelers, activity: state.activity, travelerLimit: limit };
}

function hydrateState(row: WorkspaceRow): WorkspaceState {
  const base = buildWorkspaceState();
  const stored = parsePersistedState(row);
  const travelers = Array.isArray(stored.travelers) ? stored.travelers : [];
  return {
    ...base,
    destination: row.destination,
    nights: row.nights,
    travelers,
    activity: Array.isArray(stored.activity) ? stored.activity : [],
    conflicts: detectConflicts(travelers),
    scenarios: generateScenarios(base.hotels, travelers),
  };
}

async function authorize(row: WorkspaceRow, token: string): Promise<{ role: WorkspaceRole; travelerId: string | null }> {
  const tokenHash = await hashToken(token);
  if (tokenHash === row.owner_token_hash) return { role: "owner", travelerId: null };
  const member = await database()
    .prepare("SELECT traveler_id, token_hash FROM workspace_members WHERE workspace_id = ? AND token_hash = ? LIMIT 1")
    .bind(row.id, tokenHash)
    .first<MemberRow>();
  if (!member) throw new Error("INVALID_ACCESS");
  return { role: "traveler", travelerId: member.traveler_id };
}

async function workspaceRow(id: string) {
  await ensureSchema();
  const row = await database()
    .prepare("SELECT id, name, destination, nights, state_json, owner_token_hash, version FROM workspaces WHERE id = ? LIMIT 1")
    .bind(id)
    .first<WorkspaceRow>();
  if (!row) throw new Error("WORKSPACE_NOT_FOUND");
  return row;
}

export async function createWorkspace(input: {
  name: string;
  destination: string;
  nights: number;
  organizerName: string;
  travelerLimit: number;
}): Promise<{ workspace: CollaborativeWorkspace; ownerToken: string }> {
  await ensureSchema();
  const db = database();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const ownerToken = createToken();
  const traveler: Traveler = {
    id: `t-${crypto.randomUUID()}`,
    name: input.organizerName,
    avatarHue: 160,
    budgetPerNight: 180,
    constraints: [],
  };
  const base = buildWorkspaceState();
  const state: WorkspaceState = {
    ...base,
    destination: input.destination,
    nights: input.nights,
    travelers: [traveler],
    activity: [{ id: `act-${crypto.randomUUID()}`, actorId: traveler.id, kind: "join", detail: `${traveler.name} created the workspace`, at: now }],
    conflicts: [],
    scenarios: generateScenarios(base.hotels, [traveler]),
  };
  await db.prepare(
    "INSERT INTO workspaces (id, name, destination, nights, state_json, owner_token_hash, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)"
  ).bind(id, input.name, input.destination, input.nights, JSON.stringify(persistedState(state, input.travelerLimit)), await hashToken(ownerToken), now, now).run();
  return {
    ownerToken,
    workspace: { id, name: input.name, version: 1, state, role: "owner", currentTravelerId: traveler.id, travelerLimit: input.travelerLimit },
  };
}

export async function readWorkspace(id: string, token: string): Promise<CollaborativeWorkspace> {
  const row = await workspaceRow(id);
  const access = await authorize(row, token);
  return { id: row.id, name: row.name, version: row.version, state: hydrateState(row), role: access.role, currentTravelerId: access.travelerId, travelerLimit: travelerLimit(row) };
}

export async function saveWorkspace(id: string, token: string, input: {
  destination: string;
  nights: number;
  travelers: Traveler[];
  activity: Activity[];
  travelerLimit: number;
}, expectedVersion: number) {
  const row = await workspaceRow(id);
  const access = await authorize(row, token);
  if (access.role !== "owner") throw new Error("OWNER_REQUIRED");
  if (input.travelers.length < 1 || input.travelers.length > MAX_TRAVELERS) throw new Error("TRAVELER_LIMIT");
  if (input.travelerLimit < input.travelers.length) throw new Error("LIMIT_BELOW_MEMBERS");
  const now = new Date().toISOString();
  const nextVersion = row.version + 1;
  const result = await database().prepare(
    "UPDATE workspaces SET destination = ?, nights = ?, state_json = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?"
  ).bind(input.destination, input.nights, JSON.stringify({ travelers: input.travelers, activity: input.activity.slice(0, 30), travelerLimit: input.travelerLimit }), nextVersion, now, id, expectedVersion).run();
  if (!result.meta.changes) throw new Error("VERSION_CONFLICT");
  return { success: true, version: nextVersion };
}

export async function saveOwnTraveler(id: string, token: string, traveler: Traveler) {
  const row = await workspaceRow(id);
  const access = await authorize(row, token);
  if (access.role !== "traveler" || access.travelerId !== traveler.id) throw new Error("TRAVELER_SCOPE_REQUIRED");
  const state = hydrateState(row);
  const exists = state.travelers.some((item) => item.id === traveler.id);
  if (!exists) throw new Error("TRAVELER_NOT_FOUND");
  const travelers = state.travelers.map((item) => item.id === traveler.id ? traveler : item);
  const now = new Date().toISOString();
  await database().batch([
    database().prepare("UPDATE workspaces SET state_json = ?, version = version + 1, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify({ travelers, activity: state.activity.slice(0, 30), travelerLimit: travelerLimit(row) }), now, id),
    database().prepare("UPDATE workspace_members SET status = 'active', name = ?, updated_at = ? WHERE workspace_id = ? AND traveler_id = ?")
      .bind(traveler.name, now, id, traveler.id),
  ]);
  return { success: true, version: row.version + 1 };
}

export async function createInvite(id: string, token: string, input: { name: string; email?: string }): Promise<WorkspaceInvite> {
  const row = await workspaceRow(id);
  const access = await authorize(row, token);
  if (access.role !== "owner") throw new Error("OWNER_REQUIRED");
  const state = hydrateState(row);
  const limit = travelerLimit(row);
  if (state.travelers.length >= limit) throw new Error("TRAVELER_LIMIT");
  const inviteToken = createToken();
  const traveler: Traveler = {
    id: `t-${crypto.randomUUID()}`,
    name: input.name,
    avatarHue: (state.travelers.length * 73 + 40) % 360,
    budgetPerNight: 180,
    constraints: [],
  };
  const travelers = [...state.travelers, traveler];
  const now = new Date().toISOString();
  const activity: Activity[] = [
    { id: `act-${crypto.randomUUID()}`, actorId: "owner", kind: "join", detail: `${traveler.name} was invited`, at: now },
    ...state.activity,
  ].slice(0, 30);
  await database().batch([
    database().prepare(
      "INSERT INTO workspace_members (id, workspace_id, traveler_id, name, email, token_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'traveler', 'invited', ?, ?)"
    ).bind(crypto.randomUUID(), id, traveler.id, traveler.name, input.email ?? null, await hashToken(inviteToken), now, now),
    database().prepare("UPDATE workspaces SET state_json = ?, version = version + 1, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify({ travelers, activity, travelerLimit: limit }), now, id),
  ]);
  return { travelerId: traveler.id, travelerName: traveler.name, inviteToken };
}
