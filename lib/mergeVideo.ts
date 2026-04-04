export async function mergeVideoWithAudio(
  videoUri: string,
  audioUri: string
) {
  console.log("FFmpeg removed - skipping merge");
  return videoUri;
}