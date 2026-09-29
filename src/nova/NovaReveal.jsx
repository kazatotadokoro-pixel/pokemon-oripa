import { useEffect, useRef, useState } from "react";
import { createNovaPlayer, setNovaSound, primeNovaAudio, wakeNovaAudio } from "./novaEngine.js";
import { RANK_CARDS } from "./rankCards.js";

const SOUND_KEY = "oripaluck_nova_sound";
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { return true; } };

// 超新星の開封演出（全画面）。終わったら onDone を呼ぶ。
// tier: 0=ハズレ 1=4等 2=3等 3=2等 4=1等 / cardImage: 最後に出すカード画像（省略時は等級カード）
export default function NovaReveal({ tier, cardImage, onDone, onUnsupported }) {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const doneRef = useRef(false);
  const [sound, setSound] = useState(readSound);

  useEffect(() => {
    setNovaSound(sound);
    const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone && onDone(); };
    const p = createNovaPlayer(canvasRef.current, { tier, cardImage: cardImage || RANK_CARDS[tier], onDone: finish });
    if (!p) { onUnsupported ? onUnsupported() : finish(); return; }
    playerRef.current = p;
    p.start();
    return () => { p.destroy(); playerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setNovaSound(next);
    if (next) primeNovaAudio();
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch (e) {}
  };
  const skip = () => { playerRef.current ? playerRef.current.skip() : (!doneRef.current && (doneRef.current = true, onDone && onDone())); };

  const btn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.75)", padding: "9px 20px", borderRadius: 30, fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" };
  return (
    <div onPointerDown={() => { if (sound) wakeNovaAudio(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ height: "min(100dvh, calc(100vw * 16 / 9))", width: "min(100vw, calc(100dvh * 9 / 16))", display: "block" }} />
      <button onClick={toggleSound} aria-label={sound ? "効果音をオフ" : "効果音をオン"} style={{ ...btn, position: "absolute", bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", left: 20 }}>{sound ? "🔊" : "🔇"}</button>
      <button onClick={skip} style={{ ...btn, position: "absolute", bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", right: 20 }}>スキップ →</button>
    </div>
  );
}
