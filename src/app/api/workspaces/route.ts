import { z } from "zod";
import { createWorkspace } from "@/server/services/workspace-store";

const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  destination: z.string().trim().min(2).max(120),
  nights: z.number().int().min(1).max(30),
  organizerName: z.string().trim().min(1).max(60),
});

export async function POST(request: Request) {
  const parsed = CreateWorkspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please complete every trip field.", issues: parsed.error.flatten() }, { status: 400 });
  try {
    return Response.json(await createWorkspace(parsed.data), { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We couldn't create the workspace. Please try again." }, { status: 500 });
  }
}
