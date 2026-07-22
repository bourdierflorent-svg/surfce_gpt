import { cn } from "@/lib/utils";

interface SurfceLogoProps {
  compact?: boolean;
  className?: string;
}

export function SurfceLogo({ compact = false, className }: SurfceLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="SURFCE">
      <span
        aria-hidden="true"
        className="relative grid size-9 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground"
      >
        <span className="absolute h-px w-5 rotate-45 bg-current opacity-80" />
        <span className="absolute h-px w-5 -rotate-45 bg-current opacity-80" />
        <span className="size-2.5 rounded-full border-2 border-current bg-primary" />
      </span>
      {!compact ? (
        <span className="text-[0.95rem] font-bold tracking-[0.22em] text-foreground">SURFCE</span>
      ) : null}
    </div>
  );
}
