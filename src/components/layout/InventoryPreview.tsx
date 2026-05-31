"use client";

import type { InventoryTemplate } from "@/lib/room/inventoryCatalog";
import type { ReactNode } from "react";

const shellClass =
  "relative h-24 w-full overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_34%_18%,rgba(140,185,255,0.22),transparent_34%),linear-gradient(180deg,#162131_0%,#0d141d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";

const stageClass =
  "absolute inset-x-4 bottom-3 h-9 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_58%,transparent_70%)]";

const getBaseShape = (item: InventoryTemplate) =>
  String(item.params.baseShape ?? "");

const colorStyle = (color: string) => ({ backgroundColor: color });

function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className={shellClass}>
      <div className={stageClass} />
      <div className="absolute left-4 top-4 h-2 w-2 rounded-full bg-white/25" />
      {children}
    </div>
  );
}

function BoxBody({
  color,
  className,
}: {
  color: string;
  className: string;
}) {
  return (
    <div
      className={`absolute rounded-lg border border-white/15 shadow-[0_16px_28px_rgba(0,0,0,0.34)] ${className}`}
      style={colorStyle(color)}
    >
      <div className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/18" />
    </div>
  );
}

export function InventoryPreview({ item }: { item: InventoryTemplate }) {
  const baseShape = getBaseShape(item);
  const accentStyle = colorStyle(item.color);

  if (baseShape === "door_panel") {
    return (
      <PreviewShell>
        <div
          className="absolute bottom-4 left-1/2 h-16 w-11 -translate-x-1/2 rounded-t-lg border border-white/15 shadow-[0_16px_28px_rgba(0,0,0,0.34)]"
          style={accentStyle}
        />
        <div className="absolute bottom-10 left-[calc(50%+0.65rem)] h-2 w-2 rounded-full bg-[#f1d08d]" />
      </PreviewShell>
    );
  }

  if (baseShape === "window_panel" || item.previewType === "window") {
    return (
      <PreviewShell>
        <div
          className="absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 rounded-lg border-[5px] border-white/30 shadow-[0_16px_28px_rgba(0,0,0,0.28)]"
          style={accentStyle}
        />
        <div className="absolute left-1/2 top-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2 bg-white/45" />
        <div className="absolute left-1/2 top-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2 bg-white/45" />
        <div className="absolute left-[calc(50%-1.4rem)] top-[calc(50%-0.8rem)] h-4 w-5 rounded bg-white/20" />
      </PreviewShell>
    );
  }

  if (baseShape === "radiator") {
    return (
      <PreviewShell>
        <div className="absolute bottom-5 left-1/2 flex h-10 -translate-x-1/2 items-end gap-1">
          {[0, 1, 2, 3, 4, 5].map((rib) => (
            <div
              key={rib}
              className="h-10 w-2 rounded-md border border-white/10 shadow-[0_12px_22px_rgba(0,0,0,0.28)]"
              style={accentStyle}
            />
          ))}
        </div>
        <div className="absolute bottom-4 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#e8b275]" />
      </PreviewShell>
    );
  }

  if (baseShape === "wall_box") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-7 left-1/2 h-9 w-20 -translate-x-1/2" />
        <div className="absolute bottom-11 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/30" />
      </PreviewShell>
    );
  }

  if (baseShape === "wall_panel") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-5 left-1/2 h-14 w-12 -translate-x-1/2" />
        <div className="absolute bottom-9 left-1/2 h-8 w-8 -translate-x-1/2 rounded-md bg-white/35" />
      </PreviewShell>
    );
  }

  if (baseShape === "ceiling_light" || baseShape === "wall_sconce" || item.previewType === "lighting") {
    return (
      <PreviewShell>
        <div className="absolute left-1/2 top-5 h-8 w-8 -translate-x-1/2 rounded-full border border-white/15 bg-[#f1d8a7] shadow-[0_0_26px_rgba(241,216,167,0.34)]" />
        <div className="absolute left-1/2 top-9 h-10 w-px -translate-x-1/2 bg-[#bda37a]" />
        <div className="absolute bottom-5 left-1/2 h-5 w-12 -translate-x-1/2 rounded-full bg-[#f1d8a7]/35 blur-md" />
      </PreviewShell>
    );
  }

  if (baseShape === "kitchen_sink") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-4 left-1/2 h-10 w-20 -translate-x-1/2" />
        <div className="absolute bottom-12 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-[#d8e0e5]" />
        <div className="absolute bottom-[3.45rem] left-[calc(50%+0.8rem)] h-5 w-1 rounded bg-[#d8c59d]" />
      </PreviewShell>
    );
  }

  if (baseShape === "cooktop") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-8 left-1/2 h-4 w-20 -translate-x-1/2" />
        {[0, 1, 2, 3].map((burner) => (
          <div
            key={burner}
            className="absolute h-3.5 w-3.5 rounded-full border border-white/35"
            style={{
              left: `calc(50% + ${burner % 2 === 0 ? "-1.15rem" : "0.55rem"})`,
              bottom: burner < 2 ? "2.35rem" : "3rem",
            }}
          />
        ))}
      </PreviewShell>
    );
  }

  if (baseShape === "appliance_box" || baseShape === "washer" || item.previewType === "appliance") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-4 left-1/2 h-14 w-11 -translate-x-1/2" />
        {baseShape === "washer" ? (
          <div className="absolute bottom-9 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-[#8fa1af] bg-[#c8d6df]" />
        ) : (
          <div className="absolute bottom-8 left-[calc(50%+0.8rem)] h-9 w-px bg-[#8e959c]" />
        )}
      </PreviewShell>
    );
  }

  if (baseShape === "bathtub" || item.previewType === "bath") {
    return (
      <PreviewShell>
        <div
          className="absolute bottom-5 left-1/2 h-9 w-20 -translate-x-1/2 rounded-b-2xl rounded-t-lg border border-white/15 shadow-[0_16px_28px_rgba(0,0,0,0.28)]"
          style={accentStyle}
        />
        <div className="absolute bottom-11 left-1/2 h-2.5 w-14 -translate-x-1/2 rounded-full bg-white/65" />
      </PreviewShell>
    );
  }

  if (baseShape === "toilet") {
    return (
      <PreviewShell>
        <div className="absolute bottom-5 left-1/2 h-8 w-9 -translate-x-1/2 rounded-full border border-white/15 bg-[#e5edf1]" />
        <div className="absolute bottom-11 left-1/2 h-7 w-11 -translate-x-1/2 rounded-lg border border-white/15 bg-[#e5edf1]" />
      </PreviewShell>
    );
  }

  if (baseShape === "stairs" || baseShape === "spiral_stairs" || baseShape === "ladder_stairs" || item.previewType === "stairs") {
    return (
      <PreviewShell>
        {[0, 1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className="absolute bottom-4 rounded-sm border border-white/10 shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
            style={{
              left: `${18 + step * 9}%`,
              width: baseShape === "ladder_stairs" ? "7%" : "12%",
              height: `${12 + step * 6}px`,
              backgroundColor: item.color,
              transform: baseShape === "spiral_stairs" ? `rotate(${step * 12}deg)` : undefined,
            }}
          />
        ))}
      </PreviewShell>
    );
  }

  if (baseShape === "plant" || item.previewType === "plant") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-5 w-9 -translate-x-1/2 rounded-b-lg bg-[#8b6044]" />
        <div className="absolute bottom-8 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border border-white/10" style={accentStyle} />
        <div className="absolute bottom-12 left-[calc(50%-0.9rem)] h-7 w-7 rounded-full bg-[#6f9a63]" />
      </PreviewShell>
    );
  }

  if (baseShape === "guitar" || item.previewType === "instrument") {
    return (
      <PreviewShell>
        <div className="absolute bottom-5 left-1/2 h-9 w-8 -translate-x-1/2 rounded-full border border-white/15" style={accentStyle} />
        <div className="absolute bottom-12 left-1/2 h-8 w-2 -translate-x-1/2 rounded bg-[#6c4d36]" />
        <div className="absolute bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded bg-[#4f4037]" />
      </PreviewShell>
    );
  }

  if (baseShape === "piano") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-5 left-1/2 h-11 w-20 -translate-x-1/2" />
        <div className="absolute bottom-9 left-1/2 h-2 w-14 -translate-x-1/2 rounded-sm bg-white/80" />
        <div className="absolute bottom-4 left-1/2 h-3 w-16 -translate-x-1/2 rounded bg-black/35" />
      </PreviewShell>
    );
  }

  if (baseShape === "low_shelf" || item.previewType === "storage") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-4 left-1/2 h-9 w-16 -translate-x-1/2" />
        <div className="absolute bottom-9 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded bg-white/20" />
        <div className="absolute bottom-7 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded bg-white/20" />
      </PreviewShell>
    );
  }

  if (item.previewType === "sofa") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-8 w-20 -translate-x-1/2 rounded-2xl border border-white/15 shadow-[0_16px_28px_rgba(0,0,0,0.3)]" style={accentStyle} />
        <div className="absolute bottom-11 left-1/2 h-5 w-20 -translate-x-1/2 rounded-t-2xl border border-white/15 bg-white/20" />
        <div className="absolute bottom-5 left-[calc(50%-2.7rem)] h-8 w-2 rounded bg-black/15" />
        <div className="absolute bottom-5 left-[calc(50%+2.2rem)] h-8 w-2 rounded bg-black/15" />
      </PreviewShell>
    );
  }

  if (item.previewType === "bed") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-[3.25rem] w-[4.5rem] -translate-x-1/2 rounded-xl border border-white/15 shadow-[0_16px_28px_rgba(0,0,0,0.3)]" style={accentStyle} />
        <div className="absolute bottom-11 left-[calc(50%-1.45rem)] h-3.5 w-6 rounded-lg bg-white/85" />
        <div className="absolute bottom-11 left-[calc(50%+0.25rem)] h-3.5 w-6 rounded-lg bg-white/85" />
      </PreviewShell>
    );
  }

  if (item.previewType === "table") {
    return (
      <PreviewShell>
        <div className="absolute bottom-11 left-1/2 h-3.5 w-20 -translate-x-1/2 rounded-md border border-white/15 shadow-[0_14px_22px_rgba(0,0,0,0.28)]" style={accentStyle} />
        <div className="absolute bottom-4 left-[calc(50%-2.1rem)] h-7 w-1.5 rounded bg-[#6f4f37]" />
        <div className="absolute bottom-4 left-[calc(50%+1.85rem)] h-7 w-1.5 rounded bg-[#6f4f37]" />
      </PreviewShell>
    );
  }

  if (item.previewType === "chair") {
    return (
      <PreviewShell>
        <div className="absolute bottom-7 left-1/2 h-3.5 w-9 -translate-x-1/2 rounded-md border border-white/15" style={accentStyle} />
        <div className="absolute bottom-11 left-1/2 h-8 w-9 -translate-x-1/2 rounded-t-lg border border-white/15 bg-white/20" />
        <div className="absolute bottom-4 left-[calc(50%-1rem)] h-4 w-1 rounded bg-[#3f5158]" />
        <div className="absolute bottom-4 left-[calc(50%+0.8rem)] h-4 w-1 rounded bg-[#3f5158]" />
      </PreviewShell>
    );
  }

  if (item.previewType === "wardrobe") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-4 left-1/2 h-14 w-12 -translate-x-1/2" />
        <div className="absolute bottom-4 left-1/2 h-14 w-px -translate-x-1/2 bg-white/30" />
        <div className="absolute bottom-10 left-[calc(50%+0.75rem)] h-1.5 w-1.5 rounded-full bg-[#e7c17f]" />
      </PreviewShell>
    );
  }

  if (item.previewType === "tv") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-4 left-1/2 h-4 w-20 -translate-x-1/2" />
        <div className="absolute bottom-10 left-1/2 h-9 w-16 -translate-x-1/2 rounded-lg border border-white/15 bg-[#202a34] shadow-[0_12px_24px_rgba(0,0,0,0.3)]" />
        <div className="absolute bottom-8 left-1/2 h-3 w-5 -translate-x-1/2 rounded bg-[#282f35]" />
      </PreviewShell>
    );
  }

  if (item.previewType === "rug") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-10 w-20 -translate-x-1/2 rounded-2xl border border-white/15 shadow-[0_14px_24px_rgba(0,0,0,0.22)]" style={accentStyle} />
        <div className="absolute bottom-7 left-1/2 h-4 w-14 -translate-x-1/2 rounded-full border border-white/18" />
      </PreviewShell>
    );
  }

  if (item.previewType === "lamp") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-10 w-1 -translate-x-1/2 rounded bg-[#bda37a]" />
        <div className="absolute bottom-14 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[15px] border-b-[21px] border-x-transparent border-b-[#f0d5aa]" />
        <div className="absolute bottom-3 left-1/2 h-2 w-9 -translate-x-1/2 rounded-full bg-[#6f5d4e]" />
      </PreviewShell>
    );
  }

  if (item.previewType === "column") {
    return (
      <PreviewShell>
        <div className="absolute bottom-4 left-1/2 h-[3.75rem] w-6 -translate-x-1/2 rounded-full border border-white/20 shadow-[0_16px_28px_rgba(0,0,0,0.32)]" style={accentStyle} />
        <div className="absolute bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-white/20" />
      </PreviewShell>
    );
  }

  if (item.previewType === "cube") {
    return (
      <PreviewShell>
        <BoxBody color={item.color} className="bottom-6 left-1/2 h-12 w-12 -translate-x-1/2 rotate-6" />
      </PreviewShell>
    );
  }

  return (
    <PreviewShell>
      <BoxBody color={item.color} className="bottom-5 left-1/2 h-11 w-12 -translate-x-1/2" />
      <div className="absolute bottom-10 left-1/2 h-5 w-6 -translate-x-1/2 rounded bg-white/28" />
    </PreviewShell>
  );
}
