export class PhotoError extends Error {}

export function validatePhoto(photo: Blob) {
  if (!photo.size) throw new PhotoError("This photo is empty. Try taking another one.");
  if (photo.size > 20 * 1024 * 1024) throw new PhotoError("Choose a photo smaller than 20 MB.");
}

async function preparePhotoCanvas(photo: Blob) {
  validatePhoto(photo);
  const url = URL.createObjectURL(photo);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new PhotoError("This photo could not be opened. Try a JPEG or PNG.");
    }
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoError("This browser could not prepare the photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function photoToJpeg(photo: Blob) {
  const canvas = await preparePhotoCanvas(photo);
  // Re-encoding omits the camera file's location metadata.
  const data = canvas.toDataURL("image/jpeg", .88).split(",")[1];
  if (!data) throw new PhotoError("This browser could not prepare the photo.");
  return data;
}

export async function photoToJpegBlob(photo: Blob) {
  const canvas = await preparePhotoCanvas(photo);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new PhotoError("This browser could not prepare the photo."));
    }, "image/jpeg", .88);
  });
}
