import React from "react";

/**
 * Hidden SVG defs used by `body.colorblind-<type>` in App.css.
 *
 * The color matrices are the widely-used Machado / LMS-space
 * approximations for each form of CVD. Applied site-wide via
 * `filter: url(#…)` on `<body>`. Mounted once from App.jsx so the
 * filter references resolve everywhere.
 *
 * If anything in the DOM references these ids without the filter
 * markup rendered, the browser silently skips the `filter` property
 * rather than crashing — so this component is safe to mount even
 * when no user has colorblind mode enabled.
 */
export default function ColorBlindFilters() {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter id="protanopia-filter">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="
              0.567 0.433 0.000 0 0
              0.558 0.442 0.000 0 0
              0.000 0.242 0.758 0 0
              0.000 0.000 0.000 1 0
            "
          />
        </filter>
        <filter id="deuteranopia-filter">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="
              0.625 0.375 0.000 0 0
              0.700 0.300 0.000 0 0
              0.000 0.300 0.700 0 0
              0.000 0.000 0.000 1 0
            "
          />
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="
              0.950 0.050 0.000 0 0
              0.000 0.433 0.567 0 0
              0.000 0.475 0.525 0 0
              0.000 0.000 0.000 1 0
            "
          />
        </filter>
      </defs>
    </svg>
  );
}
