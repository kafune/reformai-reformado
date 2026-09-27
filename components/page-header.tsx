export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}
