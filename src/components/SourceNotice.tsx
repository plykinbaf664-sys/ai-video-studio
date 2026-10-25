import { AbsoluteFill } from "remotion";

// Studio-only state. calculateMetadata rejects it during rendering.
export const SourceNotice: React.FC<{ message: string | null }> = ({
  message,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#111318",
      color: "#f5f5f0",
      justifyContent: "center",
      padding: 88,
      fontFamily: "Arial, sans-serif",
      gap: 40,
    }}
  >
    <div style={{ fontSize: 76, fontWeight: 700 }}>
      Ожидается исходное видео
    </div>
    <div style={{ fontSize: 44, lineHeight: 1.5 }}>
      {message ?? "Поместите исходник в public/source.mp4 и обновите Studio."}
    </div>
    <code style={{ fontSize: 40 }}>public/source.mp4</code>
  </AbsoluteFill>
);
