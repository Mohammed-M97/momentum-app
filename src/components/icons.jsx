/* ===== 6. icons ==========================================================
   Inline SVG icons as small React components. All share the <Svg> base so
   stroke width, line caps, and the 24x24 viewBox stay consistent.
   ======================================================================== */

export const Svg = ({ children, size = 18, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);

export const IconToday    = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></Svg>;
export const IconTasks    = (p) => <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></Svg>;
export const IconGoals    = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></Svg>;
export const IconWeekly   = (p) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const IconRoadmap  = (p) => <Svg {...p}><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="M9 4v13M15 7v13" /></Svg>;
export const IconSettings = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></Svg>;
export const IconPlus     = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconCheck    = (p) => <Svg {...p} strokeWidth="3"><path d="M20 6L9 17l-5-5" /></Svg>;
export const IconEdit     = (p) => <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>;
export const IconTrash    = (p) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></Svg>;
export const IconUp       = (p) => <Svg {...p}><path d="M18 15l-6-6-6 6" /></Svg>;
export const IconDown     = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconLeft     = (p) => <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>;
export const IconRight    = (p) => <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>;
export const IconSun      = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></Svg>;
export const IconMoon     = (p) => <Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>;
export const IconClose    = (p) => <Svg {...p}><path d="M18 6L6 18M6 6l12 12" /></Svg>;
export const IconTag      = (p) => <Svg {...p}><path d="M20.6 13.4L12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></Svg>;
