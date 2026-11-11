import { useRef } from "react";

export function Resizer({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const lastX = useRef(0);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    }
    function onMouseUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative w-3 shrink-0 cursor-col-resize select-none"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-800 transition-colors group-hover:bg-brand-500" />
    </div>
  );
}
