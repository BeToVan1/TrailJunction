export class PhotoError extends Error {}

export function validatePhoto(photo: Blob) {
  if (!photo.size) throw new PhotoError("This photo is empty. Try taking another one.");
  if (photo.size > 20 * 1024 * 1024) throw new PhotoError("Choose a photo smaller than 20 MB.");
}

export async function photoToJpeg(photo: Blob) {
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
    // Re-encoding sends the picture without the camera file's location metadata.
    const data = canvas.toDataURL("image/jpeg", .88).split(",")[1];
    if (!data) throw new PhotoError("This browser could not prepare the photo.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
