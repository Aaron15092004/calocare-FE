import React, { useEffect, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

declare global {
    interface Window {
        adsbygoogle: unknown[];
    }
}

interface AdSenseUnitProps {
    /** Your ad slot ID from AdSense dashboard */
    slot: string;
    format?: "auto" | "rectangle" | "horizontal" | "vertical";
    /** Wrapper className for layout control */
    className?: string;
}

/**
 * Renders a Google AdSense ad unit.
 * Only shows to free-tier users — paying users see no ads.
 *
 * Usage:
 *   <AdSenseUnit slot="1234567890" format="auto" />
 */
export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
    slot,
    format = "auto",
    className = "",
}) => {
    const { profile } = useAuthContext();
    const ref = useRef<HTMLModElement>(null);
    const pushed = useRef(false);
    const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;
    const shouldRenderAd = Boolean(publisherId && slot) && (!profile || profile.subscription_tier === "free");

    useEffect(() => {
        if (!shouldRenderAd) return;
        if (pushed.current) return;
        const scriptId = "calovie-adsense-script";
        if (!document.getElementById(scriptId)) {
            const script = document.createElement("script");
            script.id = scriptId;
            script.async = true;
            script.crossOrigin = "anonymous";
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
            document.head.appendChild(script);
        }
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushed.current = true;
        } catch {
            // AdSense script not loaded yet — silently ignore
        }
    }, [publisherId, shouldRenderAd]);

    // Only show to free-tier users, and don't render until env var is set.
    if (!shouldRenderAd) return null;

    return (
        <div className={`adsense-wrapper overflow-hidden ${className}`}>
            <ins
                ref={ref}
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={publisherId}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive="true"
            />
        </div>
    );
};
