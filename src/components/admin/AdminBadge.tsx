import React from "react";

interface AdminBadgeProps {
    count: number;
    max?: number;
    className?: string;
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({ count, max = 99, className = "" }) => {
    if (!count || count <= 0) return null;
    const label = count > max ? `${max}+` : String(count);
    return (
        <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none shrink-0 ${className}`}
        >
            {label}
        </span>
    );
};
