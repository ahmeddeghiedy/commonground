import { z } from "zod";
import { createInvite, listInvites, revokeInvite } from "@/server/services/workspace-store";

const InviteSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
});
const RevokeSchema = z.object({ travelerId: z.string().min(1).max(100) });

function bearer(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function inviteError(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const status = code === "TRAVELER_LIMIT" ? 409 : code === "TRAVELER_NOT_FOUND" ? 404 : /INVALID_ACCESS|OWNER_REQUIRED/.test(code) ? 403 : 500;
  return Response.json({ error: code === "TRAVELER_LIMIT" ? "This workspace has reached its organizer-set traveler limit." : code === "TRAVELER_NOT_FOUND" ? "Traveler invitation not found." : "Invitation operation failed." }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    return Response.json({ invitations: await listInvites(workspaceId, bearer(request)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return inviteError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const parsed = InviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a traveler name and a valid optional email." }, { status: 400 });
  try {
    const { workspaceId } = await params;
    const invite = await createInvite(workspaceId, bearer(request), { name: parsed.data.name, email: parsed.data.email || undefined });
    return Response.json(invite, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return inviteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const parsed = RevokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid travelerId is required." }, { status: 400 });
  try {
    const { workspaceId } = await params;
    return Response.json(await revokeInvite(workspaceId, bearer(request), parsed.data.travelerId), { headers: { "cache-control": "no-store" } });
  } catch (error) { return inviteError(error); }
}
