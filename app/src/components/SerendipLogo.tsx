"use client";

import React from "react";
import Image from "next/image";

interface SerendipLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    showText?: boolean;
    className?: string;
}

const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 160, height: 53 },
    lg: { width: 220, height: 73 },
    xl: { width: 320, height: 106 },
};

export default function SerendipLogo({ size = "md", showText = true, className = "" }: SerendipLogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Image
                src="/logo-v2.png"
                alt="Serendip.IA Logo"
                width={s.width}
                height={s.height}
                className="object-contain"
                priority
            />
        </div>
    );
}
