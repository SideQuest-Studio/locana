import React from "react";

interface SectionTitleProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "left" | "center";
  eyebrowColor?: "blue" | "teal" | "gold" | "white";
  light?: boolean;
}

const eyebrowColors: Record<string, string> = {
  blue: "bg-[#1E88E5]/10 text-[#1565C0]",
  teal: "bg-[#0E7C7B]/10 text-[#0E7C7B]",
  gold: "bg-[#F4A93E]/15 text-[#B87A1B]",
  white: "bg-white/15 text-white",
};

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
  eyebrowColor = "blue",
  light = false,
}: SectionTitleProps) {
  return (
    <div
      className={`flex flex-col ${align === "center" ? "items-center text-center" : "items-start text-left"}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 ${eyebrowColors[eyebrowColor]}`}
      >
        {eyebrow}
      </span>
      <h2
        className={`text-[30px] sm:text-[42px] leading-[1.08] font-semibold ${light ? "text-white" : "text-[#1F2A2E]"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-[15px] leading-relaxed max-w-lg ${
            light ? "text-white/75" : "text-[#64716F]"
          } ${align === "center" ? "mx-auto" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
