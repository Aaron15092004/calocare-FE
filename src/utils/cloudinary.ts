const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface UploadResult {
    url: string;
    publicId: string;
}

// Upload từ base64
export const uploadBase64 = async (
    base64: string,
    folder: string = "calocare",
): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", base64);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
    };
};

// Upload từ File object
export const uploadFile = async (
    file: File,
    folder: string = "calocare",
): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
    };
};

// Generate optimized URL (resize, format)
export const getOptimizedUrl = (
    url: string,
    width: number = 400,
    quality: string = "auto",
): string => {
    if (!url || !url.includes("cloudinary.com")) return url;
    // Insert transformation before /upload/
    return url.replace("/upload/", `/upload/w_${width},q_${quality},f_auto/`);
};
