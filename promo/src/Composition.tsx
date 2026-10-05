import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";

const ink = "#26312f";
const paper = "#e9ece5";
const muted = "#64716a";
const font = '"DejaVu Sans", sans-serif';

const Mark = ({ size = 46 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="currentColor"
    aria-hidden
  >
    <rect x="7" y="23" width="8" height="17" rx="4" />
    <rect x="20" y="8" width="8" height="32" rx="4" />
    <rect x="33" y="16" width="8" height="24" rx="4" />
  </svg>
);
const Header = () => (
  <div
    style={{
      position: "absolute",
      left: 120,
      top: 72,
      right: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        fontSize: 49,
        fontWeight: 600,
        letterSpacing: -2,
      }}
    >
      <Mark />
      lilt
    </div>
    <div style={{ fontSize: 20, color: muted, letterSpacing: 2 }}>
      GNOME 50 · EARLY PREVIEW
    </div>
  </div>
);
const Footnote = () => (
  <div
    style={{
      position: "absolute",
      bottom: 56,
      left: 120,
      right: 120,
      display: "flex",
      justifyContent: "space-between",
      fontSize: 20,
      color: muted,
    }}
  >
    <span>Actual GNOME capture · 1× speed · test inputs & media</span>
    <span>github.com/eggp-dev/lilt</span>
  </div>
);
const Demo = () => {
  const frame = useCurrentFrame();
  // The source plays once at its recorded speed. Only its framing changes.
  const wide = interpolate(frame, [447, 477], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sourceWidth = interpolate(wide, [0, 1], [2368, 1138]);
  const sourceTop = interpolate(wide, [0, 1], [-65, 0]);
  const caption =
    frame < 108
      ? "Press again. One display."
      : frame < 231
        ? "Your music, within reach."
        : frame < 336
          ? "A moment for volume."
          : frame < 474
            ? "A little room for quiet."
            : "Back to your desktop.";
  return (
    <AbsoluteFill>
      <Header />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 174,
          fontSize: 50,
          letterSpacing: -1.8,
          fontWeight: 500,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 278,
          width: 1680,
          height: 640,
          overflow: "hidden",
          borderRadius: 28,
          background: "#253b46",
          boxShadow: "0 18px 55px #24302b1a",
          border: "1px solid #ffffff7a",
        }}
      >
        <Video
          src={staticFile("native-source.mp4")}
          muted
          style={{
            position: "absolute",
            width: sourceWidth,
            height: (sourceWidth * 720) / 1280,
            maxWidth: "none",
            left: (1680 - sourceWidth) / 2,
            top: sourceTop,
          }}
        />
      </div>
      <Footnote />
    </AbsoluteFill>
  );
};
const Outro = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(f, [0, 20], [10, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: paper, opacity }}>
      <Header />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 310,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            fontSize: 90,
            lineHeight: 1.08,
            letterSpacing: -4,
            fontWeight: 500,
          }}
        >
          A floating pill for
          <br />
          volume and media.
        </div>
        <div style={{ fontSize: 30, color: muted, marginTop: 35 }}>
          For GNOME. Designed to come and go.
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 30,
            marginTop: 66,
            padding: "21px 30px",
            borderRadius: 16,
            background: ink,
            color: paper,
            fontSize: 27,
          }}
        >
          Try the preview <span>↗</span>
        </div>
        <div style={{ marginTop: 27, fontSize: 25, color: muted }}>
          github.com/eggp-dev/lilt
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 120,
          fontSize: 20,
          color: muted,
        }}
      >
        Development preview · Ubuntu 26.04.1 / GNOME 50.1 / Wayland
      </div>
    </AbsoluteFill>
  );
};
export const LiltIntro = () => (
  <AbsoluteFill style={{ background: paper, color: ink, fontFamily: font }}>
    <Sequence from={0} durationInFrames={540} name="Actual native session">
      <Demo />
    </Sequence>
    <Sequence from={540} durationInFrames={180} name="Try the preview">
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
export const LiltPoster = () => (
  <AbsoluteFill style={{ background: paper, color: ink, fontFamily: font }}>
    <Header />
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 225,
        fontSize: 80,
        lineHeight: 1.11,
        letterSpacing: -3.5,
      }}
    >
      A floating pill for
      <br />
      volume and media.
    </div>
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 443,
        fontSize: 27,
        color: muted,
      }}
    >
      Quiet motion. A little more room for your desktop.
    </div>
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 535,
        width: 1680,
        height: 360,
        overflow: "hidden",
        borderRadius: 28,
        boxShadow: "0 18px 55px #24302b1a",
      }}
    >
      <Img
        src={staticFile("native-volume.png")}
        style={{
          position: "absolute",
          width: 2100,
          maxWidth: "none",
          left: -210,
          top: -54,
        }}
      />
    </div>
    <Footnote />
  </AbsoluteFill>
);
