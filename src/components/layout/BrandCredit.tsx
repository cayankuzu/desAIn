interface BrandCreditProps {
  className?: string;
}

export function BrandCredit({ className = "" }: BrandCreditProps) {
  return (
    <div
      className={`brand-credit ${className}`.trim()}
      aria-label="Copyright 2026, powered by MeMoDe"
    >
      <span className="brand-credit__copyright">Copyright 2026</span>
      <span className="brand-credit__divider" aria-hidden="true" />
      <span className="brand-credit__powered">
        Powered by <strong>MeMoDe</strong>
      </span>
    </div>
  );
}
