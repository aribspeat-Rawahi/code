import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, pop } from "../anim";
import { FRAUNCES, INTER } from "../fonts";
import type { StoryProps } from "../story";
import { C, LOGO } from "../theme";
import { TRANSITION } from "../timeline";
import { useLayout } from "./layout";
import { Backdrop } from "./Scene";

const Icon: React.FC<{ kind: "phone" | "web" | "mail"; size: number }> = ({ kind, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.forest700} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {kind === "phone" && <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />}
    {kind === "web" && (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    )}
    {kind === "mail" && (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    )}
  </svg>
);

export const Outro: React.FC<{ outro: StoryProps["outro"] }> = ({ outro }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useLayout() === "vertical";
  const at = (sec: number) => pop(frame - TRANSITION, fps, sec, 16);
  // Gentle zoom-out over the whole outro
  const zoom = interpolate(frame, [0, 6 * fps], [1.08, 1], CLAMP);

  const contacts: { kind: "phone" | "web" | "mail"; text: string }[] = [
    { kind: "phone", text: `WhatsApp / Call: ${outro.whatsapp}` },
    { kind: "web", text: outro.website },
    { kind: "mail", text: outro.email },
  ];
  const logo = at(0);
  const fs = vertical ? 44 : 42;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <Backdrop glow={{ x: width / 2, y: height * 0.38, r: vertical ? 640 : 620 }} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: vertical ? "120px 80px 250px" : 80,
          transform: `scale(${zoom})`,
          textAlign: "center",
        }}
      >
        <Img src={staticFile(LOGO)} style={{ width: vertical ? 220 : 180, height: vertical ? 220 : 180, transform: `scale(${logo})` }} />
        <div
          style={{
            marginTop: 36,
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: vertical ? 80 : 84,
            lineHeight: 1.08,
            color: C.forest900,
            opacity: at(0.3),
            transform: `translateY(${(1 - at(0.3)) * 30}px)`,
            maxWidth: vertical ? 900 : 1600,
          }}
        >
          {outro.headline}
        </div>
        <div style={{ marginTop: 20, fontSize: vertical ? 44 : 44, color: C.muted, opacity: at(0.6), transform: `translateY(${(1 - at(0.6)) * 20}px)` }}>
          {outro.subline}
        </div>
        <div style={{ marginTop: vertical ? 70 : 56, display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 28 : 56, alignItems: vertical ? "flex-start" : "center" }}>
          {contacts.map((c, i) => {
            const p = at(1 + i * 0.25);
            return (
              <div
                key={c.kind}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  fontSize: fs,
                  fontWeight: 600,
                  color: C.forest700,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 24}px)`,
                }}
              >
                <div style={{ width: fs * 1.6, height: fs * 1.6, borderRadius: "50%", background: C.leafLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon kind={c.kind} size={fs * 0.85} />
                </div>
                {c.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
