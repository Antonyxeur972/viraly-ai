import type { ImagePickerAsset } from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export async function normalizeImageForVision(asset: ImagePickerAsset, name: string) {
  const actions = asset.width && asset.width > 1800
    ? [{ resize: { width: 1800 } }]
    : [];
  const result = await manipulateAsync(asset.uri, actions, {
    compress: 0.86,
    format: SaveFormat.JPEG
  });

  return {
    uri: result.uri,
    name: `${name}.jpg`,
    type: "image/jpeg"
  };
}

export async function createHistoryThumbnail(asset: ImagePickerAsset, name: string) {
  const result = await manipulateAsync(asset.uri, [{ resize: { width: 420 } }], {
    compress: 0.56,
    format: SaveFormat.JPEG
  });

  return {
    uri: result.uri,
    name: `${name}-preview.jpg`,
    type: "image/jpeg"
  };
}
