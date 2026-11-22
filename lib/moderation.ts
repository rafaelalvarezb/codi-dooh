/**
 * Moderation hook. v1 auto-approves on publish (the admin can pause or reject
 * afterwards). Swap this for a review queue or an automated classifier later
 * without touching the upload flow.
 */
export type ModerationDecision = { status: "active" | "paused" | "rejected"; note?: string };

export async function moderateCreative(_input: {
  orgId: string;
  label: string;
  blobUrl: string;
}): Promise<ModerationDecision> {
  void _input;
  return { status: "active" };
}
