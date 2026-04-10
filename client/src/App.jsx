import { useEffect, useMemo, useRef, useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { Code2, Expand, ImagePlus, Loader2, Minimize, UploadCloud } from "lucide-react";

const API_URL = "http://localhost:8000/api/generate";

const DEFAULT_APP_CODE = `export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-xl font-semibold">Drop an image to generate UI</h1>
        <p className="mt-2 text-zinc-300 text-sm">
          Your generated React + Tailwind component will render here.
        </p>
      </div>
    </div>
  );
}
`;

export default function App() {
  const fileInputRef = useRef(null);
  const previewPanelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(34);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  const sandpackFiles = useMemo(() => {
    return {
      "/App.js": generatedCode?.trim() ? generatedCode : DEFAULT_APP_CODE,
    };
  }, [generatedCode]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isResizing) return;
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 768) return;

      const raw = (e.clientX / viewportWidth) * 100;
      const clamped = Math.max(24, Math.min(52, raw));
      setLeftPaneWidth(clamped);
    }

    function onMouseUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsPreviewFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError("Please upload an image file (png/jpg/webp).");
      return;
    }

    setError("");
    setIsLoading(true);

    const url = URL.createObjectURL(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });

    try {
      const formData = new FormData();
      formData.append("file", file); // must match FastAPI UploadFile param

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.detail || "Request failed.";
        throw new Error(message);
      }

      setGeneratedCode(data?.code || "");
    } catch (e) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function onPickClick() {
    fileInputRef.current?.click();
  }

  async function togglePreviewFullscreen() {
    if (!previewPanelRef.current) return;
    if (!document.fullscreenElement) {
      await previewPanelRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              UI → Code Generator
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              Upload a UI screenshot. Get a React component (Tailwind) and preview it live.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1">
              <ImagePlus className="h-4 w-4" />
              Vision to React
            </span>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-4 md:gap-0 md:flex-row md:items-stretch">
          {/* Left: Uploader */}
          <section
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 md:p-6"
            style={{ width: `clamp(320px, ${leftPaneWidth}%, 52vw)` }}
          >
            <h2 className="text-sm font-medium text-zinc-200">Uploader</h2>

            <div
              className={[
                "mt-3 relative rounded-2xl border border-dashed p-6 transition",
                isDragging
                  ? "border-indigo-400/80 bg-indigo-500/10"
                  : "border-zinc-700/70 bg-zinc-950/30 hover:bg-zinc-950/40",
              ].join(" ")}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              role="button"
              tabIndex={0}
              onClick={onPickClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onPickClick();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 border border-zinc-800">
                  <UploadCloud className="h-5 w-5 text-zinc-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100">
                    Drag & drop an image, or click to upload
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Sends to <span className="font-mono">{API_URL}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/30 grid place-items-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-zinc-500" />
                  )}
                </div>

                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-200">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating code…
                    </div>
                  ) : generatedCode ? (
                    <p className="text-sm text-zinc-200">Generated code ready.</p>
                  ) : (
                    <p className="text-sm text-zinc-400">No code generated yet.</p>
                  )}

                  {error ? (
                    <p className="mt-1 text-xs text-rose-300">{error}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-zinc-400">
              Tip: Use clear screenshots; crop to just the UI for better results.
            </div>
          </section>

          <div
            className={[
              "hidden md:flex w-3 mx-2 items-center justify-center",
              isResizing ? "cursor-col-resize" : "cursor-ew-resize",
            ].join(" ")}
            onMouseDown={() => setIsResizing(true)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
          >
            <div className="h-24 w-1 rounded-full bg-zinc-700/70 hover:bg-indigo-400/80 transition-colors" />
          </div>

          {/* Right: Live Preview */}
          <section
            ref={previewPanelRef}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 md:p-6 flex-1 min-w-0"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-200">Live Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePreviewFullscreen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950/50 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-900 transition"
                >
                  {isPreviewFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
                  {isPreviewFullscreen ? "Exit full screen" : "Full screen"}
                </button>
                <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300">
                  <Code2 className="h-3.5 w-3.5" />
                  {generatedCode ? "Generated component loaded" : "Awaiting generated component"}
                </div>
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30 min-h-[68vh]">
              <Sandpack
                template="react"
                files={sandpackFiles}
                options={{
                  externalResources: ["https://cdn.tailwindcss.com"],
                  showLineNumbers: true,
                  showInlineErrors: true,
                  wrapContent: true,
                  editorHeight: 640,
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

