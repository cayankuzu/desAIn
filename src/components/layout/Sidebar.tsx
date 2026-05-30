"use client";

import { useState } from "react";
import { AlertTriangle, Boxes, Code2, Keyboard, Lock, Move3d, Ruler } from "lucide-react";
import { useRoomStore } from "@/store/roomStore";
import type { RoomObject } from "@/types/room";

interface SelectedObjectDraft {
  positionX: string;
  positionZ: string;
  rotation: string;
  width: string;
  depth: string;
  height: string;
  color: string;
}

const createDraftFromObject = (object: RoomObject): SelectedObjectDraft => ({
  positionX: object.position.x.toFixed(2),
  positionZ: object.position.z.toFixed(2),
  rotation: object.rotation.toFixed(0),
  width: object.dimensions.width.toFixed(2),
  depth: object.dimensions.depth.toFixed(2),
  height: object.dimensions.height.toFixed(2),
  color: object.color,
});

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function Sidebar() {
  const roomData = useRoomStore((state) => state.roomData);
  const selectedObjectId = useRoomStore((state) => state.selectedObjectId);
  const setSelectedObjectId = useRoomStore((state) => state.setSelectedObjectId);
  const validationWarnings = useRoomStore((state) => state.validationWarnings);

  const selectedObject =
    roomData.objects.find((object) => object.id === selectedObjectId) ?? null;

  return (
    <aside className="editor-panel scroll-area flex min-h-[760px] flex-col gap-4 overflow-y-auto p-4">
      <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
          <Ruler className="h-3.5 w-3.5" />
          Scene Metrics
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <dt className="text-slate-500">Width</dt>
            <dd className="mt-1 font-semibold text-white">
              {roomData.room.width.toFixed(2)}m
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <dt className="text-slate-500">Depth</dt>
            <dd className="mt-1 font-semibold text-white">
              {roomData.room.depth.toFixed(2)}m
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <dt className="text-slate-500">Height</dt>
            <dd className="mt-1 font-semibold text-white">
              {roomData.room.height.toFixed(2)}m
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <dt className="text-slate-500">Objects</dt>
            <dd className="mt-1 font-semibold text-white">
              {roomData.objects.length}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb16a]">
          <Move3d className="h-3.5 w-3.5" />
          Details
        </div>
        {selectedObject ? (
          <SelectedObjectEditor key={selectedObject.id} object={selectedObject} />
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm leading-6 text-slate-400">
            Select an object in the viewport or outliner to edit width, depth,
            height, position, rotation, and color.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
          <Boxes className="h-3.5 w-3.5" />
          World Outliner
        </div>
        <div className="mt-4 space-y-2">
          {roomData.objects.map((object) => (
            <button
              key={object.id}
              type="button"
              onClick={() => setSelectedObjectId(object.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                selectedObjectId === object.id
                  ? "border-[#ff8c42] bg-[#2a1910] text-white"
                  : "border-white/10 bg-[#111924] text-slate-300 hover:border-[#32516c] hover:text-white"
              }`}
            >
              <div>
                <div className="font-medium">{object.label}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {object.category}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  object.locked
                    ? "bg-[#2f1b11] text-[#ffb16a]"
                    : "bg-[#102234] text-[#8cb9ff]"
                }`}
              >
                {object.locked ? "Locked" : "Open"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb16a]">
          <AlertTriangle className="h-3.5 w-3.5" />
          Validation
        </div>
        {validationWarnings.length ? (
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#f5c28b]">
            {validationWarnings.map((warning, index) => (
              <li
                key={`${warning.code}-${index}`}
                className="rounded-xl border border-[#6d4a29] bg-[#25180f] px-3 py-3"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-[#24405a] bg-[#111924] px-3 py-3 text-sm text-[#8cb9ff]">
            No active validation issues. Door, window, and locked-object constraints
            are clear.
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
          <Code2 className="h-3.5 w-3.5" />
          Scene JSON
        </summary>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#070b10] p-4 text-xs leading-6 text-slate-300">
          {JSON.stringify(roomData, null, 2)}
        </pre>
      </details>

      <section className="rounded-2xl border border-white/10 bg-[#0d141d] p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8cb9ff]">
          <Keyboard className="h-3.5 w-3.5" />
          Shortcuts
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">Q Select</div>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">W Move</div>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">E Rotate</div>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">R Toggle View</div>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">Ctrl/Cmd+Z Undo</div>
          <div className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2">Ctrl/Cmd+Y Redo</div>
        </div>
      </section>
    </aside>
  );
}

function SelectedObjectEditor({ object }: { object: RoomObject }) {
  const rotateObjectBy = useRoomStore((state) => state.rotateObjectBy);
  const toggleObjectLock = useRoomStore((state) => state.toggleObjectLock);
  const updateObjectProperties = useRoomStore((state) => state.updateObjectProperties);
  const [draft, setDraft] = useState<SelectedObjectDraft>(() => createDraftFromObject(object));

  const applyDraft = () => {
    updateObjectProperties(object.id, {
      position: {
        x: toNumber(draft.positionX, object.position.x),
        z: toNumber(draft.positionZ, object.position.z),
      },
      rotation: toNumber(draft.rotation, object.rotation),
      dimensions: {
        width: toNumber(draft.width, object.dimensions.width),
        depth: toNumber(draft.depth, object.dimensions.depth),
        height: toNumber(draft.height, object.dimensions.height),
      },
      color: draft.color || object.color,
    });
  };

  return (
    <div className="mt-4 space-y-4 text-sm text-slate-300">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">{object.label}</div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {object.generator}
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              object.locked
                ? "bg-[#2a1910] text-[#ffb16a]"
                : "bg-[#102234] text-[#8cb9ff]"
            }`}
          >
            {object.locked ? "Locked" : "Editable"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Position X
            </span>
            <input
              type="number"
              step="0.05"
              value={draft.positionX}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  positionX: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Position Z
            </span>
            <input
              type="number"
              step="0.05"
              value={draft.positionZ}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  positionZ: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Rotation
            </span>
            <input
              type="number"
              step="15"
              value={draft.rotation}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  rotation: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Color
            </span>
            <input
              type="color"
              value={draft.color}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111924] px-2 py-2 outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Width
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={draft.width}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  width: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Depth
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={draft.depth}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  depth: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Height
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={draft.height}
              disabled={object.locked}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  height: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-[#111924] px-3 py-2 text-white outline-none transition focus:border-[#4ea8ff] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyDraft}
          disabled={object.locked}
          className="rounded-xl border border-[#1f4b65] bg-[#102234] px-3 py-2 font-medium text-[#8cb9ff] transition hover:border-[#4ea8ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Apply Values
        </button>
        <button
          type="button"
          onClick={() => rotateObjectBy(object.id, -15)}
          disabled={object.locked}
          className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2 font-medium text-slate-200 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Rotate -15
        </button>
        <button
          type="button"
          onClick={() => rotateObjectBy(object.id, 15)}
          disabled={object.locked}
          className="rounded-xl border border-white/10 bg-[#111924] px-3 py-2 font-medium text-slate-200 transition hover:border-[#32516c] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Rotate +15
        </button>
        <button
          type="button"
          onClick={() => toggleObjectLock(object.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111924] px-3 py-2 font-medium text-slate-200 transition hover:border-[#32516c] hover:text-white"
        >
          <Lock className="h-4 w-4" />
          {object.locked ? "Unlock" : "Lock"}
        </button>
      </div>

      {object.locked ? (
        <div className="rounded-xl border border-[#6d4a29] bg-[#25180f] px-3 py-3 text-sm text-[#f5c28b]">
          Locked objects cannot be edited until you unlock them.
        </div>
      ) : null}
    </div>
  );
}
