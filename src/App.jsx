import { useState, useEffect, useRef, useMemo } from "react";
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

const REAL_CARDS = {
  sar: [
    {name:"メガルカリオ ex",rarity:"SAR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
  ],
  sr: [
    {name:"メガズルズキン ex",rarity:"SAR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
    {name:"ルリナ",rarity:"SR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
    {name:"サイトウ",rarity:"HR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
    {name:"ビクティニ",rarity:"AR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
    {name:"メガカイリュー ex",rarity:"MA",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
    {name:"ナンジャモのハラバリー ex",rarity:"UR",img:"https://placehold.co/300x420/1a1a2a/ffffff?text=Card"},
  ],
  lucario: "https://placehold.co/300x420/1a1a2a/ffffff?text=Card",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Noto+Sans+JP:wght@400;700;900&display=swap');`;

const BG_LUCARIO = "https://placehold.co/300x420/1a1a2a/ffffff?text=Card";

const IMG_1000COIN = "https://placehold.co/300x420/1a1a2a/ffffff?text=Card";
const IMG_KAKUMEI = "https://placehold.co/300x420/1a1a2a/ffffff?text=Card";

const INVITE_COIN = "https://placehold.co/300x420/1a1a2a/ffffff?text=Card";

const PACKS = [
  { id:1, name:"メガルカリオ ex パック", subtitle:"MEGA LUCARIO EX PACK", price:300, total:160, remaining:160, accent:"#ffd700", bg:"linear-gradient(160deg,#0a1628,#1a2d50)", headerBg:"linear-gradient(135deg,#1565c0,#0d47a1)", tag:"人気No.1", note:"1/8で3等以上確定！", category:"regular",
    prizes:[{rank:"1等",label:"メガルカリオ ex SAR",color:"#ff4488",emoji:"🏆",rarity:"SAR"},{rank:"2等",label:"メガズルズキン / ルリナ / サイトウ 他",color:"#ffd700",emoji:"🥇",rarity:"SR"},{rank:"3等",label:"1,000円相当（SAR,SR,UR,RR,パックなど）",color:"#60b8ff",emoji:"🥈",rarity:"RR"},{rank:"ハズレ",label:"なにかのRRカード",color:"#60b8ff",emoji:"🃏",rarity:"RR"}]},
  { id:2, name:"ピカチュウ ex パック", subtitle:"PIKACHU EX PACK", price:500, total:100, remaining:88, accent:"#ffe066", bg:"linear-gradient(160deg,#1a1400,#3a2e00)", headerBg:"linear-gradient(135deg,#f9a825,#f57f17)", tag:"SAR確率UP", note:"15/100口で確定", category:"recommend",
    prizes:[{rank:"1等",label:"ピカチュウ ex SAR",color:"#ff4488",emoji:"🏆",rarity:"SAR"},{rank:"2等",label:"SR各種",color:"#ffd700",emoji:"🥇",rarity:"SR"},{rank:"3等",label:"RRカード各種",color:"#60b8ff",emoji:"🥈",rarity:"RR"},{rank:"ハズレ",label:"U/Cカード",color:"#555",emoji:"🃏",rarity:"C"}]},
  { id:3, name:"リザードン ex パック", subtitle:"CHARIZARD EX PACK", price:1000, total:50, remaining:41, accent:"#ff6a00", bg:"linear-gradient(160deg,#1a0800,#3a1200)", headerBg:"linear-gradient(135deg,#e64a19,#bf360c)", tag:"高額確定", note:"全口数でR以上確定", category:"recommend",
    prizes:[{rank:"1等",label:"リザードン ex SAR",color:"#ff4488",emoji:"🏆",rarity:"SAR"},{rank:"2等",label:"SAR/SR各種",color:"#ffd700",emoji:"🥇",rarity:"SR"},{rank:"3等",label:"RR以上確定",color:"#60b8ff",emoji:"🥈",rarity:"RR"},{rank:"ハズレ",label:"Rカード",color:"#88ddaa",emoji:"🃏",rarity:"R"}]},
  { id:4, name:"鬼熱決戦ZONE", subtitle:"ONI ATSU ZONE", price:77, total:1000000, remaining:960915, accent:"#ff1493", bg:"linear-gradient(160deg,#1a0010,#3a0030,#1a0010)", headerBg:"linear-gradient(135deg,#6a0dad,#c0392b,#ff1493)", tag:"🔥NEW", note:"1/99でプチュン＆6,000coin以上確定！", category:"recommend", special:true,
    prizes:[{rank:"1等",label:"リーリエ SAR / 高額PSA10",color:"#ff1493",emoji:"🏆",rarity:"SAR"},{rank:"2等",label:"SR/SARカード各種",color:"#ffd700",emoji:"🥇",rarity:"SR"},{rank:"3等",label:"RRカード各種",color:"#60b8ff",emoji:"🥈",rarity:"RR"},{rank:"ハズレ",label:"最低保証2coin",color:"#888",emoji:"🃏",rarity:"C"}]},
];

const RCFG = {
  SAR:{color:"#ff4488",glow:"rgba(255,68,136,0.8)",bg:"linear-gradient(135deg,#8b0050,#ff4488,#ff88cc,#ff4488,#8b0050)",border:"#ff4488",tier:0},
  SR: {color:"#ffd700",glow:"rgba(255,215,0,0.7)",  bg:"linear-gradient(135deg,#7a5500,#ffd700,#fffacd,#ffd700,#7a5500)",border:"#ffd700",tier:1},
  RR: {color:"#60b8ff",glow:"rgba(96,184,255,0.6)", bg:"linear-gradient(135deg,#0a2a5e,#60b8ff,#c0e8ff,#60b8ff,#0a2a5e)",border:"#60b8ff",tier:2},
  R:  {color:"#88ddaa",glow:"rgba(136,221,170,0.4)",bg:"linear-gradient(135deg,#1a4a30,#88ddaa,#c0f0d8,#88ddaa,#1a4a30)",border:"#88ddaa",tier:3},
  U:  {color:"#aaaacc",glow:"rgba(170,170,204,0.3)",bg:"linear-gradient(135deg,#2a2a4a,#aaaacc,#ddddef,#aaaacc,#2a2a4a)",border:"#aaaacc",tier:4},
  C:  {color:"#777788",glow:"rgba(119,119,136,0.2)",bg:"linear-gradient(135deg,#1a1a22,#777788,#aaaaaa,#777788,#1a1a22)",border:"#777788",tier:5},
};

const POOLS = {
  1:[{name:"メガルカリオ ex",rarity:"SAR",image:"🥊✨",chance:1},{name:"ルナーラ ex",rarity:"SR",image:"🌙",chance:6},{name:"ビクティニ",rarity:"RR",image:"✌️",chance:5},{name:"カイリュー",rarity:"RR",image:"🐉",chance:4},{name:"ゲッコウガ",rarity:"RR",image:"🐸",chance:4},{name:"フシギバナ",rarity:"RR",image:"🌿",chance:30},{name:"ゼニガメ",rarity:"RR",image:"🐢",chance:30},{name:"ピカチュウ",rarity:"RR",image:"⚡",chance:40},{name:"コダック",rarity:"RR",image:"🦆",chance:40}],
  2:[{name:"ピカチュウ ex",rarity:"SAR",image:"⚡✨",chance:1},{name:"ライチュウ ex",rarity:"SR",image:"⚡🐭",chance:4},{name:"マスカーニャ ex",rarity:"RR",image:"🌹",chance:10},{name:"コライドン",rarity:"R",image:"🦁",chance:13},{name:"ニャオハ",rarity:"U",image:"🐱",chance:25},{name:"クワッス",rarity:"C",image:"🦆",chance:47}],
  3:[{name:"リザードン ex",rarity:"SAR",image:"🦎🔥",chance:2},{name:"ミュウ ex",rarity:"SR",image:"🌟",chance:6},{name:"リザードン",rarity:"RR",image:"🔥",chance:16},{name:"ブーバー",rarity:"R",image:"🌋",chance:38},{name:"ヤキニク",rarity:"R",image:"🍖",chance:38}],
  4:[{name:"リーリエ SAR",rarity:"SAR",image:"👒✨",chance:0.1},{name:"アセロラ SAR",rarity:"SAR",image:"👻✨",chance:0.1},{name:"クワガノン V SAR",rarity:"SAR",image:"🐛✨",chance:0.1},{name:"ミュウ V SAR",rarity:"SR",image:"🌸",chance:1},{name:"フリーザー V SR",rarity:"SR",image:"❄️",chance:1},{name:"ルナアーラ V SR",rarity:"SR",image:"🌙✨",chance:1},{name:"ピクシー V SR",rarity:"SR",image:"🌟",chance:1},{name:"トゲキッス V RR",rarity:"RR",image:"💫",chance:5},{name:"クレセリア RR",rarity:"RR",image:"🌛",chance:5},{name:"サーナイト RR",rarity:"RR",image:"💚",chance:5},{name:"ハピナス R",rarity:"R",image:"🥚",chance:30},{name:"ピクシー R",rarity:"R",image:"🧚",chance:30},{name:"マリルリ C",rarity:"C",image:"💧",chance:80},{name:"ハネッコ C",rarity:"C",image:"🌸",chance:80}],
};

const BENEFIT_CODES = { "COIN10":{discount:10}, "COIN20":{discount:20}, "VIPCODE":{discount:30} };
const SORT_OPTS = [{id:"default",label:"デフォルト"},{id:"price_asc",label:"金額が安い"},{id:"price_desc",label:"金額が高い"},{id:"remain_asc",label:"残りが少ない"},{id:"remain_desc",label:"残りが多い"},{id:"new",label:"新着"}];

function drawCard(packId, drawnSar=new Set(), drawnSr=new Set()) {
  if(packId === 1){
    const availableSar = REAL_CARDS.sar.filter(c=>!drawnSar.has(c.name));
    const availableSr  = REAL_CARDS.sr.filter(c=>!drawnSr.has(c.name));

    // 出尽くした等は確率0にして総数から除外
    const sarW = availableSar.length > 0 ? 1   : 0;
    const srW  = availableSr.length  > 0 ? 6   : 0;
    const rrW  = 13;
    const hazW = 140;
    const total = sarW + srW + rrW + hazW;

    const r = Math.random() * total;
    if(r < sarW){
      const card = availableSar[Math.floor(Math.random()*availableSar.length)];
      return {...card, isReal:true, prizeRank:"1等"};
    } else if(r < sarW + srW){
      const card = availableSr[Math.floor(Math.random()*availableSr.length)];
      return {...card, isReal:true, prizeRank:"2等"};
    } else if(r < sarW + srW + rrW){
      return {name:"なにかのRRカード",rarity:"RR",image:"🎴", prizeRank:"3等"};
    } else {
      return {name:"なにかのRRカード",rarity:"RR",image:"🎴", prizeRank:"ハズレ"};
    }
  }
  const pool = POOLS[packId];
  const total2 = pool.reduce((s,c)=>s+c.chance,0);
  let rv = Math.random()*total2;
  for(const c of pool){rv-=c.chance;if(rv<=0)return c;}
  return pool[pool.length-1];
}

// ===== 共通：なにかのカード（ハズレ用・赤）=====
function NanikaCard({size=140, showText=true}){
  const h = Math.round(size * 1.4);
  return(
    <div style={{width:size,height:h,borderRadius:12,background:"linear-gradient(135deg,#c0392b,#e74c3c,#c0392b)",border:"3px solid #888",boxShadow:"0 4px 20px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.15),transparent)",borderRadius:"10px 10px 0 0"}}/>
      {[...Array(8)].map((_,i)=><div key={i} style={{position:"absolute",left:"50%",top:"50%",width:2,height:"120%",background:"rgba(255,255,255,0.1)",transformOrigin:"top center",transform:`rotate(${i*45}deg)`}}/>)}
      <div style={{fontSize:size*0.38,color:"rgba(255,255,255,0.9)",textShadow:"0 0 20px rgba(255,255,255,0.5)",fontWeight:900,zIndex:2}}>？</div>
      {showText&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.75)",padding:"8px 6px",textAlign:"center",zIndex:2}}>
        <div style={{color:"#ff9999",fontSize:size*0.075,fontWeight:900}}>なにかのカード</div>
        <div style={{color:"rgba(255,255,255,0.65)",fontSize:size*0.058,marginTop:2,lineHeight:1.4}}>発送すると対応するカードが<br/>ランダムで1点届きます</div>
      </div>}
    </div>
  );
}

// ===== 共通：なにかのカード（3等用・青）=====
function SantouCard({size=140, showText=true}){
  const h = Math.round(size * 1.4);
  return(
    <div style={{width:size,height:h,borderRadius:12,background:"linear-gradient(135deg,#1a3a6e,#2266cc,#1a3a6e)",border:"3px solid #60b8ff",boxShadow:"0 4px 20px rgba(96,184,255,0.4)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.15),transparent)",borderRadius:"10px 10px 0 0"}}/>
      {[...Array(8)].map((_,i)=><div key={i} style={{position:"absolute",left:"50%",top:"50%",width:2,height:"120%",background:"rgba(255,255,255,0.1)",transformOrigin:"top center",transform:`rotate(${i*45}deg)`}}/>)}
      <div style={{fontSize:size*0.38,color:"rgba(255,255,255,0.9)",textShadow:"0 0 20px rgba(255,255,255,0.5)",fontWeight:900,zIndex:2}}>？</div>
      {showText&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.75)",padding:"8px 6px",textAlign:"center",zIndex:2}}>
        <div style={{color:"#60b8ff",fontSize:size*0.075,fontWeight:900}}>1,000円相当</div>
        <div style={{color:"rgba(255,255,255,0.65)",fontSize:size*0.058,marginTop:2,lineHeight:1.4}}>SAR,SR,UR,RR,パックなど<br/>ランダムで1点届きます</div>
      </div>}
    </div>
  );
}

// ===== CardReveal =====
function CardReveal({card,pack,onClose,onConfirm,onRedeem}){
  const prize=card.prizeRank
    ? pack.prizes.find(p=>p.rank===card.prizeRank)
    : pack.prizes.find(p=>p.rarity===card.rarity);
  const effectiveRank=card.prizeRank||(prize?.rank);
  const rankNum=effectiveRank==="1等"?1:effectiveRank==="2等"?2:effectiveRank==="3等"?3:effectiveRank==="ハズレ"?0:4;
  const isPuchun=rankNum>=1&&rankNum<=3;
  const isRedCD=rankNum>=1&&rankNum<=3;
  const cdColor=isRedCD?"#ff2244":"#2266ff";
  const cdGlow=isRedCD?"rgba(255,34,68,0.8)":"rgba(34,102,255,0.8)";
  const cdBg=isRedCD?"radial-gradient(ellipse 80% 80% at 50% 50%,#3a0010,#000)":"radial-gradient(ellipse 80% 80% at 50% 50%,#00103a,#000)";
  const cs=rankNum===1?{bg:"linear-gradient(135deg,#ff0080,#ff8800,#ffff00,#00ff80,#0080ff,#8800ff,#ff0080)",border:"#fff",glow:"rgba(255,255,255,0.9)",label:"1等",shimmer:true,rainbow:true}
    :rankNum===2?{bg:"linear-gradient(135deg,#3a2200,#ffd700,#fff0a0,#ffb800,#ffd700,#3a2200)",border:"#ffd700",glow:"rgba(255,215,0,0.9)",label:"2等",shimmer:true,rainbow:false}
    :rankNum===3?{bg:"linear-gradient(135deg,#4a0010,#ff2244,#ff88aa,#ff2244,#4a0010)",border:"#ff2244",glow:"rgba(255,34,68,0.7)",label:"3等",shimmer:true,rainbow:false}
    :rankNum===4?{bg:"linear-gradient(135deg,#001040,#2266ff,#88aaff,#2266ff,#001040)",border:"#2266ff",glow:"rgba(34,102,255,0.6)",label:"4等",shimmer:false,rainbow:false}
    :{bg:"linear-gradient(135deg,#111,#444,#888,#444,#111)",border:"#555",glow:"rgba(100,100,100,0.3)",label:"ハズレ",shimmer:false,rainbow:false};

  const [phase,setPhase]=useState("countdown");
  const [count,setCount]=useState(3);
  const [revealed,setRevealed]=useState(!isPuchun);
  const [tilt,setTilt]=useState({x:0,y:0});
  const cardRef=useRef(null);
  const timers=useRef([]);

  const skip=()=>{timers.current.forEach(clearTimeout);setPhase("done");};

  useEffect(()=>{
    if(isPuchun){
      const r=Math.random();
      const cutAt=r<0.2?3:r<0.8?2:1;
      const starts={3:0,2:3000,1:6000};
      const delay=starts[cutAt]+1000+Math.random()*1500;
      const ts=[];
      if(cutAt<=2)ts.push(setTimeout(()=>setCount(2),3000));
      if(cutAt<=1)ts.push(setTimeout(()=>setCount(1),6000));
      ts.push(setTimeout(()=>setPhase("puchun_cut"),delay));
      ts.push(setTimeout(()=>setPhase("puchun_slam"),delay+600));
      ts.push(setTimeout(()=>setPhase("done"),delay+2800));
      timers.current=ts;
    }else{
      const ts=[
        setTimeout(()=>setCount(2),3000),
        setTimeout(()=>setCount(1),6000),
        setTimeout(()=>setPhase("flash"),9000),
        setTimeout(()=>setPhase("card"),9350),
        setTimeout(()=>setPhase("done"),10100),
      ];
      timers.current=ts;
    }
    return()=>timers.current.forEach(clearTimeout);
  },[]);

  const pts=useMemo(()=>[...Array(rankNum>=1&&rankNum<=3?40:0)].map((_,i)=>({id:i,x:Math.random()*100,y:50+Math.random()*50,size:2+Math.random()*5,dur:1.2+Math.random()*2,delay:Math.random()*1.5})),[rankNum]);
  const stars=useMemo(()=>[...Array(rankNum<=2?20:0)].map((_,i)=>({id:i,x:5+Math.random()*90,y:5+Math.random()*90,s:10+Math.random()*14,dur:0.8+Math.random()*1.2,delay:Math.random()*2})),[rankNum]);

  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,overflow:"hidden",background:phase==="flash"?"#fff":phase==="countdown"?cdBg:phase==="puchun_cut"?"#fff":"rgba(4,4,14,0.99)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"background 0.4s"}}>
      <style>{`
        @keyframes cd-pop{0%{transform:scale(2.5);opacity:0;filter:blur(12px)}40%{transform:scale(0.88);opacity:1;filter:blur(0)}100%{transform:scale(1);opacity:1}}
        @keyframes cd-ring{0%{transform:scale(0.4);opacity:1}100%{transform:scale(2.4);opacity:0}}
        @keyframes gp{0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes cdrop{0%{transform:translateY(-120px) scale(0.7) rotateX(40deg);opacity:0}60%{transform:translateY(12px) scale(1.04) rotateX(-4deg);opacity:1}80%{transform:translateY(-6px) scale(0.98)}100%{transform:translateY(0) scale(1) rotateX(0);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes rpop{0%{transform:scale(0) rotate(-8deg);opacity:0}60%{transform:scale(1.2) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes rainbow{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
        @keyframes shim{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes pup{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-200px) scale(0);opacity:0}}
        @keyframes stw{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
        @keyframes pcup{0%{transform:translateY(110%) scale(0.85);opacity:0}55%{transform:translateY(-8%) scale(1.03);opacity:1}75%{transform:translateY(3%) scale(0.98)}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes spline{0%{transform:scaleX(0);opacity:1}100%{transform:scaleX(1);opacity:0}}
        @keyframes shake{0%,100%{transform:translate(0,0)}10%{transform:translate(-14px,-6px)}25%{transform:translate(12px,8px)}40%{transform:translate(-9px,-10px)}55%{transform:translate(10px,6px)}70%{transform:translate(-6px,-4px)}}
        @keyframes pglow{0%{transform:scale(0.3);opacity:1}100%{transform:scale(3);opacity:0}}
        @keyframes halo{0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.2);opacity:0}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>

      {phase==="countdown"&&(
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
          <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${cdColor}22,transparent 70%)`,animation:"gp 0.9s ease-in-out infinite",pointerEvents:"none"}}/>
          {[0,0.3,0.6].map((d,i)=><div key={i} style={{position:"absolute",width:260,height:260,borderRadius:"50%",border:`3px solid ${cdColor}`,animation:`cd-ring 1s ease-out ${d}s infinite`,pointerEvents:"none"}}/>)}
          <button onClick={skip} style={{position:"absolute",bottom:36,right:36,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.45)",padding:"8px 22px",borderRadius:30,fontSize:12,cursor:"pointer",zIndex:10,fontFamily:"'Noto Sans JP',sans-serif"}}>スキップ →</button>
          <div key={count} style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:220,lineHeight:1,color:cdColor,textShadow:`0 0 60px ${cdGlow},0 0 120px ${cdGlow}`,animation:"cd-pop 0.55s cubic-bezier(0.175,0.885,0.32,1.275) both",userSelect:"none",zIndex:2}}>{count}</div>
        </div>
      )}

      {phase==="flash"&&<div style={{fontSize:80}}>✨</div>}

      {phase==="puchun_cut"&&<div style={{position:"absolute",inset:0,background:"#fff"}}/>}

      {phase==="puchun_slam"&&(
        <div style={{position:"absolute",inset:0,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",animation:"shake 0.5s ease-out both",overflow:"hidden"}}>
          {[...Array(24)].map((_,i)=><div key={i} style={{position:"absolute",left:"50%",top:"50%",width:"60vw",height:i%3===0?4:i%3===1?2:1,background:`linear-gradient(90deg,transparent,${cs.border}cc,${cs.border})`,transformOrigin:"left center",transform:`rotate(${i*15}deg)`,animation:`spline 0.35s ease-out ${i*0.005}s both`}}/>)}
          <div style={{position:"absolute",width:"80vw",height:"80vw",borderRadius:"50%",background:`radial-gradient(circle,${cs.glow},transparent 65%)`,animation:"pglow 0.5s ease-out both",pointerEvents:"none"}}/>
          <div style={{width:"min(68vw,340px)",height:"min(95vw,476px)",borderRadius:20,background:cs.bg,border:`4px solid ${cs.border}`,boxShadow:`0 0 60px ${cs.glow},0 0 120px ${cs.glow}`,animation:"pcup 0.55s cubic-bezier(0.22,1,0.36,1) both",position:"relative",overflow:"hidden",zIndex:10}}>
            {cs.shimmer&&<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.3) 40%,rgba(255,255,255,0.08) 58%,transparent 75%)",backgroundSize:"300% 300%",animation:cs.rainbow?"rainbow 1.5s linear infinite,shim 2s linear infinite":"shim 2s linear infinite"}}/>}
            <div style={{position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(180deg,rgba(255,255,255,0.15),transparent)",borderRadius:"18px 18px 0 0"}}/>
          </div>
        </div>
      )}

      {(phase==="card"||phase==="done")&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative",width:"100%"}}>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:`radial-gradient(ellipse 60% 55% at 50% 42%,${cs.glow},transparent 65%)`,animation:"gp 2s ease-in-out infinite"}}/>
          {rankNum===1&&<div style={{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(135deg,#ff000033,#ff880022,#ffff0022,#00ff8822,#0088ff22,#8800ff22)",animation:"rainbow 2.5s linear infinite"}}/>}
          {phase==="done"&&pts.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,borderRadius:"50%",background:rankNum===1?`hsl(${p.id*18},100%,65%)`:cs.border,animation:`pup ${p.dur}s ease-out ${p.delay}s infinite`,pointerEvents:"none"}}/>)}
          {phase==="done"&&stars.map(s=><div key={s.id} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,fontSize:s.s,color:rankNum===1?`hsl(${s.id*18},100%,70%)`:cs.border,animation:`stw ${s.dur}s ease-in-out ${s.delay}s infinite`,pointerEvents:"none"}}>✦</div>)}
          {phase==="done"&&revealed&&(
            <div style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,fontSize:rankNum===1?30:rankNum===2?26:22,color:rankNum===1?"#fff":cs.border,textShadow:`0 0 40px ${cs.glow}`,marginBottom:16,letterSpacing:2,position:"relative",zIndex:10,animation:"rpop 0.55s cubic-bezier(0.175,0.885,0.32,1.275) both",background:rankNum===1?"linear-gradient(90deg,#ff4488,#ffd700,#44ff88,#44aaff,#ff4488)":"none",WebkitBackgroundClip:rankNum===1?"text":"unset",WebkitTextFillColor:rankNum===1?"transparent":"unset",backgroundSize:"200% auto"}}>
              {rankNum===1?"🌈 1等 当選！ 🌈":rankNum===2?"🥇 2等 当選！":rankNum===3?"🎖 3等 当選！":rankNum===4?"4等":"またチャレンジしよう…"}
            </div>
          )}
          <div ref={cardRef} onMouseMove={e=>{if(!cardRef.current||phase!=="done")return;const r=cardRef.current.getBoundingClientRect();setTilt({x:((e.clientY-r.top)/r.height-0.5)*18,y:-((e.clientX-r.left)/r.width-0.5)*18});}} onMouseLeave={()=>setTilt({x:0,y:0})}
            style={{width:240,height:336,borderRadius:18,position:"relative",overflow:"hidden",background:cs.bg,border:`3px solid ${cs.border}`,boxShadow:phase==="done"?`0 0 80px ${cs.glow},0 0 160px ${cs.glow}55,0 30px 80px rgba(0,0,0,0.95)`:`0 0 40px ${cs.glow}88`,animation:phase==="card"?"cdrop 0.65s cubic-bezier(0.175,0.885,0.32,1.275) both":phase==="done"?"float 3s ease-in-out infinite":"none",transform:phase==="done"?`rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`:undefined,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:10}}>
            {cs.shimmer&&<div style={{position:"absolute",inset:0,pointerEvents:"none",background:cs.rainbow?"linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.3) 40%,rgba(255,255,255,0.1) 55%,transparent 70%)":"linear-gradient(135deg,transparent 25%,rgba(255,255,255,0.2) 45%,rgba(255,255,255,0.05) 55%,transparent 75%)",backgroundSize:"300% 300%",animation:cs.rainbow?"rainbow 2s linear infinite,shim 2.5s linear infinite":"shim 2.5s linear infinite"}}/>}
            <div style={{position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(180deg,rgba(255,255,255,0.12),transparent)",borderRadius:"16px 16px 0 0",pointerEvents:"none"}}/>
            {rankNum===1&&phase==="done"&&revealed&&[0,0.4,0.8].map((d,i)=><div key={i} style={{position:"absolute",width:"100%",height:"100%",borderRadius:16,border:"3px solid rgba(255,255,255,0.6)",animation:`halo 1.5s ease-out ${d}s infinite`,pointerEvents:"none"}}/>)}
            {revealed&&(card.isReal
              ? <img src={card.img} alt={card.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,borderRadius:16,zIndex:2}}/>
              : card.prizeRank==="ハズレ"||(!card.prizeRank&&prize?.rank==="ハズレ")
                ? <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
                    <NanikaCard size={220} showText={true}/>
                  </div>
                : card.prizeRank==="3等"||(!card.prizeRank&&prize?.rank==="3等")
                ? <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
                    <SantouCard size={220} showText={true}/>
                  </div>
                : <>
                    <div style={{fontSize:90,filter:rankNum<=2?`drop-shadow(0 0 28px ${cs.border}) drop-shadow(0 0 56px ${cs.glow})`:rankNum===3?`drop-shadow(0 0 16px ${cs.border})`:"none",marginBottom:8,zIndex:2}}>{card.image}</div>
                    <div style={{color:"#fff",fontFamily:"'Noto Sans JP',sans-serif",fontSize:14,fontWeight:700,textAlign:"center",padding:"0 18px",textShadow:"0 2px 16px rgba(0,0,0,0.95)",lineHeight:1.4,zIndex:2}}>{card.name}</div>
                    <div style={{marginTop:12,zIndex:2,background:"rgba(0,0,0,0.5)",borderRadius:8,padding:"5px 18px",fontFamily:"'Cinzel',serif",fontSize:14,color:cs.border,letterSpacing:4,border:`1px solid ${cs.border}66`}}>{cs.label}</div>
                  </>
            )}
          </div>
          {phase==="done"&&(
            <div style={{textAlign:"center",marginTop:20,zIndex:10}}>
              <div style={{color:"#444",fontSize:11,marginBottom:4}}>{card.name} [{card.rarity}]</div>
              {revealed
                ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginTop:8}}>
                  <button onClick={onClose} style={{background:"transparent",border:`1px solid ${cs.border}55`,color:cs.border,padding:"11px 56px",borderRadius:40,fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:4,cursor:"pointer"}} onMouseEnter={e=>e.target.style.background=`${cs.border}18`} onMouseLeave={e=>e.target.style.background="transparent"}>CLOSE</button>
                  {onRedeem&&<button onClick={()=>onRedeem(card)} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"10px 32px",borderRadius:40,fontSize:13,fontWeight:900,cursor:"pointer"}}>🪙 コインに還元</button>}
                </div>
                :<button onClick={()=>onConfirm?onConfirm():onClose()} style={{marginTop:8,background:cs.border,border:"none",color:"#000",padding:"14px 48px",borderRadius:40,fontFamily:"'Noto Sans JP',sans-serif",fontSize:14,fontWeight:900,cursor:"pointer"}} onMouseEnter={e=>e.target.style.opacity="0.85"} onMouseLeave={e=>e.target.style.opacity="1"}>カードを確認する →</button>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== MultiReveal =====
function MultiReveal({cards,pack,onClose,onRedeem,onShip}){
  const [shown,setShown]=useState(0);
  const [checked,setChecked]=useState(new Set());
  useEffect(()=>{
    if(shown>=cards.length)return;
    const t=setTimeout(()=>setShown(s=>s+1),120);
    return()=>clearTimeout(t);
  },[shown,cards.length]);

  const toggleCheck=(i)=>{
    setChecked(prev=>{
      const next=new Set(prev);
      next.has(i)?next.delete(i):next.add(i);
      return next;
    });
  };
  const toggleAll=()=>{
    if(checked.size===cards.length) setChecked(new Set());
    else setChecked(new Set(cards.map((_,i)=>i)));
  };

  const hasChecked=checked.size>0;

  const getInfo=(card)=>{
    const rank=card.prizeRank||(pack.prizes.find(p=>p.rarity===card.rarity)?.rank);
    const isHazure=rank==="ハズレ";
    const is3=rank==="3等";
    const coinVal=rank==="1等"?"10,000":rank==="2等"?"2,000":rank==="3等"?"1,000":"1";
    return{rank,isHazure,is3,coinVal};
  };

  const getCoinNum=(coinVal)=>parseInt(coinVal.replace(/,/g,""))||0;

  const wins=cards.filter(c=>c.prizeRank==="1等"||c.prizeRank==="2等");
  const best=wins.sort((a,b)=>a.prizeRank==="1等"?-1:1)[0];

  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"#f0f0f0",display:"flex",flexDirection:"column",fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* ヘッダー */}
      <div style={{background:"#fff",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #eee",flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.05)"}}>
        <div style={{fontWeight:900,fontSize:16,color:"#111"}}>獲得カード一覧</div>
        {best&&<div style={{background:"#d94f6e",borderRadius:20,padding:"4px 16px",color:"#fff",fontWeight:900,fontSize:13}}>🎉 {best.prizeRank} 当選！</div>}
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>✕</button>
      </div>

      {/* カードリスト */}
      <div style={{flex:1,overflow:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {cards.slice(0,shown).map((card,i)=>{
          const {rank,isHazure,is3,coinVal}=getInfo(card);
          const isChecked=checked.has(i);
          return(
            <div key={i} onClick={()=>toggleCheck(i)} style={{background:"#fff",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 8px rgba(0,0,0,0.08)",cursor:"pointer",border:`2px solid ${isChecked?"#d94f6e":"transparent"}`,transition:"border 0.15s"}}>
              <div style={{width:90,height:126,flexShrink:0,borderRadius:8,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
                {isHazure?<NanikaCard size={90} showText={true}/>
                  :is3?<SantouCard size={90} showText={true}/>
                  :card.isReal?<img src={card.img} alt={card.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div style={{width:"100%",height:"100%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{card.image}</div>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{color:"#111",fontWeight:900,fontSize:14,marginBottom:6,lineHeight:1.3}}>
                  {isHazure||is3?"なにかのカード-ポケモン":card.name}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000"}}>C</div>
                  <span style={{fontWeight:900,fontSize:20,color:"#111"}}>{coinVal}</span>
                </div>
                {rank&&rank!=="ハズレ"&&(
                  <div style={{display:"inline-block",background:rank==="1等"?"linear-gradient(135deg,#ffd700,#ff9020)":rank==="2等"?"linear-gradient(135deg,#ffd700,#b8860b)":"linear-gradient(135deg,#60b8ff,#1a5fc8)",borderRadius:20,padding:"2px 10px",color:"#000",fontWeight:900,fontSize:11}}>{rank}</div>
                )}
              </div>
              <div style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${isChecked?"#d94f6e":"#ddd"}`,background:isChecked?"#d94f6e":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                {isChecked&&<span style={{color:"#fff",fontSize:14,fontWeight:900}}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div style={{background:"#fff",borderTop:"1px solid #eee",padding:"12px 20px 28px",flexShrink:0}}>
        <div style={{color:"#aaa",fontSize:11,marginBottom:10,textAlign:"center"}}>未発送のアイテムは24時間後にサービス内通貨に還元されます</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#888",fontSize:13,fontWeight:700}}>全ての合計</span>
          <div onClick={toggleAll} style={{color:"#888",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${checked.size===cards.length?"#d94f6e":"#ddd"}`,background:checked.size===cards.length?"#d94f6e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
              {checked.size===cards.length&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
            </div>
            全て選択
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#000"}}>C</div>
          <span style={{fontWeight:900,fontSize:22,color:"#111"}}>
            {hasChecked
              ? [...checked].reduce((s,i)=>s+getCoinNum(getInfo(cards[i]).coinVal),0).toLocaleString()
              : "0"
            }
          </span>
        </div>
        <div style={{display:"flex",gap:10}}>
          {/* 発送ボタン */}
          <button disabled={!hasChecked} onClick={()=>{
            if(!hasChecked)return;
            onShip&&onShip(checked,cards);
          }} style={{flex:1,background:hasChecked?"#555":"#ccc",border:"none",color:"#fff",padding:"14px",borderRadius:30,fontWeight:900,fontSize:13,cursor:hasChecked?"pointer":"not-allowed",lineHeight:1.4,transition:"background 0.2s"}}>
            選んで発送<br/><span style={{fontSize:10,fontWeight:400,opacity:0.8}}>({checked.size}/{cards.length}枚選択)</span>
          </button>
          {/* 還元ボタン */}
          <button disabled={!hasChecked} onClick={()=>{
            if(!hasChecked)return;
            let total=0;
            checked.forEach(i=>{
              const {coinVal}=getInfo(cards[i]);
              total+=getCoinNum(coinVal);
            });
            onRedeem&&onRedeem(total,checked,cards);
          }} style={{flex:1.5,background:hasChecked?"#d94f6e":"#f0a0b0",border:"none",color:"#fff",padding:"14px",borderRadius:30,fontWeight:900,fontSize:16,cursor:hasChecked?"pointer":"not-allowed",transition:"background 0.2s"}}>
            還元する
          </button>
        </div>
        <div style={{textAlign:"center",color:"#aaa",fontSize:11,marginTop:8}}>🪙 合計1,000ボーナスコイン以上で送料無料！</div>
      </div>
    </div>
  );
}

// ===== PackDetail =====
function PackDetail({pack,onClose,onDraw,onMultiDraw}){
  const [tab,setTab]=useState("1等");
  const pct=Math.round((pack.remaining/pack.total)*100);
  const d10=Math.min(10,pack.remaining);
  const d100=Math.min(100,pack.remaining);
  const ok=pack.remaining>0;
  const ap=pack.prizes.find(p=>p.rank===tab);
  const poolCards=(POOLS[pack.id]||[]).filter(c=>{
    if(tab==="ハズレ")return RCFG[c.rarity]?.tier>=4;
    if(tab==="1等")return c.rarity==="SAR";
    if(tab==="2等")return c.rarity==="SR";
    if(tab==="3等")return ["RR","R"].includes(c.rarity);
    if(tab==="4等")return c.rarity==="U";
    return false;
  });
  return(
    <div style={{position:"fixed",inset:0,zIndex:1500,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",flexDirection:"column",fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#0c0c1a",overflowY:"auto",maxWidth:600,width:"100%",margin:"0 auto"}}>
        <div style={{background:pack.headerBg,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={onClose} style={{background:"rgba(0,0,0,0.3)",border:"none",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:10}}>{pack.subtitle}</div><div style={{color:"#fff",fontWeight:900,fontSize:15}}>{pack.name}</div></div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #1a1a2a",background:"#0e0e1a",flexShrink:0,overflowX:"auto"}}>
          {pack.prizes.map(pr=>{const ia=tab===pr.rank;return(<button key={pr.rank} onClick={()=>setTab(pr.rank)} style={{flex:"0 0 auto",padding:"12px 18px",background:"transparent",border:"none",borderBottom:ia?`3px solid ${pr.color}`:"3px solid transparent",color:ia?pr.color:"#555",fontWeight:ia?900:400,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>{pr.rank}</button>);})}
        </div>
        {ap&&<div style={{margin:"16px 16px 8px",padding:"14px 16px",background:`${ap.color}11`,border:`1px solid ${ap.color}33`,borderRadius:12,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <span style={{fontSize:28}}>{ap.emoji}</span>
          <div><div style={{color:ap.color,fontWeight:900,fontSize:16}}>{ap.rank}</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:2}}>{ap.label}</div></div>
        </div>}

        {/* 等級ごとのカード画像 */}
        <div style={{padding:"0 16px 8px",flexShrink:0}}>
          {tab==="1等"&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"8px 0"}}>
              {REAL_CARDS.sar.map((c,i)=>(
                <div key={i} style={{textAlign:"center",width:"80%",maxWidth:280}}>
                  <img src={c.img} alt={c.name} style={{width:"100%",borderRadius:12,boxShadow:"0 0 24px rgba(255,68,136,0.6),0 8px 32px rgba(0,0,0,0.6)"}}/>
                  <div style={{color:"#ccc",fontSize:11,marginTop:8,fontWeight:700}}>{c.name}</div>
                  <div style={{color:"#ff4488",fontSize:10,marginTop:2}}>{c.rarity}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="2等"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {REAL_CARDS.sr.map((c,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <img src={c.img} alt={c.name} style={{width:"100%",borderRadius:8,boxShadow:"0 0 8px rgba(255,215,0,0.4)"}}/>
                  <div style={{color:"#ccc",fontSize:9,marginTop:4,lineHeight:1.3}}>{c.name}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="3等"&&(
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <SantouCard size={140} showText={true}/>
            </div>
          )}
          {tab==="ハズレ"&&(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <NanikaCard size={140} showText={true}/>
            </div>
          )}
        </div>
        <div style={{padding:"14px 16px",background:"#0e0e1a",borderTop:"1px solid #1a1a2a",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{color:"#555",fontSize:10}}>🪙</span><span style={{color:"#fff",fontWeight:900,fontSize:20}}>{pack.price.toLocaleString()}</span><span style={{color:"#555",fontSize:10}}>/1回</span></div>
            <span style={{color:pack.accent,fontWeight:700,fontSize:12}}>残り {pack.remaining}/{pack.total}口</span>
          </div>
          <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:5,overflow:"hidden",marginBottom:12}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${pack.accent}88,${pack.accent})`,borderRadius:4}}/></div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{onDraw(pack);onClose();}} disabled={!ok} style={{flex:1,background:"#444",border:"none",color:"#fff",padding:"13px 0",borderRadius:10,fontWeight:900,fontSize:13,cursor:ok?"pointer":"not-allowed"}}>1回引く</button>
            <button onClick={()=>{onMultiDraw(pack,d10);onClose();}} disabled={!ok} style={{flex:1.4,background:"#d94f6e",border:"none",color:"#fff",padding:"13px 0",borderRadius:10,fontWeight:900,fontSize:13,cursor:ok?"pointer":"not-allowed"}}>{d10}回引く</button>
            <button onClick={()=>{onMultiDraw(pack,d100);onClose();}} disabled={!ok} style={{flex:1.8,background:"#c0392b",border:"none",color:"#fff",padding:"13px 0",borderRadius:10,fontWeight:900,fontSize:14,cursor:ok?"pointer":"not-allowed"}}>{d100}回引く</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PackCard =====
function PackCard({pack,onDraw,onMultiDraw,onDetail}){
  const [hover,setHover]=useState(false);
  const pct=Math.round((pack.remaining/pack.total)*100);
  const d10=Math.min(10,pack.remaining);
  const d100=Math.min(100,pack.remaining);
  const d1000=Math.min(1000,pack.remaining);
  const ok=pack.remaining>0;

  // 鬼熱決戦ZONE専用デザイン
  if(pack.special){
    return(
      <div style={{borderRadius:20,overflow:"hidden",border:"2px solid #ff1493",boxShadow:`0 0 40px rgba(255,20,147,0.5),0 0 80px rgba(255,20,147,0.2)`,background:"#0a0010",gridColumn:"1 / -1"}}>
        {/* ヘッダービジュアル */}
        <div onClick={onDetail} style={{
          position:"relative",cursor:"pointer",overflow:"hidden",
          background:"linear-gradient(135deg,#1a0030 0%,#4a0060 30%,#8b0000 60%,#1a0030 100%)",
          padding:"24px 20px 20px",
        }}>
          {/* キラキラ背景 */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 40%,rgba(255,20,147,0.3),transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(45deg,transparent 30%,rgba(255,215,0,0.08) 50%,transparent 70%)",backgroundSize:"20px 20px",pointerEvents:"none"}}/>

          {/* 右上タグ */}
          <div style={{position:"absolute",top:0,right:0,background:"linear-gradient(135deg,#8b0000,#ff1493)",padding:"6px 16px 6px 24px",borderRadius:"0 0 0 20px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:12}}>🎬</span>
            <span style={{color:"#fff",fontSize:11,fontWeight:900,letterSpacing:1}}>鬼熱フリーズ(バイブ)</span>
          </div>

          {/* 還元率バッジ */}
          <div style={{position:"absolute",top:40,left:16,background:"linear-gradient(135deg,#ffd700,#ff9020)",borderRadius:12,padding:"6px 10px",textAlign:"center",boxShadow:"0 4px 12px rgba(255,215,0,0.5)"}}>
            <div style={{color:"#000",fontSize:8,fontWeight:900}}>還元率</div>
            <div style={{color:"#000",fontSize:22,fontWeight:900,lineHeight:1}}>97%</div>
            <div style={{color:"#000",fontSize:8,fontWeight:900}}>OVER</div>
          </div>

          {/* メインタイトル */}
          <div style={{textAlign:"center",marginTop:8}}>
            <div style={{color:"#fff",fontSize:12,fontWeight:700,marginBottom:4,textShadow:"0 0 10px rgba(255,20,147,0.8)"}}>
              1/999の確率で<span style={{color:"#ffd700",fontSize:14}}>2等以上確定！！</span>
            </div>
            {/* 鬼熱決戦ZONE テキスト */}
            <div style={{
              fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,
              fontSize:"clamp(28px,8vw,48px)",lineHeight:1,
              background:"linear-gradient(135deg,#ff1493,#ff6600,#ffd700,#ff6600,#ff1493)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              backgroundSize:"300% auto",animation:"shimmer 3s linear infinite",
              textShadow:"none",filter:"drop-shadow(0 0 20px rgba(255,20,147,0.8))",
              paddingLeft:60,
            }}>
              鬼熱決戦<br/>ZONE
            </div>

            {/* カードの雰囲気演出 */}
            <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:10,marginBottom:8,overflow:"hidden"}}>
              {["👒","🌸","❄️","💫","🌙","🌟","🥚","💚","🌛","🧚"].map((e,i)=>(
                <div key={i} style={{
                  width:32,height:44,borderRadius:4,
                  background:`linear-gradient(135deg,hsl(${i*36},80%,30%),hsl(${i*36+30},90%,50%))`,
                  border:"1px solid rgba(255,215,0,0.6)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,
                  boxShadow:`0 2px 8px rgba(255,215,0,0.3)`,
                  transform:`rotate(${(i-5)*3}deg) translateY(${Math.abs(i-5)*2}px)`,
                  flexShrink:0,
                }}>{e}</div>
              ))}
            </div>

            <div style={{color:"#fff",fontSize:11,fontWeight:700,marginTop:4,textShadow:"0 0 8px rgba(255,20,147,0.8)"}}>
              1/99の確率で<span style={{color:"#ff1493",fontWeight:900}}>プチュン</span>＆
              <span style={{color:"#ffd700",fontSize:13,fontWeight:900}}> 6,000coin以上確定！！</span>
            </div>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,marginTop:2}}>最低保証2coin</div>
          </div>
        </div>

        {/* 下部：価格・残り・ボタン */}
        <div style={{background:"linear-gradient(180deg,#0d0018,#000)",padding:"16px 18px"}}>
          {/* 残り口数 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#000"}}>C</div>
              <span style={{color:"#fff",fontWeight:900,fontSize:22}}>{pack.price}</span>
              <span style={{color:"rgba(255,255,255,0.5)",fontSize:11}}>/1回</span>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#fff",fontWeight:900,fontSize:16}}>残り{pack.remaining.toLocaleString()} / {pack.total.toLocaleString()}</div>
              <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:8,marginTop:4,overflow:"hidden",width:180}}>
                <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#2ecc71,#27ae60)",borderRadius:4}}/>
              </div>
            </div>
          </div>

          {/* ボタン群 */}
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <button onClick={()=>onDraw(pack)} disabled={!ok} style={{flex:1,background:"#555",border:"none",color:"#fff",padding:"14px 0",borderRadius:10,fontFamily:"'Noto Sans JP',sans-serif",fontSize:14,fontWeight:900,cursor:ok?"pointer":"not-allowed"}}>1回引く</button>
            <button onClick={()=>ok&&onMultiDraw(pack,d10)} disabled={!ok} style={{flex:1.5,background:"linear-gradient(135deg,#d94f6e,#ff1493)",border:"none",color:"#fff",padding:"14px 0",borderRadius:10,fontFamily:"'Noto Sans JP',sans-serif",fontSize:15,fontWeight:900,cursor:ok?"pointer":"not-allowed",boxShadow:"0 4px 16px rgba(255,20,147,0.4)"}}>10回引く</button>
            <button onClick={()=>ok&&onMultiDraw(pack,d100)} disabled={!ok} style={{flex:1.8,background:"linear-gradient(135deg,#c0392b,#e74c3c)",border:"none",color:"#fff",padding:"14px 0",borderRadius:10,fontFamily:"'Noto Sans JP',sans-serif",fontSize:15,fontWeight:900,cursor:ok?"pointer":"not-allowed",boxShadow:"0 4px 16px rgba(231,76,60,0.4)"}}>100回引く</button>
          </div>
          <button onClick={()=>ok&&onMultiDraw(pack,d1000)} disabled={!ok} style={{width:"100%",background:"linear-gradient(135deg,#ff9020,#ffd700,#ff9020)",border:"none",color:"#000",padding:"16px 0",borderRadius:12,fontFamily:"'Noto Sans JP',sans-serif",fontSize:20,fontWeight:900,cursor:ok?"pointer":"not-allowed",boxShadow:"0 6px 24px rgba(255,215,0,0.5)",backgroundSize:"200% auto",animation:"shimmer 2s linear infinite"}}>
            1,000回引く
          </button>
        </div>
      </div>
    );
  }
  // 通常パック
  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{borderRadius:18,overflow:"hidden",border:`1px solid ${pack.accent}33`,transition:"all 0.3s",transform:hover?"translateY(-6px)":"translateY(0)",boxShadow:hover?`0 24px 64px rgba(0,0,0,0.7),0 0 40px ${pack.accent}22`:"0 6px 24px rgba(0,0,0,0.5)",background:"#0a0a16"}}>
      {/* オリパ風ヘッダー */}
      <div onClick={onDetail} style={{position:"relative",cursor:"pointer",overflow:"hidden",background:`url("${BG_LUCARIO}") center/cover`}}>

        {/* 光沢オーバーレイのみ */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.1) 50%,transparent 70%)",backgroundSize:"200% 200%",animation:"shimmer 3s linear infinite"}}/>

        <div style={{position:"relative",zIndex:2,padding:"12px 12px 10px"}}>
          {/* 上段：還元率バッジ＋タイトル */}
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
            {/* 還元率バッジ */}
            <div style={{background:"linear-gradient(135deg,#1a0a00,#3a1a00)",border:"3px solid #ff9020",borderRadius:10,padding:"4px 8px",textAlign:"center",flexShrink:0}}>
              <div style={{color:"#ffd700",fontSize:8,fontWeight:900,lineHeight:1}}>還元率</div>
              <div style={{background:"linear-gradient(135deg,#ff4400,#ffd700,#ff4400)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:26,fontWeight:900,lineHeight:1,fontFamily:"'Noto Sans JP',sans-serif"}}>97%</div>
              <div style={{color:"#ffd700",fontSize:8,fontWeight:900,lineHeight:1}}>OVER!!</div>
            </div>

            {/* 中央：メインビジュアル（カード＋タイトル） */}
            <div style={{flex:1,display:"flex",gap:8,alignItems:"center"}}>
              {/* 左側：2等カード3枚 */}
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                {REAL_CARDS.sr.slice(0,3).map((c,i)=>(
                  <img key={i} src={c.img} alt={c.name} style={{width:"100%",borderRadius:5,border:"2px solid rgba(255,255,255,0.5)",boxShadow:"0 2px 8px rgba(0,0,0,0.5)",transform:`rotate(${[-4,-1,-3][i]}deg)`}}/>
                ))}
              </div>

              {/* 中央：ルカリオ（PSA10額縁・大きく） */}
              <div style={{flexShrink:0,width:"44%",position:"relative",zIndex:2}}>
                <div style={{
                  background:"linear-gradient(135deg,#8b6914,#ffd700,#b8860b,#ffd700,#8b6914)",
                  borderRadius:8,padding:4,
                  boxShadow:"0 0 30px rgba(255,215,0,0.9),0 6px 20px rgba(0,0,0,0.9)",
                }}>
                  <div style={{background:"linear-gradient(135deg,#5a4500,#c8a000,#5a4500)",borderRadius:5,padding:3}}>
                    <div style={{position:"relative",borderRadius:4,overflow:"hidden"}}>
                      {REAL_CARDS.lucario&&<img src={REAL_CARDS.lucario} alt="メガルカリオ ex" style={{width:"100%",display:"block"}}/>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右側：2等カード3枚 */}
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                {REAL_CARDS.sr.slice(3,6).map((c,i)=>(
                  <img key={i} src={c.img} alt={c.name} style={{width:"100%",borderRadius:5,border:"2px solid rgba(255,255,255,0.5)",boxShadow:"0 2px 8px rgba(0,0,0,0.5)",transform:`rotate(${[4,1,3][i]}deg)`}}/>
                ))}
              </div>
            </div>
          </div>

          {/* メインキャッチコピー */}
          <div style={{textAlign:"center",marginBottom:6}}>
            <div style={{textAlign:"center"}}>
              <img src={IMG_KAKUMEI} alt="1/8革命" style={{width:"min(85%,320px)",filter:"drop-shadow(0 4px 16px rgba(255,150,0,0.8))"}}/>
            </div>
          </div>

          {/* 下段情報 */}
          <div style={{background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <img src={IMG_1000COIN} alt="1/8の確率で1000コイン以上確定" style={{width:"min(65%,260px)",filter:"drop-shadow(0 2px 8px rgba(255,150,0,0.6))"}}/>
            <div style={{background:"#1a1a1a",border:"2px solid #ffd700",borderRadius:6,padding:"3px 8px",textAlign:"center",flexShrink:0}}>
              <div style={{color:"#ffd700",fontSize:8,fontWeight:900}}>最低保証</div>
              <div style={{color:"#fff",fontSize:12,fontWeight:900}}>80円</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:"14px 18px",background:pack.bg}}>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
          {pack.prizes.filter(p=>p.rank!=="ハズレ").map(prize=>(
            <div key={prize.rank} onClick={onDetail} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"8px 12px",border:`1px solid ${prize.color}22`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.3)"}>
              <span style={{fontSize:14}}>{prize.emoji}</span>
              <span style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:700,fontSize:11,color:prize.color,minWidth:28}}>{prize.rank}</span>
              <span style={{flex:1,color:"rgba(255,255,255,0.7)",fontSize:11}}>{prize.label}</span>
              <span style={{color:"#444",fontSize:10}}>›</span>
            </div>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:"rgba(255,255,255,0.4)",fontSize:10}}>残り口数</span><span style={{color:pack.accent,fontSize:11,fontWeight:700}}>{pack.remaining}/{pack.total}口</span></div>
          <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${pack.accent}88,${pack.accent})`,borderRadius:4}}/></div>
          {pack.note&&<div style={{color:"rgba(255,255,255,0.3)",fontSize:9,marginTop:5}}>{pack.note}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div><div style={{color:"rgba(255,255,255,0.35)",fontSize:9}}>1口</div><div style={{fontFamily:"'Cinzel',serif",fontSize:22,color:"#fff",lineHeight:1}}>¥{pack.price.toLocaleString()}</div></div>
          <button onClick={()=>onDraw(pack)} disabled={!ok} style={{flex:1,background:ok?`linear-gradient(135deg,${pack.accent},${pack.accent}cc)`:"#222",border:"none",color:ok?"#000":"#555",padding:"13px",borderRadius:10,fontFamily:"'Noto Sans JP',sans-serif",fontSize:13,fontWeight:900,cursor:ok?"pointer":"not-allowed"}} onMouseEnter={e=>{if(ok)e.target.style.opacity="0.85";}} onMouseLeave={e=>e.target.style.opacity="1"}>{ok?"今すぐ引く ⚡":"SOLD OUT"}</button>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>ok&&onMultiDraw(pack,d10)} disabled={!ok} style={{flex:1,background:ok?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${ok?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,color:ok?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.2)",padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:ok?"pointer":"not-allowed"}} onMouseEnter={e=>{if(ok)e.currentTarget.style.background="rgba(255,255,255,0.14)";}} onMouseLeave={e=>{if(ok)e.currentTarget.style.background="rgba(255,255,255,0.08)";}}>
            <div style={{fontSize:13,fontWeight:900}}>{d10}連</div>
          </button>
          <button onClick={()=>ok&&onMultiDraw(pack,d100)} disabled={!ok} style={{flex:1,background:ok?`linear-gradient(135deg,${pack.accent}22,${pack.accent}11)`:"rgba(255,255,255,0.02)",border:`1px solid ${ok?`${pack.accent}66`:"rgba(255,255,255,0.06)"}`,color:ok?pack.accent:"rgba(255,255,255,0.2)",padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:ok?"pointer":"not-allowed"}} onMouseEnter={e=>{if(ok)e.currentTarget.style.background=`linear-gradient(135deg,${pack.accent}33,${pack.accent}22)`;}} onMouseLeave={e=>{if(ok)e.currentTarget.style.background=`linear-gradient(135deg,${pack.accent}22,${pack.accent}11)`;}}>
            <div style={{fontSize:13,fontWeight:900}}>{d100}連</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== LineupPage =====
function LineupPage({packs,sortOrder,setSortOrder,showSortMenu,setShowSortMenu,onDraw,onMultiDraw,onDetail}){
  const [ltab,setLtab]=useState("all");
  const cLabel=SORT_OPTS.find(o=>o.id===sortOrder)?.label||"デフォルト";
  const filtered=packs.filter(p=>ltab==="all"?true:ltab==="regular"?p.category==="regular":p.category==="recommend");
  const sorted=[...filtered].sort((a,b)=>{
    if(sortOrder==="price_asc")return a.price-b.price;if(sortOrder==="price_desc")return b.price-a.price;
    if(sortOrder==="remain_asc")return a.remaining-b.remaining;if(sortOrder==="remain_desc")return b.remaining-a.remaining;
    if(sortOrder==="new")return b.id-a.id;return a.id-b.id;
  });
  return(
    <div>
      <div style={{display:"flex",borderBottom:"2px solid #1a1a2a",marginBottom:20}}>
        {[{id:"all",label:"全て"},{id:"regular",label:"定番"},{id:"recommend",label:"おすすめ"}].map(t=>{
          const ia=ltab===t.id;
          return(<button key={t.id} onClick={()=>setLtab(t.id)} style={{flex:1,padding:"12px 0",background:"transparent",border:"none",color:ia?"#ffd700":"#555",fontFamily:"'Noto Sans JP',sans-serif",fontSize:14,fontWeight:ia?900:400,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
            {t.label}{ia&&<div style={{position:"absolute",bottom:-2,left:0,right:0,height:2,background:"linear-gradient(90deg,#ffd700,#ff9020)",borderRadius:2}}/>}
          </button>);
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <p style={{color:"#444",fontSize:11}}>{sorted.length}件のパック</p>
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowSortMenu(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"7px 14px",color:"#fff",fontSize:12,cursor:"pointer"}}>
            <span>☰</span><span>{cLabel}</span><span style={{fontSize:10,opacity:0.6}}>{showSortMenu?"▲":"▼"}</span>
          </button>
          {showSortMenu&&(<>
            <div style={{position:"fixed",inset:0,zIndex:299}} onClick={()=>setShowSortMenu(false)}/>
            <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"rgba(14,14,26,0.98)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,overflow:"hidden",zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:160}}>
              {SORT_OPTS.map(opt=>(
                <button key={opt.id} onClick={()=>{setSortOrder(opt.id);setShowSortMenu(false);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"13px 18px",background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.05)",color:sortOrder===opt.id?"#ffd700":"#ccc",fontSize:14,cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span>{opt.label}</span>{sortOrder===opt.id&&<span style={{color:"#ffd700"}}>✓</span>}
                </button>
              ))}
            </div>
          </>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20}}>
        {sorted.length>0?sorted.map(pack=><PackCard key={pack.id} pack={pack} onDraw={onDraw} onMultiDraw={onMultiDraw} onDetail={()=>onDetail(pack)}/>)
          :<div style={{textAlign:"center",color:"#333",padding:"60px 0",gridColumn:"1/-1"}}><div style={{fontSize:40,marginBottom:12}}>🎴</div>このカテゴリのパックはありません</div>}
      </div>
    </div>
  );
}

// ===== ShopPage =====
function ShopPage({notify,discount=0,onPurchase,checkLimit,ageLimit,userId}){
  const [modal,setModal]=useState(null);
  const [code,setCode]=useState("");
  const [msg,setMsg]=useState(null);
  const [step,setStep]=useState("coupon"); // coupon / payment / processing / complete
  const [selectedPay,setSelectedPay]=useState(null);
  const [progress,setProgress]=useState(0);

  const PLANS=[{coins:500,price:500,size:1},{coins:1000,price:1000,size:2},{coins:2000,price:2000,size:3},{coins:3000,price:3000,size:4},{coins:5000,price:5000,size:5},{coins:10000,price:10000,size:6}];
  const PAYS=[{id:"credit",label:"クレジットカード",icon:"💳",sub:"VISA / Mastercard / JCB / AMEX"},{id:"paypay",label:"PayPay",icon:"🟡",sub:"残高・クレジット払い"},{id:"cvs",label:"コンビニ支払い",icon:"🏪",sub:"ファミマ・ローソン・セブン他"}];
  const dp=(price)=>discount>0?Math.floor(price*(1-discount/100)):price;
  const open=(plan)=>{setCode("");setMsg(null);setStep("coupon");setProgress(0);setSelectedPay(null);setModal(plan);};
  const applyCode=()=>{
    if(!code.trim()){setMsg({type:"error",text:"クーポン番号を入力してください"});return;}
    if(code.trim().toUpperCase()==="ORIPA2025"){setMsg({type:"ok",text:"クーポン適用！10%割引になりました 🎉"});}
    else{setMsg({type:"error",text:"このクーポンは無効または期限切れです"});}
  };

  const handlePay=(method)=>{
    const proceed=async()=>{
      try{
        const res=await fetch("/api/create-checkout",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({amount:modal.price,coins:modal.coins,userId:userId||"guest"})
        });
        const data=await res.json();
        if(data.url){window.location.href=data.url;}
        else{alert("決済エラーが発生しました");}
      }catch(e){alert("決済エラーが発生しました");}
    };
    if(checkLimit){checkLimit(modal.price,proceed);}else{proceed();}
  };;

  return(
    <div>
      <h2 style={{fontFamily:"'Noto Sans JP',sans-serif",fontSize:18,color:"#fff",marginBottom:8,fontWeight:700,textAlign:"center"}}>コインショップ</h2>
      {discount>0&&<div style={{textAlign:"center",marginBottom:20}}><div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(46,204,113,0.12)",border:"1px solid rgba(46,204,113,0.4)",borderRadius:20,padding:"6px 18px"}}><span>🎟️</span><span style={{color:"#2ecc71",fontWeight:700,fontSize:13}}>特典コード適用中 · {discount}%OFF</span></div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:500,margin:"0 auto"}}>
        {PLANS.map((plan,i)=>{
          const sp=dp(plan.price);
          const isd=discount>0;
          return(<div key={i} style={{background:"#fff",borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:28+plan.size*4,minWidth:64,textAlign:"center"}}>{"🪙".repeat(Math.min(plan.size,3))}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,fontSize:18,color:"#111"}}>{plan.coins.toLocaleString()}コイン</div>
              {isd&&<div style={{color:"#aaa",fontSize:11,textDecoration:"line-through",marginTop:2}}>¥{plan.price.toLocaleString()}</div>}
            </div>
            <button onClick={()=>open({...plan,price:sp})} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"12px 22px",borderRadius:30,fontSize:15,fontWeight:900,cursor:"pointer",whiteSpace:"nowrap",position:"relative",fontFamily:"'Noto Sans JP',sans-serif"}}>
              {isd&&<div style={{position:"absolute",top:-8,right:-6,background:"#ff9020",color:"#fff",fontSize:9,fontWeight:900,padding:"2px 6px",borderRadius:10,whiteSpace:"nowrap"}}>{discount}%OFF</div>}
              ¥{sp.toLocaleString()}
            </button>
          </div>);
        })}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,zIndex:2500,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>step!=="processing"&&setModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",fontFamily:"'Noto Sans JP',sans-serif"}}>

            {/* クーポン */}
            {step==="coupon"&&(
              <div style={{padding:"28px 24px 40px"}}>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button onClick={()=>setModal(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>✕</button></div>
                <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:36,marginBottom:8}}>🎟️</div><div style={{color:"#111",fontWeight:900,fontSize:17}}>クーポンをお持ちですか？</div><div style={{color:"#aaa",fontSize:12,marginTop:4}}>{modal.coins.toLocaleString()}コイン / ¥{modal.price.toLocaleString()}</div></div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input value={code} onChange={e=>{setCode(e.target.value);setMsg(null);}} placeholder="クーポン番号を入力" style={{flex:1,background:"#f5f5f5",border:"1px solid #ddd",borderRadius:10,padding:"13px 16px",color:"#111",fontSize:14,outline:"none"}}/>
                  <button onClick={applyCode} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"0 18px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>適用</button>
                </div>
                {msg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:14,background:msg.type==="ok"?"#e8f8ee":"#fff0f0",border:`1px solid ${msg.type==="ok"?"#88ddaa":"#ffaaaa"}`,color:msg.type==="ok"?"#2a8a4a":"#cc3333",fontSize:13}}>{msg.text}</div>}
                <button onClick={()=>setStep("payment")} style={{width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:"pointer",marginBottom:10}}>{msg?.type==="ok"?"クーポンを使って購入 🎉":"このまま購入する"}</button>
                <button onClick={()=>setModal(null)} style={{width:"100%",background:"transparent",border:"1px solid #ddd",color:"#aaa",padding:"12px",borderRadius:12,fontSize:13,cursor:"pointer"}}>購入をやめる</button>
              </div>
            )}

            {/* 決済方法選択 */}
            {step==="payment"&&(
              <div style={{padding:"24px 20px 40px"}}>
                <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
                  <button onClick={()=>setStep("coupon")} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#999",marginRight:8}}>←</button>
                  <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:16,color:"#111"}}>決済方法を選択</div>
                  <button onClick={()=>setModal(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>✕</button>
                </div>
                <div style={{background:"#f8f8f8",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>🪙</span>
                  <div><div style={{fontWeight:900,color:"#111",fontSize:15}}>{modal.coins.toLocaleString()}コイン</div><div style={{color:"#aaa",fontSize:11}}>¥{modal.price.toLocaleString()}{msg?.type==="ok"?" (クーポン適用)":""}</div></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                  {PAYS.map(m=>(
                    <button key={m.id} onClick={()=>handlePay(m)} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",width:"100%"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#d94f6e"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e8e8e8"}>
                      <span style={{fontSize:28,minWidth:36,textAlign:"center"}}>{m.icon}</span>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:"#111"}}>{m.label}</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>{m.sub}</div></div>
                      <div style={{width:32,height:32,borderRadius:"50%",background:"#d94f6e",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,flexShrink:0}}>›</div>
                    </button>
                  ))}
                </div>
                <div style={{textAlign:"center",color:"#bbb",fontSize:11}}>選択した決済方法に応じて決済ページへ移動します</div>
              </div>
            )}

            {/* 処理中 */}
            {step==="processing"&&(
              <div style={{padding:"48px 24px 56px",textAlign:"center"}}>
                <div style={{fontSize:48,marginBottom:16}}>{selectedPay?.icon}</div>
                <div style={{fontWeight:900,fontSize:16,color:"#111",marginBottom:6}}>{selectedPay?.label}で決済中...</div>
                <div style={{color:"#aaa",fontSize:12,marginBottom:24}}>¥{modal.price.toLocaleString()} · {modal.coins.toLocaleString()}コイン</div>
                {/* プログレスバー */}
                <div style={{background:"#f0f0f0",borderRadius:20,height:10,overflow:"hidden",marginBottom:12}}>
                  <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#d94f6e,#ff8099)",borderRadius:20,transition:"width 0.5s ease"}}/>
                </div>
                <div style={{color:"#888",fontSize:12}}>
                  {progress<20?"決済サーバーに接続中...":progress<45?"支払い情報を確認中...":progress<70?"決済を処理中...":progress<90?"コインを付与中...":"完了！"}
                </div>
                {/* バックエンド処理ログ風 */}
                <div style={{marginTop:20,background:"#f8f8f8",borderRadius:10,padding:"12px 16px",textAlign:"left"}}>
                  {[
                    {pct:5,  text:"[SERVER] 決済リクエスト受信"},
                    {pct:25, text:"[DB] ユーザー認証確認"},
                    {pct:50, text:"[PAYMENT] 決済処理実行"},
                    {pct:75, text:"[DB] コイン残高更新"},
                    {pct:95, text:"[SERVER] トランザクション完了"},
                  ].filter(l=>progress>=l.pct).map((l,i)=>(
                    <div key={i} style={{fontFamily:"monospace",fontSize:10,color:"#2ecc71",marginBottom:3}}>✓ {l.text}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 完了 */}
            {step==="complete"&&(
              <div style={{padding:"48px 24px 56px",textAlign:"center"}}>
                <div style={{fontSize:64,marginBottom:16}}>✅</div>
                <div style={{fontWeight:900,fontSize:20,color:"#111",marginBottom:8}}>購入完了！</div>
                <div style={{color:"#aaa",fontSize:13,marginBottom:24}}>{selectedPay?.label}でのお支払いが完了しました</div>
                <div style={{background:"linear-gradient(135deg,#fff8e1,#fff3cd)",border:"2px solid #ffd700",borderRadius:16,padding:"20px",marginBottom:24}}>
                  <div style={{color:"#888",fontSize:12,marginBottom:4}}>付与されたコイン</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#000"}}>C</div>
                    <span style={{fontWeight:900,fontSize:36,color:"#111"}}>+{modal.coins.toLocaleString()}</span>
                  </div>
                  <div style={{color:"#aaa",fontSize:11,marginTop:4}}>¥{modal.price.toLocaleString()} のお支払い</div>
                </div>
                <button onClick={()=>setModal(null)} style={{width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"16px",borderRadius:12,fontSize:16,fontWeight:900,cursor:"pointer"}}>
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== BenefitCodeModal =====
function BenefitCodeModal({onClose,currentDiscount,onApply}){
  const [code,setCode]=useState("");
  const [msg,setMsg]=useState(null);
  const check=()=>{
    const t=code.trim().toUpperCase();
    if(!t){setMsg({type:"error",text:"コードを入力してください"});return;}
    const found=BENEFIT_CODES[t];
    if(!found){setMsg({type:"error",text:"このコードは無効または期限切れです"});return;}
    setMsg({type:"ok",text:`${found.discount}%OFFが適用されます！`});
  };
  const apply=()=>{
    const t=code.trim().toUpperCase();
    const found=BENEFIT_CODES[t];
    if(!found||!msg||msg.type!=="ok"){setMsg({type:"error",text:"有効なコードを入力してください"});return;}
    onApply(found.discount);
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0e0e1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,border:"1px solid #1a1a2a",fontFamily:"'Noto Sans JP',sans-serif",padding:"28px 24px 44px"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}><button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button></div>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:10}}>🎟️</div>
          <div style={{color:"#fff",fontWeight:900,fontSize:17}}>特典コード入力</div>
          <div style={{color:"#555",fontSize:12,marginTop:6}}>コードを入力するとコインが割引価格で購入できます</div>
          {currentDiscount>0&&<div style={{marginTop:10,color:"#2ecc71",fontSize:13,fontWeight:700}}>現在 {currentDiscount}%OFF 適用中</div>}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setMsg(null);}} placeholder="例: COIN10" style={{flex:1,background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",letterSpacing:1}}/>
          <button onClick={check} style={{background:"#ffd700",border:"none",color:"#000",padding:"0 18px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>確認</button>
        </div>
        {msg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:14,background:msg.type==="ok"?"rgba(46,204,113,0.12)":"rgba(255,60,60,0.1)",border:`1px solid ${msg.type==="ok"?"rgba(46,204,113,0.4)":"rgba(255,60,60,0.3)"}`,color:msg.type==="ok"?"#2ecc71":"#ff6666",fontSize:13}}>{msg.text}</div>}
        <button onClick={apply} style={{width:"100%",background:msg?.type==="ok"?"#2ecc71":"#333",border:"none",color:msg?.type==="ok"?"#000":"#666",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:msg?.type==="ok"?"pointer":"not-allowed",marginBottom:10,transition:"all 0.2s"}}>
          {msg?.type==="ok"?`${BENEFIT_CODES[code.trim().toUpperCase()]?.discount}%OFFを適用する`:"コードを適用する"}
        </button>
        <button onClick={onClose} style={{width:"100%",background:"transparent",border:"1px solid #2a2a3a",color:"#555",padding:"12px",borderRadius:12,fontSize:13,cursor:"pointer"}}>閉じる</button>
        <div style={{marginTop:16,textAlign:"center",color:"#333",fontSize:11}}>デモコード: COIN10・COIN20・VIPCODE</div>
      </div>
    </div>
  );
}

// ===== 永続化Hook =====
function usePersistedState(key, defaultVal){
  const [val,setVal]=useState(()=>{
    try{const s=localStorage.getItem(key);return s?JSON.parse(s):defaultVal;}
    catch{return defaultVal;}
  });
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{};},[key,val]);
  return [val,setVal];
}

// ===== 年齢確認モーダル =====
function AgeCheckModal({onConfirm}){
  const [year,setYear]=useState("");
  const [month,setMonth]=useState("");
  const [err,setErr]=useState("");

  const currentYear=new Date().getFullYear();
  const years=[...Array(100)].map((_,i)=>currentYear-i);
  const months=[...Array(12)].map((_,i)=>i+1);

  const confirm=()=>{
    if(!year||!month){setErr("生年月を選択してください");return;}
    const age=currentYear-parseInt(year)-(new Date().getMonth()+1<parseInt(month)?1:0);
    let limit=null;
    if(age<=14) limit={age,label:"14歳以下",monthly:10000};
    else if(age<=17) limit={age,label:"15〜17歳",monthly:20000};
    else limit={age,label:"18歳以上",monthly:null};
    onConfirm(limit);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{background:"#0e0e1a",borderRadius:20,border:"1px solid #2a2a3a",padding:"36px 28px",maxWidth:400,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🎴</div>
        <div style={{color:"#fff",fontWeight:900,fontSize:20,marginBottom:8}}>年齢確認</div>
        <div style={{color:"#888",fontSize:13,lineHeight:1.8,marginBottom:20}}>
          生年月を選択してください。<br/>年齢に応じた利用制限が適用されます。
        </div>

        {/* 年齢別制限説明 */}
        <div style={{background:"#1a1a2a",borderRadius:12,padding:"14px",marginBottom:20,textAlign:"left"}}>
          {[{label:"18歳以上",desc:"課金制限なし",color:"#2ecc71"},
            {label:"15〜17歳",desc:"月2万円まで",color:"#ffd700"},
            {label:"14歳以下",desc:"月1万円まで",color:"#60b8ff"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #222"}}>
              <span style={{color:"#ccc",fontSize:12}}>{r.label}</span>
              <span style={{color:r.color,fontSize:12,fontWeight:700}}>{r.desc}</span>
            </div>
          ))}
        </div>

        {/* 生年月選択 */}
        <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"center"}}>
          <div style={{flex:1}}>
            <div style={{color:"#888",fontSize:11,marginBottom:6,textAlign:"left"}}>年</div>
            <select value={year} onChange={e=>{setYear(e.target.value);setErr("");}} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 10px",color:year?"#fff":"#555",fontSize:15,outline:"none",cursor:"pointer"}}>
              <option value="">----</option>
              {years.map(y=><option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
          <div style={{flex:"0 0 90px"}}>
            <div style={{color:"#888",fontSize:11,marginBottom:6,textAlign:"left"}}>月</div>
            <select value={month} onChange={e=>{setMonth(e.target.value);setErr("");}} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 10px",color:month?"#fff":"#555",fontSize:15,outline:"none",cursor:"pointer"}}>
              <option value="">--</option>
              {months.map(m=><option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
        </div>

        {err&&<div style={{color:"#ff6666",fontSize:13,padding:"10px 14px",background:"rgba(255,60,60,0.1)",borderRadius:8,marginBottom:16}}>{err}</div>}

        <button onClick={confirm} style={{width:"100%",background:year&&month?"#d94f6e":"#333",border:"none",color:year&&month?"#fff":"#666",padding:"16px",borderRadius:12,fontSize:16,fontWeight:900,cursor:year&&month?"pointer":"not-allowed",transition:"all 0.2s",marginBottom:12}}>
          確認する
        </button>
        <div style={{color:"#444",fontSize:11}}>ご利用には利用規約への同意が必要です</div>
      </div>
    </div>
  );
}

// ===== 当選報告掲示板 =====
function WinReportPage({user,isGuest,onRequireLogin}){
  const [posts,setPosts]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("winPosts")||"[]");}catch{return [];}
  });
  const [showForm,setShowForm]=useState(false);
  const [msg,setMsg]=useState("");
  const [imgData,setImgData]=useState(null);
  const [rank,setRank]=useState("1等");
  const [cardName,setCardName]=useState("");
  const [posting,setPosting]=useState(false);
  const [confetti,setConfetti]=useState([]);

  const savePosts=(next)=>{
    setPosts(next);
    try{localStorage.setItem("winPosts",JSON.stringify(next));}catch{}
  };

  const handleImg=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>setImgData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submit=()=>{
    if(!msg.trim()&&!imgData){return;}
    setPosting(true);
    setTimeout(()=>{
      const newPost={
        id:Date.now(),
        user:user?.name||"ゲスト",
        rank,cardName,msg,imgData,
        date:new Date().toLocaleString(),
        likes:0,
      };
      const next=[newPost,...posts];
      savePosts(next);
      setMsg("");setImgData(null);setCardName("");setRank("1等");
      setShowForm(false);setPosting(false);
      // 紙吹雪
      setConfetti([...Array(30)].map((_,i)=>({id:i,x:Math.random()*100,color:`hsl(${Math.random()*360},80%,60%)`,dur:2+Math.random()*2,delay:Math.random()*1})));
      setTimeout(()=>setConfetti([]),5000);
    },800);
  };

  const likePost=(id)=>{
    savePosts(posts.map(p=>p.id===id?{...p,likes:p.likes+1}:p));
  };

  const deletePost=(id)=>{
    savePosts(posts.filter(p=>p.id!==id));
  };

  const RANK_COLORS={"1等":"linear-gradient(135deg,#ffd700,#ff9020)","2等":"linear-gradient(135deg,#c0c0c0,#888)","3等":"linear-gradient(135deg,#cd7f32,#a0522d)"};

  return(
    <div style={{fontFamily:"'Noto Sans JP',sans-serif",position:"relative"}}>
      <style>{`@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>

      {/* 紙吹雪 */}
      {confetti.map(c=>(
        <div key={c.id} style={{position:"fixed",left:`${c.x}%`,top:0,width:8,height:8,background:c.color,borderRadius:2,animation:`fall ${c.dur}s ease-in ${c.delay}s forwards`,pointerEvents:"none",zIndex:999}}/>
      ))}

      {/* ヘッダー */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"'Cinzel',serif",fontSize:18,color:"#fff",letterSpacing:2}}>🎉 当選報告</h2>
          <p style={{color:"#444",fontSize:11,marginTop:2}}>{posts.length}件の投稿</p>
        </div>
        <button onClick={()=>isGuest?onRequireLogin():setShowForm(true)} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"10px 18px",borderRadius:20,fontWeight:900,fontSize:13,cursor:"pointer"}}>
          ＋ 投稿する
        </button>
      </div>

      {/* 投稿フォーム */}
      {showForm&&(
        <div style={{background:"#0e0e1a",borderRadius:16,border:"1px solid #2a2a3a",padding:"20px",marginBottom:20}}>
          <div style={{color:"#fff",fontWeight:700,fontSize:15,marginBottom:16}}>📸 当選を報告する</div>

          {/* カード名 */}
          <input value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="当たったカード名（例: メガルカリオ ex）" style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>

          {/* メッセージ */}
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="コメントを入力..." rows={3} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:13,outline:"none",resize:"none",marginBottom:10,boxSizing:"border-box"}}/>

          {/* 画像アップロード */}
          <label style={{display:"block",cursor:"pointer",marginBottom:12}}>
            <div style={{background:"#1a1a2a",border:"2px dashed #2a2a3a",borderRadius:10,padding:"16px",textAlign:"center",color:"#555",fontSize:13}}>
              {imgData?<img src={imgData} alt="preview" style={{maxHeight:160,borderRadius:8,display:"block",margin:"0 auto"}}/>:"📷 写真をアップロード（任意）"}
            </div>
            <input type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
          </label>
          {imgData&&<button onClick={()=>setImgData(null)} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",marginBottom:10}}>✕ 写真を削除</button>}

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setShowForm(false);setMsg("");setImgData(null);}} style={{flex:1,background:"transparent",border:"1px solid #2a2a3a",color:"#666",padding:"12px",borderRadius:10,cursor:"pointer"}}>キャンセル</button>
            <button onClick={submit} disabled={(!msg.trim()&&!imgData)||posting} style={{flex:2,background:msg.trim()||imgData?"#d94f6e":"#333",border:"none",color:"#fff",padding:"12px",borderRadius:10,fontWeight:900,fontSize:14,cursor:msg.trim()||imgData?"pointer":"not-allowed"}}>
              {posting?"投稿中...":"🎉 投稿する"}
            </button>
          </div>
        </div>
      )}

      {/* 投稿一覧 */}
      {posts.length===0?(
        <div style={{textAlign:"center",color:"#222",padding:"80px 0"}}>
          <div style={{fontSize:48,marginBottom:16}}>🎴</div>
          <div style={{color:"#444",fontSize:14}}>まだ投稿がありません</div>
          <div style={{color:"#333",fontSize:12,marginTop:6}}>最初の当選報告を投稿しよう！</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {posts.map(post=>(
            <div key={post.id} style={{background:"#0e0e1a",borderRadius:16,border:"1px solid #1a1a2a",overflow:"hidden"}}>
              {/* ヘッダー */}
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #1a1a2a"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#d94f6e,#ff8099)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:14,flexShrink:0}}>
                  {post.user[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{post.user}</div>
                  <div style={{color:"#555",fontSize:11,marginTop:1}}>{post.date}</div>
                </div>
                {/* 自分の投稿は削除可 */}
                {(user?.name===post.user||!post.user||post.user==="ゲスト")&&(
                  <button onClick={()=>deletePost(post.id)} style={{background:"none",border:"none",color:"#333",fontSize:16,cursor:"pointer",padding:"4px"}}>🗑</button>
                )}
              </div>

              {/* カード名 */}
              {post.cardName&&(
                <div style={{padding:"10px 16px 0",color:"#ffd700",fontWeight:700,fontSize:14}}>🃏 {post.cardName}</div>
              )}

              {/* 画像 */}
              {post.imgData&&(
                <div style={{padding:"10px 16px 0"}}>
                  <img src={post.imgData} alt="当選カード" style={{width:"100%",maxHeight:300,objectFit:"cover",borderRadius:10,display:"block"}}/>
                </div>
              )}

              {/* メッセージ */}
              {post.msg&&(
                <div style={{padding:"10px 16px",color:"#ccc",fontSize:14,lineHeight:1.6}}>{post.msg}</div>
              )}

              {/* いいねボタン */}
              <div style={{padding:"10px 16px 14px",display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>likePost(post.id)} style={{background:"rgba(255,60,100,0.1)",border:"1px solid rgba(255,60,100,0.2)",borderRadius:20,padding:"6px 16px",color:"#ff6688",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  ❤️ {post.likes}
                </button>
                <button onClick={()=>{navigator.clipboard?.writeText(`【当選報告】${post.rank}当選！${post.cardName} #ポケモンオリパ`);}} style={{background:"rgba(29,161,242,0.1)",border:"1px solid rgba(29,161,242,0.2)",borderRadius:20,padding:"6px 16px",color:"#1DA1F2",fontSize:12,cursor:"pointer"}}>
                  𝕏 シェア
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ランキングページ =====
function RankingPage({history,user,coins,inviteCount}){
  const [tab,setTab]=useState("total");
  const demoRanking=[
    {name:"ルカリオマスター",total:48000,wins:8,draws:160,recent:"メガルカリオ ex SAR"},
    {name:"カイリューハンター",total:35000,wins:5,draws:117,recent:"メガカイリュー ex MA"},
    {name:"レアカード収集家",total:29000,wins:4,draws:97,recent:"ロトム ex SAR"},
    {name:"オリパ王",total:22000,wins:3,draws:74,recent:"メガズルズキン ex SAR"},
    {name:"ラッキースター",total:18000,wins:2,draws:60,recent:"ルリナ SR"},
    {name:"ポケモン好き",total:12000,wins:1,draws:40,recent:"ビクティニ AR"},
    {name:"初心者トレーナー",total:6000,wins:0,draws:20,recent:"-"},
  ];
  const myDraws=history.length;
  const myTotal=history.reduce((s,c)=>{const r=c.prize?.rank;return s+(r==="1等"?10000:r==="2等"?2000:r==="3等"?1000:1);},0);
  const myWins=history.filter(c=>c.prize?.rank==="1等"||c.prize?.rank==="2等").length;
  const myRecent=history.find(c=>c.prize?.rank==="1等"||c.prize?.rank==="2等")?.name||"-";
  const myEntry={name:user?.name||"あなた",total:myTotal,wins:myWins,draws:myDraws,recent:myRecent,isMe:true};

  const sorted=[...demoRanking,myEntry].sort((a,b)=>
    tab==="wins"?b.wins-a.wins:tab==="draws"?b.draws-a.draws:b.total-a.total
  );
  const myRank=sorted.findIndex(r=>r.isMe)+1;

  return(
    <div style={{fontFamily:"'Noto Sans JP',sans-serif"}}>
      <h2 style={{fontFamily:"'Cinzel',serif",fontSize:18,color:"#fff",marginBottom:4,letterSpacing:2}}>🏆 ランキング</h2>
      <p style={{color:"#444",fontSize:12,marginBottom:16}}>全ユーザーと競おう！</p>

      {/* 自分の順位サマリー */}
      <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,144,32,0.05))",border:"1px solid rgba(255,215,0,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:16,display:"flex",gap:16,alignItems:"center"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:"#000",flexShrink:0}}>
          {myRank}位
        </div>
        <div style={{flex:1}}>
          <div style={{color:"#ffd700",fontWeight:900,fontSize:14}}>{user?.name||"あなた"}</div>
          <div style={{color:"#888",fontSize:11,marginTop:2}}>当選{myWins}回 · {myDraws}回引いた · {myTotal.toLocaleString()}コイン分</div>
        </div>
        {inviteCount>0&&<div style={{background:"rgba(46,204,113,0.12)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:10,padding:"4px 10px",color:"#2ecc71",fontSize:11,fontWeight:700}}>招待{inviteCount}人</div>}
      </div>

      {/* タブ */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"#0e0e1a",borderRadius:12,padding:4}}>
        {[["total","💰 総額"],["wins","🎯 当選数"],["draws","🎴 引いた数"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px 4px",background:tab===id?"#ffd700":"transparent",border:"none",borderRadius:8,color:tab===id?"#000":"#888",fontWeight:tab===id?900:400,fontSize:11,cursor:"pointer",transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map((r,i)=>(
          <div key={i} style={{background:r.isMe?"rgba(255,215,0,0.06)":"#0e0e1a",borderRadius:12,border:`1px solid ${r.isMe?"rgba(255,215,0,0.25)":"#1a1a2a"}`,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,transition:"all 0.2s"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:i===0?"linear-gradient(135deg,#ffd700,#ff9020)":i===1?"linear-gradient(135deg,#c0c0c0,#888)":i===2?"linear-gradient(135deg,#cd7f32,#a0522d)":"#1a1a2a",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:i<3?15:13,color:i<3?"#000":"#555",flexShrink:0}}>
              {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:r.isMe?"#ffd700":"#fff",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                {r.name}
                {r.isMe&&<span style={{background:"rgba(255,215,0,0.15)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:8,padding:"1px 6px",fontSize:9,color:"#ffd700"}}>あなた</span>}
              </div>
              <div style={{color:"#555",fontSize:10,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {tab!=="wins"&&`当選${r.wins}回 · `}{r.recent!=="-"?`最近: ${r.recent}`:"当選なし"}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{color:"#ffd700",fontWeight:900,fontSize:tab==="total"?14:18}}>
                {tab==="total"?`${r.total.toLocaleString()}C`:tab==="wins"?`${r.wins}回`:`${r.draws}回`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 招待コードモーダル =====
function InviteModal({onClose,user,onInviteUsed}){
  const [myCode]=useState(()=>{
    const saved=localStorage.getItem("myInviteCode");
    if(saved) return saved;
    const code=(user?.name||"USER").slice(0,3).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase();
    localStorage.setItem("myInviteCode",code);
    return code;
  });
  const [inputCode,setInputCode]=useState("");
  const [msg,setMsg]=useState(null);
  const [copied,setCopied]=useState(false);

  const copyCode=()=>{
    navigator.clipboard?.writeText(myCode);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const useCode=()=>{
    const code=inputCode.trim().toUpperCase();
    if(!code){setMsg({type:"error",text:"招待コードを入力してください"});return;}
    if(code===myCode){setMsg({type:"error",text:"自分の招待コードは使えません"});return;}
    const used=JSON.parse(localStorage.getItem("usedInviteCodes")||"[]");
    if(used.includes(code)){setMsg({type:"error",text:"このコードはすでに使用済みです"});return;}
    // デモ: どんなコードでも受け付ける
    used.push(code);
    localStorage.setItem("usedInviteCodes",JSON.stringify(used));
    onInviteUsed&&onInviteUsed(1); // 1コインボーナス
    setMsg({type:"ok",text:"招待コード適用！1コインプレゼント 🎉"});
    setInputCode("");
  };

  const inviteCount=JSON.parse(localStorage.getItem("inviteCount")||"0");

  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0e0e1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,border:"1px solid #1a1a2a",fontFamily:"'Noto Sans JP',sans-serif",padding:"28px 24px 44px"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:24}}>
          <div style={{flex:1,color:"#fff",fontWeight:900,fontSize:17}}>👥 友達招待</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {/* 自分のコード */}
        <div style={{background:"#1a1a2a",borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{color:"#888",fontSize:11,marginBottom:8}}>あなたの招待コード</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,fontFamily:"monospace",fontSize:24,fontWeight:900,color:"#ffd700",letterSpacing:4}}>{myCode}</div>
            <button onClick={copyCode} style={{background:copied?"#2ecc71":"#ffd700",border:"none",color:"#000",padding:"8px 16px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>
              {copied?"✓ コピー済":"コピー"}
            </button>
          </div>
          <div style={{color:"#555",fontSize:11,marginTop:8}}>友達がこのコードを使うと500コインをプレゼント！</div>
          {inviteCount>0&&<div style={{color:"#2ecc71",fontSize:12,marginTop:6,fontWeight:700}}>✅ {inviteCount}人が招待コードを使用</div>}
        </div>

        {/* SNSシェア */}
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <button onClick={()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`ポケモンオリパで招待コード【${myCode}】を使うと1コインもらえるよ！ #ポケモンオリパ`)}`,"_blank")} style={{flex:1,background:"#1DA1F2",border:"none",color:"#fff",padding:"10px",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer"}}>𝕏 シェア</button>
          <button onClick={()=>window.open(`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(`招待コードでポケモンオリパを始めよう！1コインプレゼント中！`)}`,"_blank")} style={{flex:1,background:"#06C755",border:"none",color:"#fff",padding:"10px",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer"}}>LINE</button>
        </div>

        <div style={{height:1,background:"#1a1a2a",marginBottom:20}}/>

        {/* 招待コード入力 */}
        <div style={{color:"#888",fontSize:11,marginBottom:8}}>招待コードをお持ちの方</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={inputCode} onChange={e=>{setInputCode(e.target.value.toUpperCase());setMsg(null);}} placeholder="招待コードを入力" style={{flex:1,background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",letterSpacing:2}}/>
          <button onClick={useCode} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"0 18px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>使う</button>
        </div>
        {msg&&<div style={{padding:"10px 14px",borderRadius:8,background:msg.type==="ok"?"rgba(46,204,113,0.12)":"rgba(255,60,60,0.1)",border:`1px solid ${msg.type==="ok"?"rgba(46,204,113,0.4)":"rgba(255,60,60,0.3)"}`,color:msg.type==="ok"?"#2ecc71":"#ff6666",fontSize:13}}>{msg.text}</div>}
      </div>
    </div>
  );
}

// ===== お問い合わせモーダル =====
function ContactModal({onClose,user}){
  const [category,setCategory]=useState("");
  const [msg,setMsg]=useState("");
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(false);
  const CATS=["発送について","決済・コインについて","カードの状態について","アカウントについて","バグ・不具合報告","その他"];
  const send=()=>{
    if(!category||!msg.trim()){return;}
    setLoading(true);
    setTimeout(()=>{setSent(true);setLoading(false);},1200);
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0e0e1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",fontFamily:"'Noto Sans JP',sans-serif",padding:"28px 24px 44px"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
          <div style={{flex:1,fontWeight:900,fontSize:17,color:"#fff"}}>📩 お問い合わせ</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        {sent?(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:56,marginBottom:16}}>✅</div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18,marginBottom:8}}>送信完了！</div>
            <div style={{color:"#888",fontSize:13,lineHeight:1.8}}>お問い合わせを受け付けました。<br/>2〜3営業日以内にご返信いたします。</div>
            <button onClick={onClose} style={{marginTop:24,background:"#d94f6e",border:"none",color:"#fff",padding:"14px 40px",borderRadius:30,fontWeight:900,fontSize:15,cursor:"pointer"}}>閉じる</button>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {user&&<div style={{background:"#1a1a2a",borderRadius:10,padding:"10px 14px",color:"#888",fontSize:12}}>送信者: {user.name} ({user.email||user.id})</div>}
            <div>
              <div style={{color:"#888",fontSize:11,marginBottom:6}}>カテゴリー *</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {CATS.map(c=>(
                  <button key={c} onClick={()=>setCategory(c)} style={{background:category===c?"#d94f6e":"#1a1a2a",border:`1px solid ${category===c?"#d94f6e":"#2a2a3a"}`,color:category===c?"#fff":"#888",padding:"6px 12px",borderRadius:20,fontSize:12,cursor:"pointer"}}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{color:"#888",fontSize:11,marginBottom:6}}>お問い合わせ内容 *</div>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="詳しく教えてください..." rows={5} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            <button onClick={send} disabled={!category||!msg.trim()||loading} style={{background:category&&msg.trim()?"#d94f6e":"#333",border:"none",color:category&&msg.trim()?"#fff":"#666",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:category&&msg.trim()?"pointer":"not-allowed"}}>
              {loading?"送信中...":"送信する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== AddressModal =====
function AddressModal({current,onClose,onSave}){
  const [form,setForm]=useState(current||{name:"",zip:"",pref:"",city:"",addr:"",building:""});
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const PREFS=["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
  const inputS={width:"100%",background:"#f5f5f5",border:"1px solid #ddd",borderRadius:10,padding:"12px 14px",fontSize:14,color:"#111",outline:"none",boxSizing:"border-box"};
  const save=()=>{
    if(!form.name||!form.zip||!form.pref||!form.city||!form.addr){setErr("必須項目を入力してください");return;}
    if(!/^\d{7}$/.test(form.zip.replace("-",""))){setErr("郵便番号は7桁で入力してください");return;}
    onSave(form);
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",fontFamily:"'Noto Sans JP',sans-serif",padding:"28px 24px 40px"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
          <div style={{flex:1,fontWeight:900,fontSize:17,color:"#111"}}>📦 送付先の登録</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {label:"お名前 *",key:"name",placeholder:"山田 太郎"},
            {label:"郵便番号 * (ハイフンなし7桁)",key:"zip",placeholder:"1234567",type:"tel"},
          ].map(f=>(
            <div key={f.key}>
              <div style={{color:"#888",fontSize:11,marginBottom:4}}>{f.label}</div>
              <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} type={f.type||"text"} style={inputS}/>
            </div>
          ))}
          <div>
            <div style={{color:"#888",fontSize:11,marginBottom:4}}>都道府県 *</div>
            <select value={form.pref} onChange={e=>set("pref",e.target.value)} style={{...inputS,appearance:"none"}}>
              <option value="">選択してください</option>
              {PREFS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {[
            {label:"市区町村 *",key:"city",placeholder:"渋谷区"},
            {label:"番地 *",key:"addr",placeholder:"1-2-3"},
            {label:"建物名・部屋番号",key:"building",placeholder:"オリパマンション101"},
          ].map(f=>(
            <div key={f.key}>
              <div style={{color:"#888",fontSize:11,marginBottom:4}}>{f.label}</div>
              <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} style={inputS}/>
            </div>
          ))}
          {err&&<div style={{color:"#cc3333",fontSize:12,padding:"8px 12px",background:"#fff0f0",borderRadius:8}}>{err}</div>}
          <button onClick={save} style={{width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:"pointer",marginTop:4}}>この住所で登録する</button>
          <button onClick={onClose} style={{width:"100%",background:"transparent",border:"1px solid #ddd",color:"#aaa",padding:"12px",borderRadius:12,fontSize:13,cursor:"pointer"}}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ===== 管理者パネル =====
function AdminPanel({requests,onUpdate,onClose,totalIssued=0,maxIssued=10000000}){
  const [filter,setFilter]=useState("all");
  const pct=Math.round((totalIssued/maxIssued)*100);
  const isWarning=pct>=80;
  const isDanger=pct>=95; // all / pending / shipped / done
  const filtered=filter==="all"?requests:requests.filter(r=>r.status===filter);
  const STATUS={pending:{label:"未処理",color:"#ff9020",bg:"rgba(255,144,32,0.12)"},shipped:{label:"発送済み",color:"#60b8ff",bg:"rgba(96,184,255,0.12)"},done:{label:"完了",color:"#2ecc71",bg:"rgba(46,204,113,0.12)"}};
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"#06060e",display:"flex",flexDirection:"column",fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* ヘッダー */}
      <div style={{background:"#0e0e1a",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #1a1a2a",flexShrink:0}}>
        <div>
          <div style={{color:"#ffd700",fontSize:10,letterSpacing:2,fontWeight:700}}>ADMIN</div>
          <div style={{color:"#fff",fontWeight:900,fontSize:16}}>⚙️ 発送管理画面</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"#1a1a2a",borderRadius:20,padding:"4px 12px",color:"#ff9020",fontSize:12,fontWeight:700}}>{requests.filter(r=>r.status==="pending").length}件 未処理</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
      </div>

      {/* 発行残高ダッシュボード */}
      <div style={{padding:"12px 16px",background:"#0a0a16",borderBottom:"1px solid #1a1a2a",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{color:"#888",fontSize:11,fontWeight:700}}>💴 コイン発行残高（資金決済法管理）</div>
          <div style={{color:isDanger?"#ff4444":isWarning?"#ff9020":"#2ecc71",fontSize:11,fontWeight:700}}>{pct}%</div>
        </div>
        <div style={{background:"#1a1a2a",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}>
          <div style={{width:`${pct}%`,height:"100%",background:isDanger?"linear-gradient(90deg,#ff4444,#ff0000)":isWarning?"linear-gradient(90deg,#ff9020,#ffd700)":"linear-gradient(90deg,#2ecc71,#27ae60)",borderRadius:6,transition:"width 0.5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:"#fff",fontSize:12}}>
            <span style={{fontWeight:900,color:isDanger?"#ff4444":isWarning?"#ff9020":"#fff"}}>{totalIssued.toLocaleString()}</span>
            <span style={{color:"#555"}}> / {maxIssued.toLocaleString()} コイン</span>
          </div>
          <div style={{color:"#555",fontSize:11}}>残り {(maxIssued-totalIssued).toLocaleString()}コイン発行可</div>
        </div>
        {isDanger&&<div style={{marginTop:8,background:"rgba(255,60,60,0.12)",border:"1px solid rgba(255,60,60,0.3)",borderRadius:8,padding:"6px 10px",color:"#ff6666",fontSize:11}}>⚠️ 発行残高が95%を超えました。資金決済法の届出・供託が必要です。</div>}
        {isWarning&&!isDanger&&<div style={{marginTop:8,background:"rgba(255,144,32,0.1)",border:"1px solid rgba(255,144,32,0.25)",borderRadius:8,padding:"6px 10px",color:"#ff9020",fontSize:11}}>⚡ 発行残高が80%を超えました。専門家への相談をご検討ください。</div>}
      </div>

      {/* フィルタータブ */}
      <div style={{display:"flex",background:"#0e0e1a",borderBottom:"1px solid #1a1a2a",flexShrink:0}}>
        {[["all","すべて"],["pending","未処理"],["shipped","発送済み"],["done","完了"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{flex:1,padding:"12px 0",background:"transparent",border:"none",borderBottom:filter===id?"2px solid #ffd700":"2px solid transparent",color:filter===id?"#ffd700":"#555",fontSize:13,fontWeight:filter===id?700:400,cursor:"pointer"}}>
            {label}{id!=="all"&&<span style={{marginLeft:4,fontSize:10,color:"#888"}}>({requests.filter(r=>r.status===id).length})</span>}
          </button>
        ))}
      </div>

      {/* 申請リスト */}
      <div style={{flex:1,overflow:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",color:"#333",padding:"60px 0"}}><div style={{fontSize:40,marginBottom:12}}>📭</div>申請はありません</div>
        ):filtered.map(req=>(
          <div key={req.id} style={{background:"#0e0e1a",borderRadius:16,border:"1px solid #1a1a2a",overflow:"hidden"}}>
            {/* 申請ヘッダー */}
            <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #1a1a2a"}}>
              <div>
                <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{req.user}</div>
                <div style={{color:"#555",fontSize:11,marginTop:2}}>{req.id} · {req.date}</div>
              </div>
              <div style={{background:STATUS[req.status]?.bg,border:`1px solid ${STATUS[req.status]?.color}44`,borderRadius:20,padding:"4px 12px",color:STATUS[req.status]?.color,fontSize:12,fontWeight:700}}>
                {STATUS[req.status]?.label}
              </div>
            </div>

            {/* カード一覧 */}
            <div style={{padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap"}}>
              {req.cards.map((c,i)=>(
                <div key={i} style={{background:"#1a1a2a",borderRadius:8,padding:"4px 8px",fontSize:10,color:"#ccc"}}>
                  {c.prizeRank==="ハズレ"||c.prizeRank==="3等"?"なにかのカード":c.name}
                  <span style={{marginLeft:4,color:c.prizeRank==="1等"?"#ffd700":c.prizeRank==="2等"?"#ffd700":c.prizeRank==="3等"?"#60b8ff":"#555",fontSize:9}}>
                    {c.prizeRank}
                  </span>
                </div>
              ))}
            </div>

            {/* 住所 */}
            <div style={{padding:"8px 16px 12px",borderTop:"1px solid #1a1a2a"}}>
              {req.address?(
                <div style={{color:"#888",fontSize:12}}>
                  📍 〒{req.address.zip} {req.address.pref}{req.address.city}{req.address.addr} {req.address.building}<br/>
                  <span style={{color:"#666"}}>{req.address.name} 様</span>
                </div>
              ):(
                <div style={{color:"#444",fontSize:12}}>⚠️ 住所未登録</div>
              )}
            </div>

            {/* アクションボタン */}
            {req.status==="pending"&&(
              <div style={{padding:"0 16px 14px",display:"flex",gap:8}}>
                <button onClick={()=>onUpdate(req.id,"shipped")} style={{flex:1,background:"#60b8ff",border:"none",color:"#000",padding:"10px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer"}}>📦 発送済みにする</button>
                <button onClick={()=>onUpdate(req.id,"done")} style={{flex:1,background:"#2ecc71",border:"none",color:"#000",padding:"10px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer"}}>✅ 完了にする</button>
              </div>
            )}
            {req.status==="shipped"&&(
              <div style={{padding:"0 16px 14px"}}>
                <button onClick={()=>onUpdate(req.id,"done")} style={{width:"100%",background:"#2ecc71",border:"none",color:"#000",padding:"10px",borderRadius:10,fontWeight:900,fontSize:13,cursor:"pointer"}}>✅ 完了にする</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 法的ページモーダル =====
function LegalModal({type,onClose}){
  const today=new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"});
  const contents={
    terms:{
      title:"利用規約",
      body:[
        {h:"第1条（適用）",p:"本規約は、ポケモンカードオリパ（以下「当サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意した上でサービスをご利用ください。"},
        {h:"第2条（利用資格）",p:"本サービスはどなたでもご利用いただけますが、年齢によって課金上限が異なります。14歳以下は月1万円、15〜17歳は月2万円、18歳以上は制限なしとします。"},
        {h:"第3条（禁止事項）",p:"①不正なアクセス・チート行為\n②複数アカウントの作成・不正利用\n③他ユーザーへの迷惑行為\n④法令に違反する行為\n⑤当サービスの運営を妨害する行為"},
        {h:"第4条（コインについて）",p:"購入したコインは日本円への返金はできません。コインの有効期限は最終利用日から180日間とします。招待コインは招待コードの使用によってのみ取得でき、通常コインとは別管理です。"},
        {h:"第5条（オリパの仕組み）",p:"各パックは確定排出方式を採用しており、表示された口数の中に各等級のカードが確定で含まれています。引く順番はランダムです。"},
        {h:"第6条（発送について）",p:"発送申請後、通常3〜7営業日以内に発送いたします。住所の誤記入による未着については当社は責任を負いかねます。"},
        {h:"第7条（免責事項）",p:"当サービスは予告なく内容を変更・停止する場合があります。サービス停止による損害について当社は一切の責任を負いません。"},
        {h:"第8条（規約の変更）",p:"本規約は必要に応じて変更することがあります。変更後もサービスを継続利用された場合は、変更後の規約に同意したものとみなします。"},
        {h:"附則",p:`本規約は${today}より施行します。`},
      ]
    },
    privacy:{
      title:"プライバシーポリシー",
      body:[
        {h:"1. 収集する情報",p:"当サービスでは以下の情報を収集します。\n・氏名・メールアドレス・電話番号（登録時）\n・住所（発送申請時）\n・購入・利用履歴\n・端末情報・アクセスログ"},
        {h:"2. 利用目的",p:"収集した個人情報は以下の目的で利用します。\n・サービスの提供・運営\n・カードの発送処理\n・お問い合わせへの対応\n・年齢確認・不正利用防止\n・サービス改善のための分析"},
        {h:"3. 第三者提供",p:"法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。"},
        {h:"4. 情報の管理",p:"収集した個人情報は適切な安全管理措置を講じて保管します。不正アクセス・漏洩・紛失の防止に努めます。"},
        {h:"5. Cookieについて",p:"当サービスではCookieおよびlocalStorageを使用してセッション情報・設定を保存します。ブラウザの設定で無効にすることができますが、一部機能が利用できなくなる場合があります。"},
        {h:"6. 開示・訂正・削除",p:"ご自身の個人情報の開示・訂正・削除を希望される場合は、お問い合わせフォームよりご連絡ください。本人確認の上、対応いたします。"},
        {h:"7. お問い合わせ",p:"プライバシーポリシーに関するご質問は、サービス内のお問い合わせフォームよりご連絡ください。"},
        {h:"附則",p:`本ポリシーは${today}より施行します。`},
      ]
    },
    tokusho:{
      title:"特定商取引法に基づく表記",
      body:[
        {h:"販売事業者の名称",p:""},
        {h:"代表者",p:""},
        {h:"所在地",p:""},
        {h:"連絡先",p:"メールアドレス：\n\n【お問い合わせのユーザー様へ】\n迅速な対応のため、専用のお問い合わせフォームをご用意しております。サービス内のお問い合わせフォームよりお問い合わせください。\n\nまた、よくあるお問い合わせをまとめておりますので、よくある質問（FAQ）も併せてご参照ください。"},
        {h:"電話番号",p:"ご請求があり次第、遅滞なく開示いたします。"},
        {h:"サポート対応時間",p:"平日10:00-17:00\n※土日祝および年末年始など長期休暇期間は、ご対応ができない場合がございますので、ご了承いただけますと幸いです。"},
        {h:"販売価格",p:"有料コインの購入画面に税込金額を表示いたします。"},
        {h:"販売価格以外にご負担いただく費用",p:"ウェブサイトの閲覧等に必要となるインターネット接続料金、通信料金等はお客様のご負担となります。"},
        {h:"送料について",p:"300円（全国一律）※有料コインを消費することでお支払いいただきます"},
        {h:"お支払時期・お支払方法",p:"有料コインの提供前に、\n・クレジットカード\n・銀行振込\n・コンビニ支払い\n・PayPay\n・メルペイ\n・ペイディ\n・amazon pay\nでお支払いいただきます。"},
        {h:"提供時期",p:"有料コインについてはお支払いの手続き完了後、直ちに提供いたします。\n\n尚、商品の発送に関しましては、申請後14日以内の発送手続きとさせていただいております。\n\n※天候や災害によって配送が遅れる場合がございます。"},
        {h:"返品・キャンセル",p:"有料コインの返品、交換、換金等はできません。\nまた商品の返品、交換についても受け付けておりません。"},
        {h:"資格・免許",p:""},
      ]
    }
  };
  const c=contents[type];
  return(
    <div style={{position:"fixed",inset:0,zIndex:3500,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0e0e1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:600,height:"85vh",display:"flex",flexDirection:"column",fontFamily:"'Noto Sans JP',sans-serif",border:"1px solid #1a1a2a"}}>
        {/* ヘッダー */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #1a1a2a",display:"flex",alignItems:"center",flexShrink:0}}>
          <div style={{flex:1,color:"#fff",fontWeight:900,fontSize:16}}>{c.title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        {/* 本文 */}
        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>
          <div style={{color:"#888",fontSize:11,marginBottom:20}}>最終更新日：{today}</div>
          {c.body.map((item,i)=>(
            <div key={i} style={{marginBottom:20}}>
              <div style={{color:"#ffd700",fontWeight:700,fontSize:13,marginBottom:6}}>{item.h}</div>
              <div style={{color:"#aaa",fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{item.p}</div>
            </div>
          ))}
        
        </div>
        <div style={{padding:"16px 24px 32px",flexShrink:0}}>
          <button onClick={onClose} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",color:"#888",padding:"14px",borderRadius:12,fontSize:14,cursor:"pointer"}}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ===== PhoneAuthModal =====
function PhoneAuthModal({onClose,onVerified}){
  const [step,setStep]=useState("phone");
  const [phone,setPhone]=useState("");
  const [code,setCode]=useState("");
  const [sent,setSent]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [timer,setTimer]=useState(0);
  useEffect(()=>{if(timer<=0)return;const t=setTimeout(()=>setTimer(v=>v-1),1000);return()=>clearTimeout(t);},[timer]);
  const send=()=>{
    const c=phone.replace(/\D/g,"");
    if(c.length<10||c.length>11){setErr("正しい電話番号を入力してください");return;}
    setErr("");setLoading(true);
    setTimeout(()=>{const d=String(Math.floor(1000+Math.random()*9000));setSent(d);setStep("code");setTimer(60);setLoading(false);},1200);
  };
  const verify=()=>{
    if(code.length!==4){setErr("4桁のコードを入力してください");return;}
    if(code!==sent){setErr("認証コードが違います");return;}
    setErr("");setStep("done");setTimeout(()=>{onVerified();onClose();},1800);
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0e0e1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,border:"1px solid #1a1a2a",fontFamily:"'Noto Sans JP',sans-serif",padding:"28px 24px 44px"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}><button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button></div>
        {step==="phone"&&(<>
          <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:40,marginBottom:10}}>📱</div><div style={{color:"#fff",fontWeight:900,fontSize:17}}>電話番号認証</div><div style={{color:"#555",fontSize:12,marginTop:6}}>SMS で認証コードを送信します</div></div>
          <div style={{marginBottom:12}}>
            <div style={{color:"#888",fontSize:11,marginBottom:6}}>電話番号（ハイフンなし）</div>
            <div style={{display:"flex",gap:8}}>
              <div style={{background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"13px 14px",color:"#888",fontSize:14,flexShrink:0}}>🇯🇵 +81</div>
              <input value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}} placeholder="09012345678" maxLength={11} style={{flex:1,background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"13px 16px",color:"#fff",fontSize:15,outline:"none"}}/>
            </div>
          </div>
          {err&&<div style={{color:"#ff6666",fontSize:12,marginBottom:10}}>{err}</div>}
          <button onClick={send} disabled={loading} style={{width:"100%",background:loading?"#333":"#d94f6e",border:"none",color:"#fff",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:loading?"not-allowed":"pointer",marginBottom:10}}>{loading?"送信中...":"認証コードを送信"}</button>
          <button onClick={onClose} style={{width:"100%",background:"transparent",border:"1px solid #2a2a3a",color:"#555",padding:"12px",borderRadius:12,fontSize:13,cursor:"pointer"}}>キャンセル</button>
        </>)}
        {step==="code"&&(<>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:40,marginBottom:10}}>🔐</div>
            <div style={{color:"#fff",fontWeight:900,fontSize:17}}>認証コードを入力</div>
            <div style={{color:"#555",fontSize:12,marginTop:6}}>{phone} に送信した4桁のコード</div>
            <div style={{marginTop:12,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"8px 16px",display:"inline-block"}}><span style={{color:"#888",fontSize:11}}>【デモ】認証コード: </span><span style={{color:"#ffd700",fontWeight:900,fontSize:18,letterSpacing:4}}>{sent}</span></div>
          </div>
          <input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,4));setErr("");}} placeholder="0000" maxLength={4} style={{width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:10,padding:"16px",color:"#fff",fontSize:24,textAlign:"center",letterSpacing:8,outline:"none",marginBottom:10}}/>
          {err&&<div style={{color:"#ff6666",fontSize:12,marginBottom:10}}>{err}</div>}
          <button onClick={verify} style={{width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"15px",borderRadius:12,fontSize:15,fontWeight:900,cursor:"pointer",marginBottom:10}}>認証する</button>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={()=>setStep("phone")} style={{background:"none",border:"none",color:"#555",fontSize:13,cursor:"pointer"}}>← 番号を変更</button>
            {timer>0?<span style={{color:"#555",fontSize:12}}>{timer}秒後に再送信可能</span>:<button onClick={send} style={{background:"none",border:"none",color:"#60b8ff",fontSize:13,cursor:"pointer"}}>再送信</button>}
          </div>
        </>)}
        {step==="done"&&<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:60,marginBottom:16}}>✅</div><div style={{color:"#fff",fontWeight:900,fontSize:18}}>認証完了！</div><div style={{color:"#555",fontSize:13,marginTop:8}}>電話番号の認証が完了しました</div></div>}
      </div>
    </div>
  );
}

// ===== AuthScreen =====
function AuthScreen({onLogin}){
  const [mode,setMode]=useState("top"); // top / login / register / phone / phoneCode
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [code,setCode]=useState("");
  const [sentCode,setSentCode]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [timer,setTimer]=useState(0);
  useEffect(()=>{if(timer<=0)return;const t=setTimeout(()=>setTimer(v=>v-1),1000);return()=>clearTimeout(t);},[timer]);

  // デモ用アカウント
  const DEMO_ACCOUNTS=[
    {email:"demo",pass:"demo",name:"デモユーザー"},
    {email:"test",pass:"test",name:"テストユーザー"},
  ];

  const handleLogin=()=>{
    setErr("");
    if(!email||!pass){setErr("メールアドレスとパスワードを入力してください");return;}
    setLoading(true);
    signInWithEmailAndPassword(auth,email,pass)
      .then(cred=>{onLogin({name:cred.user.displayName||email,email:cred.user.email,id:cred.user.uid});})
      .catch(e=>{setErr("メールアドレスまたはパスワードが違います");})
      .finally(()=>setLoading(false));
  };

  const handleRegister=()=>{
    setErr("");
    if(!name||!email||!pass){setErr("すべての項目を入力してください");return;}
    if(pass.length<6){setErr("パスワードは6文字以上にしてください");return;}
    setLoading(true);
    createUserWithEmailAndPassword(auth,email,pass)
      .then(cred=>{
        setDoc(doc(db,"users",cred.user.uid),{name,email,coins:1250,createdAt:new Date().toISOString()});
        onLogin({name,email:cred.user.email,id:cred.user.uid});
      })
      .catch(e=>{setErr("このメールアドレスはすでに使われています");})
      .finally(()=>setLoading(false));
  };

  const sendPhone=()=>{
    const cleaned=phone.replace(/\D/g,"");
    if(cleaned.length<10||cleaned.length>11){setErr("正しい電話番号を入力してください");return;}
    setErr("");setLoading(true);
    setTimeout(()=>{
      const d=String(Math.floor(1000+Math.random()*9000));
      setSentCode(d);setMode("phoneCode");setTimer(60);setLoading(false);
    },1200);
  };

  const verifyPhone=()=>{
    if(code!==sentCode){setErr("認証コードが違います");return;}
    setLoading(true);
    setTimeout(()=>{
      onLogin({name:"ユーザー"+phone.slice(-4),phone,id:"TEL-"+Math.random().toString(36).slice(2,8).toUpperCase()});
      setLoading(false);
    },800);
  };

  const BG="linear-gradient(160deg,#06060e,#0a0a1a,#060610)";
  const inputStyle={width:"100%",background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:12,padding:"14px 16px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"};
  const btnStyle={width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"15px",borderRadius:12,fontSize:16,fontWeight:900,cursor:"pointer",marginTop:8};
  const subBtnStyle={width:"100%",background:"transparent",border:"1px solid #2a2a3a",color:"#888",padding:"13px",borderRadius:12,fontSize:14,cursor:"pointer",marginTop:8};

  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans JP',sans-serif",padding:"0 24px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Cinzel:wght@700&display=swap'); @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>

      {/* ロゴ */}
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:6,color:"#444",marginBottom:8}}>POKEMON CARD</div>
        <div style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,fontSize:32,background:"linear-gradient(135deg,#fff 0%,#ffd700 50%,#ff9020 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200% auto",animation:"shimmer 3s linear infinite"}}>ポケモンオリパ</div>
      </div>

      <div style={{width:"100%",maxWidth:400,background:"#0e0e1a",borderRadius:24,border:"1px solid #1a1a2a",overflow:"hidden"}}>

        {/* トップ */}
        {mode==="top"&&(
          <div style={{padding:"32px 24px"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:48,marginBottom:12}}>🎴</div>
              <div style={{color:"#fff",fontWeight:900,fontSize:20,marginBottom:6}}>ログイン / 新規登録</div>
              <div style={{color:"#555",fontSize:13}}>アカウントでガチャを楽しもう</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={()=>{setMode("login");setErr("");}} style={{...btnStyle,marginTop:0}}>ログイン</button>
              <button onClick={()=>{setMode("register");setErr("");}} style={{...subBtnStyle,marginTop:0,color:"#60b8ff",borderColor:"#60b8ff33"}}>新規登録（無料）</button>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"8px 0"}}><div style={{flex:1,height:1,background:"#1a1a2a"}}/><span style={{color:"#333",fontSize:12}}>または</span><div style={{flex:1,height:1,background:"#1a1a2a"}}/></div>
              <button onClick={()=>{setMode("phone");setErr("");}} style={{...subBtnStyle,marginTop:0}}>📱 電話番号で続ける</button>
              <button onClick={()=>onLogin({name:"ゲスト",id:"GUEST-"+Math.random().toString(36).slice(2,6).toUpperCase(),isGuest:true})} style={{background:"transparent",border:"none",color:"#444",fontSize:12,cursor:"pointer",padding:"8px",marginTop:4}}>ゲストとして続ける（機能制限あり）</button>
            </div>
            {/* デモ用ヒント */}
            <div style={{marginTop:20,background:"rgba(255,215,0,0.06)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px 14px"}}>
              <div style={{color:"#ffd700",fontSize:11,fontWeight:700,marginBottom:4}}>📌 デモ用アカウント</div>
              <div style={{color:"#888",fontSize:11}}>メール: demo<br/>パスワード: demo</div>
            </div>
          </div>
        )}

        {/* ログイン */}
        {mode==="login"&&(
          <div style={{padding:"32px 24px"}}>
            <button onClick={()=>{setMode("top");setErr("");}} style={{background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer",marginBottom:16}}>←</button>
            <div style={{color:"#fff",fontWeight:900,fontSize:20,marginBottom:24}}>ログイン</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="メールアドレス" type="email" style={inputStyle}/>
              <input value={pass}  onChange={e=>{setPass(e.target.value);setErr("");}}  placeholder="パスワード"       type="password" style={inputStyle}/>
              {err&&<div style={{color:"#ff6666",fontSize:12,padding:"8px 12px",background:"rgba(255,60,60,0.1)",borderRadius:8}}>{err}</div>}
              <button onClick={handleLogin} disabled={loading} style={{...btnStyle,background:loading?"#555":"#d94f6e"}}>
                {loading?"確認中...":"ログイン"}
              </button>
              <button onClick={()=>{setMode("register");setErr("");}} style={subBtnStyle}>アカウントをお持ちでない方はこちら</button>
            </div>
          </div>
        )}

        {/* 新規登録 */}
        {mode==="register"&&(
          <div style={{padding:"32px 24px"}}>
            <button onClick={()=>{setMode("top");setErr("");}} style={{background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer",marginBottom:16}}>←</button>
            <div style={{color:"#fff",fontWeight:900,fontSize:20,marginBottom:24}}>新規登録</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={name}  onChange={e=>{setName(e.target.value);setErr("");}}  placeholder="ニックネーム"      style={inputStyle}/>
              <input value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="メールアドレス"    type="email" style={inputStyle}/>
              <input value={pass}  onChange={e=>{setPass(e.target.value);setErr("");}}  placeholder="パスワード（6文字以上）" type="password" style={inputStyle}/>
              {err&&<div style={{color:"#ff6666",fontSize:12,padding:"8px 12px",background:"rgba(255,60,60,0.1)",borderRadius:8}}>{err}</div>}
              <button onClick={handleRegister} disabled={loading} style={{...btnStyle,background:loading?"#555":"#d94f6e"}}>
                {loading?"登録中...":"登録してはじめる"}
              </button>
              <div style={{color:"#444",fontSize:10,textAlign:"center",lineHeight:1.6}}>登録することで利用規約・プライバシーポリシーに同意したものとみなします</div>
              <button onClick={()=>{setMode("login");setErr("");}} style={subBtnStyle}>すでにアカウントをお持ちの方</button>
            </div>
          </div>
        )}

        {/* 電話番号 */}
        {mode==="phone"&&(
          <div style={{padding:"32px 24px"}}>
            <button onClick={()=>{setMode("top");setErr("");}} style={{background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer",marginBottom:16}}>←</button>
            <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:36,marginBottom:8}}>📱</div><div style={{color:"#fff",fontWeight:900,fontSize:18}}>電話番号で登録</div><div style={{color:"#555",fontSize:12,marginTop:4}}>SMSで認証コードを送ります</div></div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <div style={{background:"#1a1a2a",border:"1px solid #2a2a3a",borderRadius:12,padding:"14px",color:"#888",fontSize:14,flexShrink:0}}>🇯🇵 +81</div>
              <input value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}} placeholder="09012345678" maxLength={11} style={{...inputStyle,margin:0}}/>
            </div>
            {err&&<div style={{color:"#ff6666",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(255,60,60,0.1)",borderRadius:8}}>{err}</div>}
            <button onClick={sendPhone} disabled={loading} style={{...btnStyle,background:loading?"#555":"#d94f6e"}}>{loading?"送信中...":"認証コードを送信"}</button>
            <button onClick={()=>{setMode("top");setErr("");}} style={subBtnStyle}>キャンセル</button>
          </div>
        )}

        {/* 電話番号コード確認 */}
        {mode==="phoneCode"&&(
          <div style={{padding:"32px 24px"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:8}}>🔐</div>
              <div style={{color:"#fff",fontWeight:900,fontSize:18}}>認証コードを入力</div>
              <div style={{color:"#555",fontSize:12,marginTop:4}}>{phone} に送信した4桁のコード</div>
              <div style={{marginTop:12,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"8px 16px",display:"inline-block"}}>
                <span style={{color:"#888",fontSize:11}}>【デモ】認証コード: </span>
                <span style={{color:"#ffd700",fontWeight:900,fontSize:18,letterSpacing:4}}>{sentCode}</span>
              </div>
            </div>
            <input value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,4));setErr("");}} placeholder="0000" maxLength={4} style={{...inputStyle,fontSize:24,textAlign:"center",letterSpacing:8,marginBottom:10}}/>
            {err&&<div style={{color:"#ff6666",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(255,60,60,0.1)",borderRadius:8}}>{err}</div>}
            <button onClick={verifyPhone} disabled={loading} style={{...btnStyle,background:loading?"#555":"#d94f6e"}}>{loading?"確認中...":"認証する"}</button>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
              <button onClick={()=>{setMode("phone");setErr("");}} style={{background:"none",border:"none",color:"#555",fontSize:13,cursor:"pointer"}}>← 番号を変更</button>
              {timer>0?<span style={{color:"#555",fontSize:12}}>{timer}秒後に再送信</span>:<button onClick={sendPhone} style={{background:"none",border:"none",color:"#60b8ff",fontSize:13,cursor:"pointer"}}>再送信</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== デッキ初期化 =====
function initDeck(){
  const deck=[];
  const sarCard=REAL_CARDS.sar[Math.floor(Math.random()*REAL_CARDS.sar.length)];
  deck.push({...sarCard,isReal:true,prizeRank:"1等"});
  const srShuffled=[...REAL_CARDS.sr].sort(()=>Math.random()-0.5);
  for(let i=0;i<Math.min(6,srShuffled.length);i++) deck.push({...srShuffled[i],isReal:true,prizeRank:"2等"});
  for(let i=0;i<13;i++) deck.push({name:"なにかのRRカード",rarity:"RR",image:"🎴",prizeRank:"3等"});
  for(let i=0;i<140;i++) deck.push({name:"なにかのRRカード",rarity:"RR",image:"🎴",prizeRank:"ハズレ"});
  return deck.sort(()=>Math.random()-0.5);
}

// ===== App =====
export default function App(){
  const [user,setUser]=useState(null);
  useEffect(()=>{
    const unsub=auth.onAuthStateChanged(u=>{
      if(u)setUser({name:u.displayName||u.email,email:u.email,id:u.uid});
      else setUser(null);
    });
    return()=>unsub();
  },[]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const coinsParam=params.get("coins");
    const userIdParam=params.get("userId");
    if(coinsParam&&userIdParam){
      const amount=parseInt(coinsParam);
      window.history.replaceState({},"","/");
      const ref=doc(db,"users",userIdParam);
      getDoc(ref).then(d=>{
        const current=d.exists()?d.data().coins||0:0;
        const currentIssued=d.exists()?d.data().totalIssued||0:0;
        setDoc(ref,{coins:current+amount,totalIssued:currentIssued+amount},{merge:true});
      });
    }
  },[]);
  const [ageConfirmed,setAgeConfirmed]=usePersistedState("ageConfirmed",false);
  const [ageLimit,setAgeLimit]=usePersistedState("ageLimit",null);
  const [monthlySpent,setMonthlySpent]=usePersistedState("monthlySpent",{month:"",amount:0});
  const [reveal,setReveal]=useState(null);
  const [revealPack,setRevealPack]=useState(null);
  const [multiReveal,setMultiReveal]=useState(null);
  const [pendingCards,setPendingCards]=usePersistedState("pendingCards",[]);
  const [showPendingCards,setShowPendingCards]=useState(false);
  const [detailPack,setDetailPack]=useState(null);
  const [history,setHistory]=usePersistedState("history",[]);
  const [page,setPage]=useState("home");
  const [notification,setNotification]=useState(null);
  const [sortOrder,setSortOrder]=useState("default");
  const [showSortMenu,setShowSortMenu]=useState(false);
  const [coins,setCoins]=usePersistedState("coins",1250);
  const [totalIssued,setTotalIssued]=usePersistedState("totalIssued",0); // 累計発行コイン残高

  const MAX_ISSUED=10000000; // 1000万コイン上限

  // コイン発行（購入時）：上限チェック付き
  const issueCoins=(amount)=>{
    if(totalIssued+amount>MAX_ISSUED){
      const canIssue=MAX_ISSUED-totalIssued;
      if(canIssue<=0){notify("現在コインの販売を一時停止しています（発行上限到達）");return false;}
      if(!isGuest&&user)setDoc(doc(db,"users",user.id),{coins:coins+canIssue,totalIssued:MAX_ISSUED},{merge:true});
      return true;
    }
    if(!isGuest&&user)setDoc(doc(db,"users",user.id),{coins:increment(amount),totalIssued:increment(amount)},{merge:true});
    return true;
  };
  const [mailCount]=useState(3);
  const [rank]=useState(42);
  const [showPhoneAuth,setShowPhoneAuth]=useState(false);
  const [phoneVerified,setPhoneVerified]=usePersistedState("phoneVerified",false);
  const [showBenefitModal,setShowBenefitModal]=useState(false);
  const [benefitDiscount,setBenefitDiscount]=usePersistedState("benefitDiscount",0);
  const [showAddressModal,setShowAddressModal]=useState(false);
  const [address,setAddress]=usePersistedState("address",null);
  const [showAdminPanel,setShowAdminPanel]=useState(false);
  const [shipRequests,setShipRequests]=usePersistedState("shipRequests",[]);
  const [showContact,setShowContact]=useState(false);
  const [showInvite,setShowInvite]=useState(false);
  const [inviteCount,setInviteCount]=usePersistedState("inviteCount",0);
  const [inviteCoins,setInviteCoins]=usePersistedState("inviteCoins",0);
  const [showLegal,setShowLegal]=useState(null); // "terms"|"privacy"|"tokusho"
  const [deck1,setDeck1]=useState(()=>initDeck());
  const [deck1Idx,setDeck1Idx]=useState(0);
  const [remainings,setRemainingMap]=useState(Object.fromEntries(PACKS.map(p=>[p.id,p.remaining])));

  const [showAuthModal,setShowAuthModal]=useState(false);
  const [showAgeCheck,setShowAgeCheck]=useState(false);
  const [pendingPurchase,setPendingPurchase]=useState(null); // 年齢確認後に実行する処理

  // 月次課金チェック（年齢確認込み）
  const checkMonthlyLimit=(cost,onPass)=>{
    if(!ageLimit?.monthly){onPass&&onPass();return true;}
    const nowMonth=new Date().toISOString().slice(0,7);
    const spent=monthlySpent.month===nowMonth?monthlySpent.amount:0;
    if(spent+cost>ageLimit.monthly){
      notify(`月額制限（¥${ageLimit.monthly.toLocaleString()}）に達しました。来月までお待ちください。`);
      return false;
    }
    setMonthlySpent({month:nowMonth,amount:spent+cost});
    onPass&&onPass();
    return true;
  };

  // 未ログインは自動的にゲスト扱い
  const isGuest = !user || user.isGuest;
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(()=>{
    if(!user||isGuest)return;
    getDoc(doc(db,"admins",user.id)).then(d=>{if(d.exists())setIsAdmin(true);else setIsAdmin(false);});
  },[user]);
  // Firestoreから口数をリアルタイム読み込み
useEffect(()=>{
  const unsub=onSnapshot(doc(db,"packs","pack1"),(d)=>{
    if(d.exists()){
      setRemainingMap(prev=>({...prev,1:d.data().remaining}));
    }
  });
  return()=>unsub();
},[]);
  useEffect(()=>{
    if(!user||isGuest)return;
    const ref=doc(db,"users",user.id);
    const unsub=onSnapshot(ref,(d)=>{
      if(d.exists()){
        const data=d.data();
        if(data.coins!==undefined)setCoins(data.coins);
        if(data.totalIssued!==undefined)setTotalIssued(data.totalIssued);
      }
    });
    return()=>unsub();
  },[user]);

  // ログインが必要なアクションのガード
  const requireLogin=(fn)=>{
    if(isGuest){setShowAuthModal(true);return;}
    fn();
  };
  const packs=PACKS.map(p=>({...p,remaining:remainings[p.id]}));
  const notify=(msg)=>{setNotification(msg);setTimeout(()=>setNotification(null),2200);};

  const drawPack1Card = (idx) => deck1[idx] || {name:"なにかのRRカード",rarity:"RR",image:"🎴",prizeRank:"ハズレ"};

  const doDraw=(pack)=>requireLogin(()=>{
    if(remainings[pack.id]<=0){notify("残り口数がありません");return;}
    if(coins<pack.price){notify(`コインが足りません 🪙 (必要: ${pack.price.toLocaleString()})`);return;}
    let card;
    if(pack.id===1){
      card = drawPack1Card(deck1Idx);
      setDeck1Idx(i=>i+1);
    } else {
      card = drawCard(pack.id);
    }
    const prize=card.prizeRank
      ? pack.prizes.find(p=>p.rank===card.prizeRank)
      : pack.prizes.find(p=>p.rarity===card.rarity);
    setHistory(prev=>[{...card,packName:pack.name,date:new Date().toLocaleTimeString(),prize},...prev]);
    if(!isGuest&&user){setDoc(doc(db,"users",user.id),{coins:increment(-pack.price),totalIssued:increment(-pack.price)},{merge:true});}
    else{setCoins(c=>c-pack.price);setTotalIssued(t=>Math.max(0,t-pack.price));}
    if(pack.id===1)setDoc(doc(db,"packs","pack1"),{remaining:Math.max(0,remainings[pack.id]-1)},{merge:true});
    setRemainingMap(prev=>({...prev,[pack.id]:Math.max(0,prev[pack.id]-1)}));
    if(pack.id===1)setDoc(doc(db,"packs","pack1"),{remaining:Math.max(0,remainings[pack.id]-1)},{merge:true});
    const cardWithPrize={...card,packName:pack.name,date:new Date().toLocaleTimeString(),prize};
    const singleMulti={cards:[cardWithPrize],pack:{...pack,remaining:remainings[pack.id]}};
    setReveal(card);
    setRevealPack({...pack,remaining:remainings[pack.id],_afterMulti:singleMulti});
  });

  const doMultiDraw=(pack,count)=>requireLogin(()=>{
    const actual=Math.min(count,remainings[pack.id]);
    if(actual<=0){notify("残り口数がありません");return;}
    const totalCost=pack.price*actual;
    if(coins<totalCost){notify(`コインが足りません 🪙 (必要: ${totalCost.toLocaleString()})`);return;}
    let cards;
    if(pack.id===1){
      cards = [];
      for(let i=0;i<actual;i++) cards.push(drawPack1Card(deck1Idx+i));
      setDeck1Idx(i=>i+actual);
    } else {
      cards = [...Array(actual)].map(()=>drawCard(pack.id));
    }
    const prizes=cards.map(c=>c.prizeRank
      ? pack.prizes.find(p=>p.rank===c.prizeRank)
      : pack.prizes.find(p=>p.rarity===c.rarity));
    setHistory(prev=>[...cards.map((c,i)=>({...c,packName:pack.name,date:new Date().toLocaleTimeString(),prize:prizes[i]})),...prev]);
    if(!isGuest&&user){setDoc(doc(db,"users",user.id),{coins:increment(-totalCost),totalIssued:increment(-totalCost)},{merge:true});}
    else{setCoins(c=>c-totalCost);setTotalIssued(t=>Math.max(0,t-totalCost));}
    if(pack.id===1)setDoc(doc(db,"packs","pack1"),{remaining:Math.max(0,remainings[pack.id]-actual)},{merge:true});
    setRemainingMap(prev=>({...prev,[pack.id]:Math.max(0,prev[pack.id]-actual)}));
    if(pack.id===1)setDoc(doc(db,"packs","pack1"),{remaining:Math.max(0,remainings[pack.id]-actual)},{merge:true});
    const snap={...pack,remaining:remainings[pack.id]};
    const multi={cards,pack:snap};
    const RO={"1等":0,"2等":1,"3等":2,"4等":3,"ハズレ":4};
    const winners=cards.map((c,i)=>({card:c,prize:prizes[i]})).filter(x=>x.prize&&x.prize.rank!=="ハズレ"&&x.prize.rank!=="4等").sort((a,b)=>(RO[a.prize.rank]??99)-(RO[b.prize.rank]??99));
    setReveal(winners.length>0?winners[0].card:cards[0]);
    setRevealPack({...snap,_afterMulti:multi});
  });

  const mySections=[
    {title:"アカウント",items:[
      {label:"アカウント",right:<span style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:isGuest?"#555":"#ccc",fontSize:13}}>{isGuest?"未登録":user?.name}</span><span style={{fontSize:22}}>{isGuest?"👤":"👤"}</span></span>,onPress:isGuest,action:isGuest?()=>setShowAuthModal(true):undefined},
      {label:"ユーザーID",right:<span style={{color:"#888",fontSize:11,letterSpacing:0.5}}>{isGuest?"未登録":user?.id}</span>,onPress:false},
      {label:"年齢区分",right:<span style={{color:ageLimit?.monthly?ageLimit.age<=14?"#60b8ff":"#ffd700":"#2ecc71",fontSize:12,fontWeight:700}}>{ageLimit?.label||"未設定"}{ageLimit?.monthly?` (月¥${ageLimit.monthly.toLocaleString()}まで)`:""}</span>,onPress:false},
      {label:"電話番号認証",right:phoneVerified?<span style={{color:"#2ecc71",fontSize:13,fontWeight:700}}>認証済み</span>:<span style={{color:"#d94f6e",fontSize:13,fontWeight:700}}>未認証 ›</span>,onPress:!phoneVerified,action:()=>setShowPhoneAuth(true)},
      {label:"メールアドレス",right:"›",onPress:true},
      {label:"送付先設定",right:address?<span style={{color:"#2ecc71",fontSize:12}}>登録済み ›</span>:"›",onPress:true,action:()=>setShowAddressModal(true)},
      {label:"特典コード入力",right:benefitDiscount>0?<span style={{color:"#2ecc71",fontSize:13,fontWeight:700}}>{benefitDiscount}%OFF適用中</span>:"›",onPress:true,action:()=>setShowBenefitModal(true)},
      {label:"友達招待",right:"›",onPress:true,action:()=>isGuest?setShowAuthModal(true):setShowInvite(true)},
      {label:"LINE連携",right:<span style={{color:"#2ecc71",fontSize:13,fontWeight:700}}>連携済み</span>,onPress:false},
      {label:<span>アカウント連携 <span style={{fontSize:13}}>G 🍎</span></span>,right:"›",onPress:true},
      {label:isGuest?"ログイン / 新規登録":"ログアウト",right:"›",onPress:true,danger:!isGuest,action:isGuest?()=>setShowAuthModal(true):()=>{setUser(null);setPage("home");}},
    ]},
    {title:"サポート",items:[
      {label:"お問い合わせ",right:"›",onPress:true,action:()=>setShowContact(true)},{label:"よくある質問",right:"›",onPress:true},
      {label:"利用規約",right:"›",onPress:true,action:()=>setShowLegal("terms")},{label:"プライバシーポリシー",right:"›",onPress:true,action:()=>setShowLegal("privacy")},{label:"特定商取引法に基づく表記",right:"›",onPress:true,action:()=>setShowLegal("tokusho")},
    ]},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#06060e",fontFamily:"'Noto Sans JP',sans-serif"}}>
      <style>{FONT}</style>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#06060e} ::-webkit-scrollbar-thumb{background:#1a1a2a;border-radius:2px}`}</style>

      {notification&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.4)",color:"#ffd700",padding:"10px 28px",borderRadius:30,fontSize:13,zIndex:3000,backdropFilter:"blur(12px)",whiteSpace:"nowrap"}}>{notification}</div>}

      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(6,6,14,0.97)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{height:52,display:"flex",alignItems:"center",gap:10,padding:"0 16px"}}>
          <div style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,fontSize:14}}>
            <span style={{background:"linear-gradient(90deg,#ffd700,#ff9020)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ポケモン</span>
            <span style={{color:"#222",fontSize:11,fontWeight:400}}>オリパ</span>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:20,padding:"5px 12px"}}>
              <span style={{fontSize:14}}>🪙</span><span style={{color:"#ffd700",fontWeight:900,fontSize:13}}>{isGuest?"0":coins.toLocaleString()}</span>
              {!isGuest&&inviteCoins>0&&(
                <span style={{display:"flex",alignItems:"center",gap:3,marginLeft:4}}>
                  <img src={INVITE_COIN} alt="招待コイン" style={{width:16,height:16}}/>
                  <span style={{color:"#ffd700",fontWeight:900,fontSize:12}}>{inviteCoins}</span>
                </span>
              )}
              <button onClick={()=>setPage("shop")} style={{background:"#ffd700",border:"none",color:"#000",width:18,height:18,borderRadius:"50%",fontSize:12,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
            </div>
            <button onClick={()=>notify("メール機能は準備中です")} style={{position:"relative",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center"}}>
              ✉️{!isGuest&&mailCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#ff3355",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{mailCount}</span>}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(96,184,255,0.1)",border:"1px solid rgba(96,184,255,0.3)",borderRadius:20,padding:"5px 12px"}}>
              <span style={{fontSize:12}}>⭐</span><span style={{color:"rgba(255,255,255,0.5)",fontSize:10}}>Lv</span><span style={{color:"#60b8ff",fontWeight:900,fontSize:13}}>{rank}</span>
            </div>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"36px 20px 100px"}}>
        {page==="home"&&(
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:8,color:"#222",marginBottom:16}}>POKEMON CARD ORIGINAL PACK</div>
            <h1 style={{fontFamily:"'Noto Sans JP',sans-serif",fontSize:"clamp(30px,5vw,56px)",fontWeight:900,lineHeight:1.15,marginBottom:16,background:"linear-gradient(135deg,#fff 0%,#ffd700 45%,#ff9020 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200% auto",animation:"shimmer 4s linear infinite"}}>ポケモンカード<br/>オリジナルパック</h1>
            <p style={{color:"#444",fontSize:14,lineHeight:2,marginBottom:40}}>最高級レアカードが眠るオリパ。<br/>1口から気軽にチャレンジ！</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,maxWidth:400,margin:"0 auto"}}>
              {[{page:"lineup",label:"オリパを引く",icon:"🎴",color:"#ffd700",desc:"現在販売中のパック",action:()=>requireLogin(()=>setPage("lineup"))},{page:"shop",label:"コインを買う",icon:"🛒",color:"#60b8ff",desc:"各種コインプラン",action:()=>setPage("shop")},{page:"history",label:"当選履歴",icon:"📋",color:"#88ddaa",desc:"引いたカードの記録",action:()=>setPage("history")},{page:"mypage",label:"マイページ",icon:"👤",color:"#aaaacc",desc:"アカウント情報",action:()=>user?setPage("mypage"):setShowAuthModal(true)}].map(item=>(
                <button key={item.page} onClick={item.action||(() =>setPage(item.page))} style={{background:"#0e0e1a",border:`1px solid ${item.color}33`,borderRadius:16,padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=`${item.color}66`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=`${item.color}33`;}}>
                  <span style={{fontSize:32}}>{item.icon}</span>
                  <div style={{color:item.color,fontWeight:900,fontSize:13}}>{item.label}</div>
                  <div style={{color:"#444",fontSize:10}}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {page==="lineup"&&<LineupPage packs={packs} sortOrder={sortOrder} setSortOrder={setSortOrder} showSortMenu={showSortMenu} setShowSortMenu={setShowSortMenu} onDraw={doDraw} onMultiDraw={doMultiDraw} onDetail={(pack)=>setDetailPack(pack)}/>}

        {page==="history"&&<WinReportPage user={user} isGuest={isGuest} onRequireLogin={()=>setShowAuthModal(true)}/>}
        {page==="ranking"&&<RankingPage history={history} user={user} coins={coins} inviteCount={inviteCount}/>}

        {page==="shop"&&<ShopPage notify={notify} discount={benefitDiscount} onPurchase={(amount)=>issueCoins(amount)} checkLimit={checkMonthlyLimit} ageLimit={ageLimit} userId={user?.id}/>}

        {page==="mypage"&&(
          <div style={{fontFamily:"'Noto Sans JP',sans-serif",maxWidth:500,margin:"0 auto"}}>
            {/* ゲスト時のログイン促進バナー */}
            {isGuest&&(
              <div style={{background:"linear-gradient(135deg,rgba(217,79,110,0.15),rgba(255,144,32,0.1))",border:"1px solid rgba(217,79,110,0.3)",borderRadius:16,padding:"16px",marginBottom:16,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>🔓</div>
                <div style={{color:"#fff",fontWeight:900,fontSize:15,marginBottom:4}}>ゲストモードで閲覧中</div>
                <div style={{color:"#888",fontSize:12,marginBottom:12,lineHeight:1.6}}>ログイン・登録するとガチャを引いたり<br/>コインを管理できます</div>
                <button onClick={()=>setShowAuthModal(true)} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"12px 32px",borderRadius:30,fontWeight:900,fontSize:14,cursor:"pointer"}}>
                  ログイン / 新規登録
                </button>
              </div>
            )}
            <div style={{padding:"16px 0 20px",borderBottom:"1px solid #1a1a2a"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{minWidth:90}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:2}}><span style={{color:"#888",fontSize:11}}>Lv</span><span style={{color:"#fff",fontWeight:900,fontSize:36,lineHeight:1}}>{isGuest?"0":rank}</span></div>
                  <div style={{background:"#1a1a2a",borderRadius:4,height:6,marginTop:6,overflow:"hidden",width:90}}><div style={{width:isGuest?"0%":"62%",height:"100%",background:"linear-gradient(90deg,#d94f6e,#ff8099)",borderRadius:4}}/></div>
                </div>
                <div style={{flex:1}}/>
                {/* 招待コイン */}
                <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:20,padding:"4px 12px"}}>
                  <img src={INVITE_COIN} alt="招待コイン" style={{width:20,height:20}}/>
                  <span style={{color:"#ffd700",fontWeight:900,fontSize:14}}>{isGuest?"0":inviteCoins}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,60,80,0.12)",border:"1px solid rgba(255,60,80,0.3)",borderRadius:20,padding:"5px 14px"}}><span style={{color:"#d94f6e",fontWeight:900,fontSize:13}}>P</span><span style={{color:"#fff",fontWeight:900,fontSize:14}}>{isGuest?"0":"3,520"}</span></div>

            {/* 獲得カード一覧ボタン */}
            <div style={{margin:"16px 0 8px"}}>
              <button onClick={()=>isGuest?setShowAuthModal(true):setShowPendingCards(true)} style={{width:"100%",background:"#0e0e1a",border:"1px solid #2a2a3a",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                onMouseLeave={e=>e.currentTarget.style.background="#0e0e1a"}
              >
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>🎴</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{color:"#fff",fontWeight:700,fontSize:14}}>獲得カード一覧</div>
                    <div style={{color:"#555",fontSize:11,marginTop:2}}>{isGuest?"ログインが必要です":`${pendingCards.length}枚 未処理`}</div>
                  </div>
                </div>
                <span style={{color:"#555",fontSize:18}}>›</span>
              </button>
            </div>
                <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:20,padding:"5px 12px"}}><span style={{fontSize:14}}>🪙</span><span style={{color:"#ffd700",fontWeight:900,fontSize:14}}>{isGuest?"0":coins.toLocaleString()}</span><button onClick={()=>isGuest?setShowAuthModal(true):setPage("shop")} style={{background:"#ffd700",border:"none",color:"#000",width:18,height:18,borderRadius:"50%",fontSize:12,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👑</div>
              </div>
            </div>
            {mySections.map(section=>(
              <div key={section.title} style={{marginTop:24}}>
                <div style={{background:"#1a1a2a",padding:"10px 16px",color:"#888",fontSize:13,fontWeight:700,letterSpacing:1}}>{section.title}</div>
                {section.items.map((item,i)=>(
                  <div key={i} onClick={item.onPress?(item.action||(() =>notify("準備中です"))):undefined} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px",borderBottom:"1px solid #1a1a2a",cursor:item.onPress?"pointer":"default"}} onMouseEnter={e=>{if(item.onPress)e.currentTarget.style.background="rgba(255,255,255,0.03)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{color:item.danger?"#d94f6e":"#ddd",fontSize:14}}>{item.label}</span>
                    <span style={{color:item.right==="›"?"#555":"inherit",fontSize:item.right==="›"?20:13}}>{item.right}</span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{height:32}}/>
          </div>
        )}
      </main>

      <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"rgba(8,8,18,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.06)",height:64,display:"flex",alignItems:"stretch"}}>
        {[{id:"home",label:"ホーム",icon:"🏠"},{id:"lineup",label:"ガチャ",icon:"🎴"},{id:"shop",label:"ショップ",icon:"🛒"},{id:"history",label:"当選報告",icon:"🎉"},{id:"ranking",label:"ランキング",icon:"🏆"},{id:"mypage",label:"マイページ",icon:"👤"}].map(tab=>(
          <button key={tab.id} onClick={()=>setPage(tab.id)} style={{flex:1,background:"transparent",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",borderTop:page===tab.id?"2px solid #ffd700":"2px solid transparent",transition:"all 0.15s"}}>
            <span style={{fontSize:20}}>{tab.icon}</span>
            <span style={{fontSize:9,fontFamily:"'Noto Sans JP',sans-serif",color:page===tab.id?"#ffd700":"#444",fontWeight:page===tab.id?700:400}}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {detailPack&&<PackDetail pack={packs.find(p=>p.id===detailPack.id)||detailPack} onClose={()=>setDetailPack(null)} onDraw={doDraw} onMultiDraw={doMultiDraw}/>}
      {reveal&&revealPack&&<CardReveal card={reveal} pack={revealPack} onClose={()=>{setReveal(null);setRevealPack(null);}} onConfirm={()=>{setReveal(null);setRevealPack(null);}} onRedeem={()=>{const singleCard=revealPack._singleCard;const rank=singleCard?.prizeRank||"ハズレ";const amount=rank==="1等"?10000:rank==="2等"?2000:rank==="3等"?1000:1;if(!isGuest&&user){setDoc(doc(db,"users",user.id),{coins:increment(amount),totalIssued:increment(amount)},{merge:true});}else{setCoins(c=>c+amount);}if(singleCard)setPendingCards(p=>p.filter(c=>c.date!==singleCard.date));notify(`+${amount.toLocaleString()}コイン 還元しました！🪙`);setReveal(null);setRevealPack(null);}}/>}
      {multiReveal&&<MultiReveal cards={multiReveal.cards} pack={multiReveal.pack}
        onClose={(remainCards)=>{
          if(remainCards&&remainCards.length>0)setPendingCards(p=>[...p,...remainCards]);
          else if(multiReveal?.cards)setPendingCards(p=>[...p,...multiReveal.cards]);
          setMultiReveal(null);
        }}
        onShip={(checkedIdx,allCards)=>{
          const shipped=allCards.filter((_,i)=>checkedIdx.has(i));
          const remaining=allCards.filter((_,i)=>!checkedIdx.has(i));
          if(remaining.length>0) setPendingCards(p=>[...p,...remaining]);
          // 発送申請を追加
          setShipRequests(prev=>[...prev,{
            id:"REQ-"+Date.now(),
            user:user?.name||"ゲスト",
            userId:user?.id||"GUEST",
            cards:shipped,
            address:address||null,
            status:"pending", // pending / shipped / done
            date:new Date().toLocaleString(),
          }]);
          notify(`${checkedIdx.size}枚の発送申請を受け付けました 📦`);
          setMultiReveal(null);
        }}
        onRedeem={(amount,checkedIdx,allCards)=>{
          // 還元：チェック済みを還元、残りは保留へ
          const remaining=allCards.filter((_,i)=>!checkedIdx.has(i));
          if(remaining.length>0)setPendingCards(p=>[...p,...remaining]);
          if(!isGuest&&user){setDoc(doc(db,"users",user.id),{coins:increment(amount),totalIssued:increment(amount)},{merge:true});}else{setCoins(c=>c+amount);}
          notify(`+${amount.toLocaleString()}コイン 還元しました！🪙`);
          setMultiReveal(null);
        }}
      />}
      {showPendingCards&&(
        <div style={{position:"fixed",inset:0,zIndex:2000,background:"#f0f0f0",display:"flex",flexDirection:"column",fontFamily:"'Noto Sans JP',sans-serif"}}>
          <div style={{background:"#fff",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #eee",flexShrink:0}}>
            <div style={{fontWeight:900,fontSize:16,color:"#111"}}>獲得カード一覧</div>
            <button onClick={()=>setShowPendingCards(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>✕</button>
          </div>
          <div style={{flex:1,overflow:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {pendingCards.length===0?(
              <div style={{textAlign:"center",color:"#aaa",padding:"60px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>🎴</div>
                <div style={{fontSize:14}}>未処理のカードはありません</div>
              </div>
            ):pendingCards.map((card,i)=>{
              const rank=card.prizeRank||"ハズレ";
              const isHazure=rank==="ハズレ";
              const is3=rank==="3等";
              const coinVal=rank==="1等"?"10,000":rank==="2等"?"2,000":rank==="3等"?"1,000":"1";
              return(
                <div key={i} style={{background:"#fff",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                  <div style={{width:90,height:126,flexShrink:0,borderRadius:8,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
                    {isHazure?<NanikaCard size={90} showText={true}/>
                      :is3?<SantouCard size={90} showText={true}/>
                      :card.isReal?<img src={card.img} alt={card.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      :<div style={{width:"100%",height:"100%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{card.image}</div>
                    }
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:"#111",fontWeight:900,fontSize:14,marginBottom:6}}>{isHazure||is3?"なにかのカード-ポケモン":card.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff9020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000"}}>C</div>
                      <span style={{fontWeight:900,fontSize:20,color:"#111"}}>{coinVal}</span>
                    </div>
                    {rank!=="ハズレ"&&<div style={{display:"inline-block",background:rank==="1等"?"linear-gradient(135deg,#ffd700,#ff9020)":rank==="2等"?"linear-gradient(135deg,#ffd700,#b8860b)":"linear-gradient(135deg,#60b8ff,#1a5fc8)",borderRadius:20,padding:"2px 10px",color:"#000",fontWeight:900,fontSize:11}}>{rank}</div>}
                  </div>
                  <button onClick={()=>{
                    const amount=parseInt(coinVal.replace(/,/g,""))||0;
                    if(!isGuest&&user){setDoc(doc(db,"users",user.id),{coins:increment(amount),totalIssued:increment(amount)},{merge:true});}else{setCoins(c=>c+amount);}
                    setPendingCards(p=>p.filter((_,j)=>j!==i));
                    notify(`+${amount.toLocaleString()}コイン 還元しました！🪙`);
                  }} style={{background:"#d94f6e",border:"none",color:"#fff",padding:"8px 14px",borderRadius:20,fontWeight:900,fontSize:12,cursor:"pointer",flexShrink:0}}>還元</button>
                </div>
              );
            })}
          </div>
          {pendingCards.length>0&&(
            <div style={{background:"#fff",borderTop:"1px solid #eee",padding:"16px 20px 28px",flexShrink:0}}>
              <button onClick={()=>{
                const total=pendingCards.reduce((s,c)=>{
                  const rank=c.prizeRank||"ハズレ";
                  const v=rank==="1等"?10000:rank==="2等"?2000:rank==="3等"?1000:1;
                  return s+v;
                },0);
                setCoins(c=>c+total);
                setPendingCards([]);
                notify(`+${total.toLocaleString()}コイン 全て還元しました！🪙`);
                setShowPendingCards(false);
              }} style={{width:"100%",background:"#d94f6e",border:"none",color:"#fff",padding:"16px",borderRadius:30,fontWeight:900,fontSize:16,cursor:"pointer"}}>
                全て還元する（{pendingCards.length}枚）
              </button>
            </div>
          )}
        </div>
      )}
      {showLegal&&<LegalModal type={showLegal} onClose={()=>setShowLegal(null)}/>}
      {showInvite&&<InviteModal onClose={()=>setShowInvite(false)} user={user} onInviteUsed={(bonus)=>{setInviteCoins(c=>c+bonus);setInviteCount(n=>n+1);notify(`招待コード適用！招待コイン×${bonus}獲得🎉`);}}/>}
      {showContact&&<ContactModal onClose={()=>setShowContact(false)} user={user}/>}
      {showAgeCheck&&<AgeCheckModal onConfirm={(limit)=>{setAgeLimit(limit);setAgeConfirmed(true);setShowAgeCheck(false);if(pendingPurchase){pendingPurchase();setPendingPurchase(null);}}}/>}
      {showPhoneAuth&&<PhoneAuthModal onClose={()=>setShowPhoneAuth(false)} onVerified={()=>{setPhoneVerified(true);notify("電話番号認証が完了しました！");}}/>}
      {showBenefitModal&&<BenefitCodeModal onClose={()=>setShowBenefitModal(false)} currentDiscount={benefitDiscount} onApply={(pct)=>{setBenefitDiscount(pct);notify(`特典コード適用！コインが${pct}%OFFになりました 🎉`);setShowBenefitModal(false);}}/>}
      {showAddressModal&&<AddressModal current={address} onClose={()=>setShowAddressModal(false)} onSave={(addr)=>{setAddress(addr);notify("住所を登録しました！");setShowAddressModal(false);}}/>}
      {showAdminPanel&&<AdminPanel requests={shipRequests} onUpdate={(id,status)=>{setShipRequests(prev=>prev.map(r=>r.id===id?{...r,status}:r));}} onClose={()=>setShowAdminPanel(false)} totalIssued={totalIssued} maxIssued={MAX_ISSUED}/>}

      {/* ログインモーダル */}
      {showAuthModal&&(
        <div style={{position:"fixed",inset:0,zIndex:4000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{width:"100%",maxWidth:440,position:"relative"}}>
            <button onClick={()=>setShowAuthModal(false)} style={{position:"absolute",top:-48,right:0,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",fontSize:16,cursor:"pointer",borderRadius:20,padding:"6px 16px",zIndex:1}}>✕ 閉じる</button>
            <AuthScreen onLogin={(u)=>{setUser(u);setShowAuthModal(false);notify(`ようこそ、${u.name}さん！🎉`);}}/>
          </div>
        </div>
      )}

      {/* 管理者ボタン（右下固定） */}
      {isAdmin&&(
        <button onClick={()=>setShowAdminPanel(true)} style={{position:"fixed",bottom:80,right:16,zIndex:500,background:"#1a1a2a",border:"1px solid #333",color:"#ffd700",borderRadius:"50%",width:44,height:44,fontSize:18,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          ⚙️
        </button>
      )}
    </div>
  );
}
