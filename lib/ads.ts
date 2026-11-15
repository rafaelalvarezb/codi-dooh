/**
 * Local DOOH creatives for the kiosk demo.
 * Files live in /public/ads (kept local — not committed; often copyrighted demo assets).
 */
export type AdCreative = {
  id: string;
  src: string;
  label: string;
  durationHintSec: 6 | 15;
};

export const AD_PLAYLIST: AdCreative[] = [
  { id: "spot-01", src: "/ads/spot-01.mp4", label: "Detox", durationHintSec: 6 },
  { id: "spot-02", src: "/ads/spot-02.mp4", label: "Gatos", durationHintSec: 6 },
  { id: "spot-03", src: "/ads/spot-03.mp4", label: "Perros", durationHintSec: 6 },
  { id: "spot-04", src: "/ads/spot-04.mp4", label: "Deadpool", durationHintSec: 6 },
  { id: "spot-05", src: "/ads/spot-05.mp4", label: "Garnier", durationHintSec: 6 },
  { id: "spot-06", src: "/ads/spot-06.mp4", label: "Hidden Figures", durationHintSec: 6 },
  { id: "spot-07", src: "/ads/spot-07.mp4", label: "Starbucks", durationHintSec: 6 },
  { id: "spot-08", src: "/ads/spot-08.mp4", label: "Renault", durationHintSec: 6 },
  { id: "spot-09", src: "/ads/spot-09.mp4", label: "Playmobil", durationHintSec: 6 },
  { id: "spot-10", src: "/ads/spot-10.mp4", label: "Porsche Playmobil", durationHintSec: 6 },
  { id: "spot-11", src: "/ads/spot-11.mp4", label: "Extra", durationHintSec: 6 },
];
