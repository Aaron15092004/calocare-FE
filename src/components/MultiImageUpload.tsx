import React, { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/utils/cloudinary";
import { useToast } from "@/hooks/use-toast";

interface MultiImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    folder?: string;
    maxImages?: number;
    className?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    value,
    onChange,
    folder = "calocare/uploads",
    maxImages = 5,
    className = "",
}) => {
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFiles = async (files: FileList) => {
        const remaining = maxImages - value.length;
        const toUpload = Array.from(files).slice(0, remaining);
        if (toUpload.length === 0) return;

        setUploading(true);
        try {
            const results = await Promise.all(toUpload.map((f) => uploadFile(f, folder)));
            onChange([...value, ...results.map((r) => r.url)]);
        } catch {
            toast({ title: "Upload lỗi", description: "Không thể upload ảnh, thử lại.", variant: "destructive" });
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const removeImage = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    const canAdd = value.length < maxImages;

    return (
        <div className={`space-y-2 ${className}`}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            <div className="flex flex-wrap gap-2">
                {/* Existing images */}
                {value.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 group">
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3 text-white" />
                        </button>
                        {idx === 0 && (
                            <span className="absolute bottom-1 left-1 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                                Bìa
                            </span>
                        )}
                    </div>
                ))}

                {/* Add button */}
                {canAdd && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                        {uploading ? (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                            <>
                                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">Thêm ảnh</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {value.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                    Ảnh đầu tiên sẽ làm ảnh bìa · Tối đa {maxImages} ảnh
                </p>
            )}
        </div>
    );
};
