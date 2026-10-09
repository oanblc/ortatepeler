// Telefon fotoğrafları (5-10 MB) Server Action gövde sınırını kolayca aşar.
// Yüklemeden önce tarayıcıda en uzun kenarı `maksKenar` px olacak şekilde
// küçültüp JPEG'e çevirir. Küçültülemeyen (HEIC vb.) ya da zaten küçük
// dosyalar olduğu gibi döner — hiçbir koşulda fotoğrafı kaybettirmez.
export async function gorselKucult(dosya: File, maksKenar = 1600, kalite = 0.8): Promise<File> {
  if (!dosya.type.startsWith("image/") || dosya.type === "image/gif" || dosya.size < 400 * 1024) return dosya;
  try {
    const bitmap = await createImageBitmap(dosya, { imageOrientation: "from-image" });
    const oran = Math.min(1, maksKenar / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * oran);
    const h = Math.round(bitmap.height * oran);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dosya;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", kalite));
    if (!blob || blob.size >= dosya.size) return dosya;
    return new File([blob], dosya.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: dosya.lastModified });
  } catch {
    return dosya;
  }
}
