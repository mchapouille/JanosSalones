"use client";

import React from "react";
import Image from "next/image";

interface JanosLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

const sizes = {
    sm: { width: 120, height: 80 },
    md: { width: 160, height: 106 },
    lg: { width: 220, height: 146 },
    xl: { width: 320, height: 212 },
};

export default function JanosLogo({ size = "md", className = "" }: JanosLogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Image
                src="/janos-logo.png"
                alt="Jano's Eventos Logo"
                width={s.width}
                height={s.height}
                className="object-contain invert brightness-200"
                priority
            />
        </div>
    );
}
