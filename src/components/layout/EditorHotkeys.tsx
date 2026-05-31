"use client";

import { useEffect } from "react";
import { useRoomStore } from "@/store/roomStore";

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
};

export function EditorHotkeys() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const store = useRoomStore.getState();

      if ((event.metaKey || event.ctrlKey) && key === "z" && event.shiftKey) {
        event.preventDefault();
        store.redo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault();
        store.redo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        store.undo();
        return;
      }

      if (key === "q") {
        event.preventDefault();
        store.setTransformMode("select");
        return;
      }

      if (key === "w") {
        event.preventDefault();
        store.setTransformMode("translate");
        return;
      }

      if (key === "e") {
        event.preventDefault();
        store.setTransformMode("rotate");
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        store.setSelectedObjectId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
