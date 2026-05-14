import React, { useRef, useState } from "react";

/**
 * Drag-drop + click portrait uploader. Renders the picked image as a
 * background-image once set; offers a "Replace" overlay button to clear.
 *
 * Ported from design-reference/character-creator/ui.jsx (~82-139).
 *
 * TODO (Phase C1): the prototype reads files via FileReader.readAsDataURL
 * and emits a base64 data URL. The production app uploads to Supabase
 * storage (`user-assets/users/{user_id}/character-library/...`) and
 * stores the resulting URL. When wiring this into the Identity step,
 * swap the data-URL path for the existing uploadFile() helper from
 * src/utils/uploadFile and emit the file_url instead.
 */
export function PortraitUpload({
  src,
  onChange,
  shape,
  label,
  placeholder,
  height,
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange?.(e.target.result);
    reader.readAsDataURL(file);
  };

  const isCircle = shape === "circle";

  return (
    <div>
      {label && (
        <div className="cc-label" style={{ marginBottom: 8 }}>
          {label}
        </div>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        style={{
          width: "100%",
          height: isCircle ? "auto" : height || 320,
          borderRadius: isCircle ? "50%" : 14,
          aspectRatio: isCircle ? "1 / 1" : undefined,
          maxWidth: isCircle ? 180 : "100%",
          margin: isCircle ? "0 auto" : undefined,
          background: src
            ? `url(${src}) center/cover`
            : "rgba(11, 19, 28, 0.6)",
          border: `2px ${drag ? "solid" : "dashed"} ${
            drag
              ? "var(--cc-orange)"
              : src
              ? "var(--cc-orange)"
              : "var(--cc-border-strong)"
          }`,
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color .15s, background .15s",
          overflow: "hidden",
        }}
      >
        {!src && (
          <div
            style={{
              textAlign: "center",
              color: "var(--cc-text-faint)",
              pointerEvents: "none",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>⊕</div>
            {placeholder?.trim() && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cc-text-dim)",
                  }}
                >
                  {placeholder}
                </div>
                <div
                  style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}
                >
                  PNG · JPG · WebP
                </div>
              </>
            )}
          </div>
        )}
        {src && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.("");
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Replace
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
