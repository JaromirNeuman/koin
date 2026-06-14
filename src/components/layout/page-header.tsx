import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </header>
  );
}
