import React from "react";

interface BookingCardProps {
  stepNumber: number;
  activeStep: number;
  title: string;
  children: React.ReactNode;
}

export default function BookingCard({
  stepNumber,
  activeStep,
  title,
  children,
}: BookingCardProps) {
  const isActive = activeStep === stepNumber;
  const isDone = activeStep > stepNumber;

  return (
    <div
      className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-40 pointer-events-none hidden sm:block"}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
            isDone
              ? "bg-[#0E7C7B] text-white"
              : isActive
                ? "bg-[#4a62ff] text-white"
                : "bg-[#F0DFC2] text-[#64716F]"
          }`}
        >
          {isDone ? "✓" : stepNumber}
        </span>
        <h4 className="font-bold text-[15px]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}
