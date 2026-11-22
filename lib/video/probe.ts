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
