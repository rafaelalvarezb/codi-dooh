/**
 * Reads codec, duration and resolution from an MP4 using mp4box.
 * Isomorphic: runs in the browser on the picked File and on the server on
 * the uploaded blob.
 */
import { createFile, MP4BoxBuffer } from "mp4box";

export type ProbeResult = {
  codec: string;
  durationMs: number;
  width: number;
  height: number;
};

type Mp4File = ReturnType<typeof createFile>;

export function probeMp4(data: ArrayBuffer): ProbeResult | null {
  data = withoutMetadataBoxes(data);
  const file = createFile();
  let ready = false;
  let failed = false;
  file.onReady = () => {
    ready = true;
  };
  file.onError = () => {
    failed = true;
  };
  try {
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(data, 0));
    file.flush();
  } catch {
    return null;
  }
  if (!ready || failed) return null;

  const info = file.getInfo();
  const video = info.videoTracks?.[0];
  if (!video || !info.timescale) return null;
  return {
    codec: video.codec,
    durationMs: durationOf(file),
    width: video.video?.width ?? video.track_width,
    height: video.video?.height ?? video.track_height,
  };
}

const CONTAINER_BOXES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "mvex"]);

/**
 * Editors (Adobe Premiere, Final Cut, phones) add metadata boxes such as
 * `udta` with QuickTime `©TIM` atoms that mp4box rejects, failing the whole
 * file. We never need that metadata, so on a copy we rename `udta`/`meta`
 * boxes inside the movie header to `free`, which every parser skips.
 */
function withoutMetadataBoxes(data: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(data);
  const hits: number[] = [];
  const walk = (start: number, end: number, depth: number) => {
    const dv = new DataView(data);
    let off = start;
    while (off + 8 <= end) {
      let size = dv.getUint32(off);
      const type = String.fromCharCode(u8[off + 4], u8[off + 5], u8[off + 6], u8[off + 7]);
      let header = 8;
      if (size === 1) {
        if (off + 16 > end) return;
        size = Number(dv.getBigUint64(off + 8));
        header = 16;
      } else if (size === 0) {
        size = end - off;
      }
      if (size < header || off + size > end) return;
      if (depth > 0 && (type === "udta" || type === "meta")) hits.push(off + 4);
      else if (CONTAINER_BOXES.has(type) && depth < 6) walk(off + header, off + size, depth + 1);
      off += size;
    }
  };
  walk(0, u8.length, 0);
  if (hits.length === 0) return data;
  const copy = data.slice(0);
  const out = new Uint8Array(copy);
  for (const at of hits) out.set([0x66, 0x72, 0x65, 0x65], at); // "free"
  return copy;
}

/**
 * Duration in ms. Regular MP4s carry it in the movie header; fragmented MP4s
 * (common from some exporters) leave it at 0, so fall back to the video
 * track's samples (parsed from every fragment once the whole file is in),
 * then to the fragment header (mehd).
 */
function durationOf(file: Mp4File): number {
  const info = file.getInfo();
  if (info.duration > 0 && info.timescale) return Math.round((info.duration / info.timescale) * 1000);
  const video = info.videoTracks?.[0];
  if (video && video.samples_duration > 0 && video.timescale) {
    return Math.round((video.samples_duration / video.timescale) * 1000);
  }
  const frag = info.fragment_duration as unknown as { num: number; den: number } | number | undefined;
  if (typeof frag === "object" && frag && frag.den) return Math.round((frag.num / frag.den) * 1000);
  if (typeof frag === "number" && frag > 0) return Math.round((frag / info.timescale) * 1000);
  return 0;
}
