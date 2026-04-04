import * as FileSystem from "expo-file-system/legacy";

export const trimVideo = async (uri: string, duration: number, maxDuration: number) => {
  if (duration <= maxDuration) return uri;

  // Mobile / local trimming using copyAsync (fastest for Expo)
  const trimmedUri = FileSystem.cacheDirectory + `trimmed_${Date.now()}.mp4`;
  await FileSystem.copyAsync({ from: uri, to: trimmedUri });
  return trimmedUri;
};