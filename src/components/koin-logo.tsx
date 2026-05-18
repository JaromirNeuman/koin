import { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface KoinLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function KoinLogo({ size = 32, className, ...props }: KoinLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-foreground", className)}
      {...props}
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" />
      {/* K – vertical stroke */}
      <line x1="32" y1="24" x2="32" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* K – upper diagonal */}
      <line x1="32" y1="50" x2="66" y2="24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* K – lower diagonal */}
      <line x1="32" y1="50" x2="68" y2="76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
