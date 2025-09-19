import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "primary" | "secondary" | "success" | "none";
  onClick?: () => void;
}

export function GlassCard({ 
  children, 
  className, 
  hover = false,
  glow = "none",
  onClick
}: GlassCardProps) {
  const glowClass = {
    primary: "hover:shadow-glow-primary",
    secondary: "hover:shadow-glow-secondary", 
    success: "hover:shadow-glow-success",
    none: ""
  };

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 transition-all duration-300",
        hover && "hover:scale-105 cursor-pointer",
        glow !== "none" && glowClass[glow],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}