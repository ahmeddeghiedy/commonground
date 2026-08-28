import Workspace from "@/features/consensus/components/workspace";

export default async function SharedWorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <Workspace workspaceId={workspaceId} />;
}
