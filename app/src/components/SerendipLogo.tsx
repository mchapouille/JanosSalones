"use client";

import React from "react";

interface SerendipLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    showText?: boolean;
    className?: string;
}

const sizes = {
    sm: { icon: 32, font: "text-lg" },
    md: { icon: 48, font: "text-2xl" },
    lg: { icon: 72, font: "text-4xl" },
    xl: { icon: 120, font: "text-5xl" },
};

export default function SerendipLogo({ size = "md", showText = true, className = "" }: SerendipLogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg
                width={s.icon}
                height={s.icon}
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <defs>
                    <linearGradient id="serendipGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="50%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <clipPath id="circleClip">
                        <circle cx="100" cy="100" r="90" />
                    </clipPath>
                </defs>

                {/* Background circle with gradient */}
                <circle cx="100" cy="100" r="90" fill="url(#serendipGrad)" opacity="0.15" />
                <circle cx="100" cy="100" r="90" stroke="url(#serendipGrad)" strokeWidth="2" fill="none" opacity="0.3" />

                {/* Bird body - stylized dove made of circuit traces */}
                <g clipPath="url(#circleClip)">
                    {/* Main body path */}
                    <path
                        d="M40 140 L60 130 L75 120 L90 108 L110 100 L130 96 L150 98 L160 104 L155 108 L140 106 L120 108 L105 115 L90 125 L70 138 Z"
                        stroke="url(#serendipGrad)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Wing upper */}
                    <path
                        d="M85 112 L78 95 L72 78 L68 62 L70 50 L78 42 L88 38 L100 40 L110 48 L118 58 L122 70 L120 82 L114 92 L105 100"
                        stroke="url(#serendipGrad)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Wing feather lines (circuit traces) */}
                    <path d="M78 42 L95 55 L108 70" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" opacity="0.7" />
                    <path d="M70 50 L88 60 L102 75" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" opacity="0.7" />
                    <path d="M68 62 L85 72 L98 85" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" opacity="0.7" />
                    <path d="M72 78 L88 85 L100 95" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" opacity="0.7" />

                    {/* Circuit nodes on wing */}
                    <circle cx="78" cy="42" r="3" fill="url(#serendipGrad)" />
                    <circle cx="70" cy="50" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="68" cy="62" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="72" cy="78" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="88" cy="38" r="3" fill="url(#serendipGrad)" />
                    <circle cx="110" cy="48" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="122" cy="70" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="100" cy="40" r="2" fill="url(#serendipGrad)" />

                    {/* Circuit nodes on body */}
                    <circle cx="90" cy="108" r="3" fill="url(#serendipGrad)" />
                    <circle cx="110" cy="100" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="130" cy="96" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="150" cy="98" r="2.5" fill="url(#serendipGrad)" />

                    {/* Head */}
                    <circle cx="160" cy="104" r="4" fill="url(#serendipGrad)" />
                    {/* Eye */}
                    <circle cx="162" cy="102" r="1.5" fill="white" />

                    {/* Beak */}
                    <path d="M164 104 L175 100 L165 106" fill="url(#serendipGrad)" />

                    {/* Tail circuit traces */}
                    <path d="M40 140 L30 148 L20 158" stroke="url(#serendipGrad)" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M40 140 L28 150 L18 164" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
                    <path d="M40 140 L32 155 L28 170" stroke="url(#serendipGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />

                    {/* Tail circuit nodes */}
                    <circle cx="20" cy="158" r="2.5" fill="url(#serendipGrad)" />
                    <circle cx="18" cy="164" r="2" fill="url(#serendipGrad)" opacity="0.7" />
                    <circle cx="28" cy="170" r="2" fill="url(#serendipGrad)" opacity="0.5" />
                    <circle cx="30" cy="148" r="2" fill="url(#serendipGrad)" />

                    {/* Additional circuit detail lines */}
                    <path d="M95 55 L108 55 L118 58" stroke="url(#serendipGrad)" strokeWidth="1" fill="none" opacity="0.5" />
                    <path d="M88 60 L100 62 L110 65" stroke="url(#serendipGrad)" strokeWidth="1" fill="none" opacity="0.5" />
                    <path d="M105 100 L115 95 L130 96" stroke="url(#serendipGrad)" strokeWidth="1" fill="none" opacity="0.5" />
                </g>
            </svg>

            {showText && (
                <div className="flex flex-col">
                    <span className={`${s.font} font-bold tracking-tight`}>
                        <span className="text-slate-100">SERENDIP</span>
                        <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">.IA</span>
                    </span>
                    {size !== "sm" && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">
                            Consultoría IT & Control Interno
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
