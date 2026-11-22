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

export function probeMp4(data: ArrayBuffer): ProbeResult | null {
  const file = createFile();
  let result: ProbeResult | null = null;
  file.onReady = (info) => {
    const video = info.videoTracks?.[0];
    if (!video || !info.timescale) return;
    const durationMs = Math.round((info.duration / info.timescale) * 1000);
    result = {
      codec: video.codec,
      durationMs,
      width: video.video?.width ?? video.track_width,
      height: video.video?.height ?? video.track_height,
    };
  };
  file.onError = () => {
    result = null;
  };
  try {
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(data, 0));
    file.flush();
  } catch {
    return null;
  }
  return result;
}
