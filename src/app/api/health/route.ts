import { inventoryProviderStatus } from "@/server/services/inventory-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const inventory = inventoryProviderStatus();

  return Response.json(
    {
      status: "ok",
      service: "commonground-travel",
      version: process.env.COMMONGROUND_RELEASE ?? "1.0.0",
      inventory: { provider: inventory.id, providerName: inventory.name, mode: inventory.live ? "live" : "demo", configured: inventory.configured },
      webmcp: {
        toolCount: 27,
        humanApprovalRequired: true,
        autonomousPurchase: false,
        originTrialConfigured: Boolean(process.env.WEBMCP_ORIGIN_TRIAL_TOKEN),
      },
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    }
  );
}
