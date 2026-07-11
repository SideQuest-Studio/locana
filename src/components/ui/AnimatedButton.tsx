"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "light";
  size?: "md" | "lg";
  icon?: boolean;
  type?: "button" | "submit";
  className?: string;
}

const variants: Record<string, string> = {
  primary:
    "bg-[#1E88E5] text-white hover:bg-[#1565C0] shadow-[0_10px_24px_-8px_rgba(30,136,229,0.55)] hover:shadow-[0_16px_32px_-10px_rgba(30,136,229,0.6)]",
  secondary:
    "bg-[#0E7C7B] text-white hover:bg-[#0B5E5D] shadow-[0_10px_24px_-8px_rgba(14,124,123,0.5)]",
  ghost:
    "bg-white text-[#1F2A2E] border-2 border-[#F0DFC2] hover:border-[#1E88E5] hover:text-[#1565C0]",
  light: "bg-white/95 text-[#1F2A2E] hover:bg-white",
};

const sizes: Record<string, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-[15px]",
};

export default function AnimatedButton({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  icon = true,
  type = "button",
  className = "",
}: AnimatedButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {children}
      {icon && (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={`group ${classes}`}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={`group ${classes}`}>
      {content}
    </button>
  );
}
