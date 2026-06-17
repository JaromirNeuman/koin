import Image from "next/image";
import { cn } from "@/lib/utils";

interface KoinLogoProps {
  size?: number;
  className?: string;
}

export function KoinLogo({ size = 32, className }: KoinLogoProps) {
  return (
    <div 
      className={cn("relative shrink-0 overflow-hidden", className)} 
      style={{ width: size, height: size }}
    >
      <Image
        src="/koinLogo.png"
        alt="Koin Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}