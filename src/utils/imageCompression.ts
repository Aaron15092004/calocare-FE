// src/utils/imageCompression.ts
// Downscales an image to `maxDim` on its longest edge and re-encodes as JPEG
// before upload, so scans don't ship multi-MB originals to the backend.

interface DecodedImage {
    image: CanvasImageSource;
    width: number;
    height: number;
    close: () => void;
}

/**
 * Decode via createImageBitmap when available — `imageOrientation:
 * "from-image"` bakes EXIF rotation into the pixels — falling back to a
 * plain <img> element for older browsers / undecodable-by-bitmap inputs.
 */
async function decodeImage(file: Blob): Promise<DecodedImage> {
    if (typeof createImageBitmap === "function") {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            return {
                image: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                close: () => bitmap.close(),
            };
        } catch {
            // fall through to <img> decoding
        }
    }

    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Could not read image"));
            el.src = url;
        });
        return {
            image: img,
            width: img.naturalWidth,
            height: img.naturalHeight,
            close: () => URL.revokeObjectURL(url),
        };
    } catch (err) {
        URL.revokeObjectURL(url);
        throw err;
    }
}

/**
 * Compress an image file for upload: longest edge capped at `maxDim` px
 * (aspect ratio preserved, never upscaled) and JPEG-encoded at `quality`.
 * Throws if the input can't be decoded — callers should fall back to the
 * original file in that case.
 */
export async function compressImage(file: File, maxDim = 1024, quality = 0.7): Promise<Blob> {
    const source = await decodeImage(file);
    try {
        const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
        const width = Math.max(1, Math.round(source.width * scale));
        const height = Math.max(1, Math.round(source.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(source.image, 0, 0, width, height);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
                "image/jpeg",
                quality,
            );
        });
    } finally {
        source.close();
    }
}
