import { z } from "zod";
import { createInvite } from "@/server/services/workspace-store";

const InviteSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
});

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const parsed = InviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a traveler name and a valid optional email." }, { status: 400 });
  try {
    const { workspaceId } = await params;
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const invite = await createInvite(workspaceId, token, { name: parsed.data.name, email: parsed.data.email || undefined });
    return Response.json(invite, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "TRAVELER_LIMIT" ? 409 : /INVALID_ACCESS|OWNER_REQUIRED/.test(code) ? 403 : 500;
    return Response.json({ error: code === "TRAVELER_LIMIT" ? "This workspace has reached its organizer-set traveler limit." : "We couldn't create the invite." }, { status });
  }
}
