"use client";

import type { InventoryTemplate } from "@/lib/room/inventoryCatalog";

export function InventoryPreview({ item }: { item: InventoryTemplate }) {
  const baseClasses =
    "relative h-20 w-full overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#152031_0%,#0d141d_100%)]";

  const accentStyle = { backgroundColor: item.color };

  switch (item.previewType) {
    case "cube":
      return (
        <div className={baseClasses}>
          <div
            className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-lg border border-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.32)]"
            style={accentStyle}
          />
        </div>
      );
    case "column":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-3 left-1/2 h-14 w-5 -translate-x-1/2 rounded-full border border-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.32)]"
            style={accentStyle}
          />
        </div>
      );
    case "sofa":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-7 w-16 -translate-x-1/2 rounded-2xl border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-10 left-1/2 h-5 w-16 -translate-x-1/2 rounded-t-2xl border border-white/15 bg-white/20" />
        </div>
      );
    case "bed":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-12 w-16 -translate-x-1/2 rounded-2xl border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-10 left-[calc(50%-1.6rem)] h-3 w-5 rounded-lg bg-white/80" />
          <div className="absolute bottom-10 left-[calc(50%+0.2rem)] h-3 w-5 rounded-lg bg-white/80" />
        </div>
      );
    case "table":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-10 left-1/2 h-3 w-16 -translate-x-1/2 rounded-md border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-4 left-[calc(50%-1.8rem)] h-6 w-1 rounded bg-[#6f4f37]" />
          <div className="absolute bottom-4 left-[calc(50%+1.3rem)] h-6 w-1 rounded bg-[#6f4f37]" />
        </div>
      );
    case "chair":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-7 left-1/2 h-3 w-8 -translate-x-1/2 rounded-md border border-white/15"
            style={accentStyle}
          />
          <div
            className="absolute bottom-10 left-1/2 h-7 w-8 -translate-x-1/2 rounded-t-lg border border-white/15 bg-white/20"
          />
        </div>
      );
    case "wardrobe":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-14 w-11 -translate-x-1/2 rounded-lg border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-4 left-1/2 h-14 w-px -translate-x-1/2 bg-white/30" />
        </div>
      );
    case "tv":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-4 w-16 -translate-x-1/2 rounded-md border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-10 left-1/2 h-8 w-14 -translate-x-1/2 rounded-lg border border-white/15 bg-[#202a34]" />
        </div>
      );
    case "rug":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-10 w-16 -translate-x-1/2 rounded-2xl border border-white/15"
            style={accentStyle}
          />
        </div>
      );
    case "stairs":
      return (
        <div className={baseClasses}>
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className="absolute bottom-4 rounded-sm border border-white/10"
              style={{
                left: `${20 + step * 9}%`,
                width: "11%",
                height: `${12 + step * 7}px`,
                backgroundColor: item.color,
              }}
            />
          ))}
        </div>
      );
    case "lamp":
      return (
        <div className={baseClasses}>
          <div className="absolute bottom-4 left-1/2 h-10 w-1 -translate-x-1/2 rounded bg-[#bda37a]" />
          <div className="absolute bottom-14 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[14px] border-b-[20px] border-x-transparent border-b-[#f0d5aa]" />
          <div className="absolute bottom-3 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-[#6f5d4e]" />
        </div>
      );
    case "appliance":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-14 w-10 -translate-x-1/2 rounded-lg border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-4 left-[calc(50%+0.8rem)] h-14 w-px bg-[#8e959c]" />
        </div>
      );
    case "storage":
      return (
        <div className={baseClasses}>
          <div
            className="absolute bottom-4 left-1/2 h-8 w-14 -translate-x-1/2 rounded-lg border border-white/15"
            style={accentStyle}
          />
          <div className="absolute bottom-8 left-1/2 h-2 w-10 -translate-x-1/2 rounded bg-white/15" />
        </div>
      );
    case "decor":
    default:
      return (
        <div className={baseClasses}>
          <div
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.32)]"
            style={accentStyle}
          />
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded bg-white/30" />
        </div>
      );
  }
}
