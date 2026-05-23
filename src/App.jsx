import { useState, useEffect, useRef, useMemo } from "react";

const REAL_CARDS = {
  sar: [
    {name:"メガルカリオ ex",rarity:"SAR",img:""},
  ],
  sr: [
    {name:"メガズルズキン ex",rarity:"SAR",img:""},
    {name:"ルリナ",rarity:"SR",img:""},
    {name:"サイトウ",rarity:"HR",img:""},
    {name:"ビクティニ",rarity:"AR",img:""},
    {name:"メガカイリュー ex",rarity:"MA",img:""},
    {name:"ナンジャモのハラバリー ex",rarity:"UR",img:""},
  ],
  lucario: "",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Noto+Sans+JP:wght@400;700;900&display=swap');`;

const BG_LUCARIO = "";

const IMG_1000COIN = "";
const IMG_KAKUMEI = "";

const INVITE_COIN = "";

const PACKS = [
  { id:1, name:"メガルカリオ ex パック", subtitle:"MEGA LUCARIO EX PACK", price:300, total:160, remaining:143, accent:"#ffd700", bg:"linear-gradient(160deg,#0a1628,#1a2d50)", headerBg:"linear-gradient(135deg,#1565c0,#0d47a1)", tag:"人気No.1", note:"1/8で3等以上確定！", category:"regular",
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
function CardReveal({card,pack,onClose,onConfirm}){
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
            <div style={{fontFamily:"'Noto Sans JP',sans-serif",fontWeight:900,fontSize:rankNum===1?30:rankNum===2?26:22,color:rankNum===1?"#fff":cs.border,textShadow:`0 0 40px ${cs.glow}`,marginBottom:16,letterSpa
