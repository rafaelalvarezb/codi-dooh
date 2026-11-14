/**
 * Local DOOH creatives for the kiosk demo.
 * Drop MP4 files in /public/ads and list them here.
 *
 * Recommendation for bathroom tablet MVP:
 * - 2–3 spots of ~6 seconds each (muted, looped)
 * - Landscape 16:9 preferred; 9:16 also works on tablet if letterboxed
 * - Keep under 8 MB each for snappy local load
 */
export type AdCreative = {
  id: string;
  src: string;
  /** Optional poster frame while buffering */
  poster?: string;
  durationHintSec: 6 | 15;
};

export const AD_PLAYLIST: AdCreative[] = [
  {
    id: "spot-a",
    src: "/ads/spot-01.mp4",
    durationHintSec: 6,
  },
  {
    id: "spot-b",
    src: "/ads/spot-02.mp4",
    durationHintSec: 6,
  },
  {
    id: "spot-c",
    src: "/ads/spot-03.mp4",
    durationHintSec: 15,
  },
];
