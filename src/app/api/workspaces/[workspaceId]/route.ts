import { z } from "zod";
import { readWorkspace, saveOwnTraveler, saveWorkspace } from "@/server/services/workspace-store";

const PrioritySchema = z.enum(["must", "prefer", "flexible", "exclude"]);
const ConstraintSchema = z.object({
  id: z.string().min(1).max(100), label: z.string().min(1).max(120),
  category: z.enum(["accessibility", "family", "amenity", "location", "budget", "cancellation", "rating"]),
  priority: PrioritySchema, weight: z.number().positive().max(20), locked: z.boolean(),
});
const TravelerSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().trim().min(1).max(60),
  avatarHue: z.number().min(0).max(360), budgetPerNight: z.number().min(20).max(5000),
  constraints: z.array(ConstraintSchema).max(20),
});
const ActivitySchema = z.object({
  id: z.string(), actorId: z.string(),
  kind: z.enum(["join", "constraint-add", "constraint-update", "scenario-view", "approve"]),
  detail: z.string().max(300), at: z.string(),
});
const OwnerUpdateSchema = z.object({
  version: z.number().int().positive(),
  state: z.object({
    destination: z.string().trim().min(2).max(120), nights: z.number().int().min(1).max(30), checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelerLimit: z.number().int().min(2).max(30),
    travelers: z.array(TravelerSchema).min(1).max(30), activity: z.array(ActivitySchema).max(30),
  }),
});
const TravelerUpdateSchema = z.object({ traveler: TravelerSchema });

function bearer(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "WORKSPACE_NOT_FOUND") return Response.json({ error: "Workspace not found." }, { status: 404 });
  if (/INVALID_ACCESS|OWNER_REQUIRED|TRAVELER_SCOPE_REQUIRED/.test(code)) return Response.json({ error: "This invite does not grant access to that action." }, { status: 403 });
  if (code === "TRAVELER_LIMIT") return Response.json({ error: "A workspace supports up to 30 travelers." }, { status: 409 });
  if (code === "LIMIT_BELOW_MEMBERS") return Response.json({ error: "The group size cannot be lower than the current traveler count." }, { status: 409 });
  if (code === "VERSION_CONFLICT") return Response.json({ error: "This workspace changed elsewhere. Refresh and try again." }, { status: 409 });
  return Response.json({ error: "Workspace service unavailable." }, { status: 500 });
}

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    return Response.json(await readWorkspace(workspaceId, bearer(request)), { headers: { "cache-control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    const body = await request.json().catch(() => null);
    const owner = OwnerUpdateSchema.safeParse(body);
    if (owner.success) return Response.json(await saveWorkspace(workspaceId, bearer(request), owner.data.state, owner.data.version));
    const traveler = TravelerUpdateSchema.safeParse(body);
    if (traveler.success) return Response.json(await saveOwnTraveler(workspaceId, bearer(request), traveler.data.traveler));
    return Response.json({ error: "Invalid workspace update." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
