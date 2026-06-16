import { useState, useEffect, useRef } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  void:"#030A05",base:"#071410",surface:"#0E1F10",raised:"#142818",high:"#1A3320",
  emerald:"#00C853",emeraldBright:"#00E676",emeraldDeep:"#00952C",
  emeraldGlow:"rgba(0,200,83,0.28)",emeraldTrace:"rgba(0,200,83,0.10)",emeraldFaint:"rgba(0,200,83,0.04)",
  gold:"#B8960C",goldBright:"#D4AC0D",goldGlow:"rgba(184,150,12,0.25)",
  goldTrace:"rgba(184,150,12,0.10)",goldFaint:"rgba(184,150,12,0.05)",
  forest:"#4CAF50",canopy:"#1B5E20",
  glass:"rgba(0,200,83,0.03)",glassMid:"rgba(0,200,83,0.06)",
  border:"rgba(0,200,83,0.14)",borderMid:"rgba(0,200,83,0.26)",borderHigh:"rgba(0,200,83,0.50)",
  ink:"#E8F5E9",inkOff:"rgba(232,245,233,0.90)",inkMid:"rgba(232,245,233,0.60)",
  inkDim:"rgba(232,245,233,0.36)",inkFaint:"rgba(232,245,233,0.14)",inkTrace:"rgba(232,245,233,0.06)",
  good:"#00C853",goodPale:"rgba(0,200,83,0.10)",goodBorder:"rgba(0,200,83,0.25)",
  warn:"#B8960C",warnPale:"rgba(184,150,12,0.10)",warnBorder:"rgba(184,150,12,0.25)",
  bad:"#D32F2F",badPale:"rgba(211,47,47,0.10)",badBorder:"rgba(211,47,47,0.25)",
  violet:"#7B1FA2",violetPale:"rgba(123,31,162,0.10)",violetBorder:"rgba(123,31,162,0.25)",
  display:"'Playfair Display', Georgia, serif",
  body:"'Inter', system-ui, sans-serif",
  mono:"'DM Mono', 'IBM Plex Mono', monospace",
};

const SP = {
  snap:{type:"spring",stiffness:500,damping:32},
  arrive:{type:"spring",stiffness:340,damping:28},
  press:{type:"spring",stiffness:600,damping:36,mass:0.8},
  score:{type:"spring",stiffness:140,damping:22,mass:1.6},
  vine:{type:"spring",stiffness:200,damping:28,mass:1},
  spore:{type:"spring",stiffness:300,damping:26,mass:1.2},
};

function scoreColor(s){return s>=75?C.good:s>=50?C.warn:C.bad;}
function scorePale(s){return s>=75?C.goodPale:s>=50?C.warnPale:C.badPale;}
function scoreBorder(s){return s>=75?C.goodBorder:s>=50?C.warnBorder:C.badBorder;}
function scoreWord(s){return s>=75?"Strong":s>=50?"Moderate":"Weak";}
function scoreNote(s){
  if(s>=75)return"Well-structured, inclusive, and searchable. Ready to post.";
  if(s>=50)return"Functional but improvable. Address flagged issues before posting.";
  return"Significant revision needed. Do not post in current form.";
}
function readingLevelLabel(score){
  if(score>=90)return"Very Easy";if(score>=80)return"Easy";
  if(score>=70)return"Fairly Easy";if(score>=60)return"Standard";
  if(score>=50)return"Fairly Hard";if(score>=30)return"Hard";
  return"Very Hard";
}
function fleschScore(text){
  if(!text||text.trim()==="")return 0;
  const sentences=text.split(/[.!?]+/).filter(s=>s.trim().length>0).length||1;
  const words=text.trim().split(/\s+/).filter(w=>w.length>0);
  if(!words.length)return 0;
  const syllables=words.reduce((acc,w)=>{
    const clean=w.toLowerCase().replace(/[^a-z]/g,"");
    if(!clean.length)return acc;
    let count=clean.split(/[aeiou]/).length-1;
    if(clean.endsWith("e"))count--;
    return acc+Math.max(1,count);
  },0);
  return Math.round(206.835-1.015*(words.length/sentences)-84.6*(syllables/words.length));
}

async function extractPDF(file){
  return new Promise(resolve=>{
    const r=new FileReader();
    r.onload=async e=>{
      try{
        const lib=window.pdfjsLib;
        if(lib){
          lib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const pdf=await lib.getDocument({data:new Uint8Array(e.target.result)}).promise;
          let text="";
          for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map(x=>x.str).join(" ")+"\n";}
          resolve(text.trim());
        }else{const r2=new FileReader();r2.onload=te=>resolve(te.target.result||"");r2.readAsText(file);}
      }catch{const r2=new FileReader();r2.onload=te=>resolve(te.target.result||"");r2.readAsText(file);}
    };
    r.readAsArrayBuffer(file);
  });
}

const BIAS_WORDS=["rockstar","ninja","wizard","guru","hustler","hungry","aggressive","young","energetic","digital native","male","female","manpower","go-getter","superhero","killer","dominate","crush it","killing it","work hard play hard","culture fit","must be available","no excuses"];
function detectBias(text){return BIAS_WORDS.filter(w=>text.toLowerCase().includes(w));}
function wordCount(text){return text.trim()===""?0:text.trim().split(/\s+/).length;}
function findDuplicates(text){
  if(!text)return[];
  const phrases={};
  const words=text.toLowerCase().split(/\s+/);
  for(let i=0;i<words.length-2;i++){
    const phrase=`${words[i]} ${words[i+1]} ${words[i+2]}`;
    if(/^[a-z]/.test(phrase)){phrases[phrase]=(phrases[phrase]||0)+1;}
  }
  return Object.entries(phrases).filter(([,c])=>c>1).map(([p])=>p).slice(0,5);
}

function MyceliumCanvas({pulseRef}){
  const canvasRef=useRef(null);
  const frameRef=useRef(null);
  const nodesRef=useRef([]);
  const pulseIntensityRef=useRef(0);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;initNodes();};
    function initNodes(){
      const W=canvas.width,H=canvas.height;nodesRef.current=[];
      for(let i=0;i<12;i++){const x=(W/12)*i+(Math.random()*W/12);growBranch(x,H,-Math.PI/2+(Math.random()-0.5)*0.8,0,6);}
    }
    function growBranch(x,y,angle,depth,maxDepth){
      if(depth>=maxDepth)return;
      const len=Math.random()*80+40-depth*12;const segments=Math.floor(len/8);
      const branch={points:[],opacity:Math.random()*0.4+0.1,phase:Math.random()*Math.PI*2,speed:Math.random()*0.008+0.003};
      let cx=x,cy=y,a=angle;
      for(let s=0;s<=segments;s++){a+=(Math.random()-0.5)*0.25;cx+=Math.cos(a)*8;cy+=Math.sin(a)*8;branch.points.push({x:cx,y:cy,t:s/segments});}
      nodesRef.current.push(branch);
      if(depth<maxDepth-1&&branch.points.length>3){
        const bi=Math.floor(branch.points.length*(0.4+Math.random()*0.4));const bp=branch.points[bi];
        if(Math.random()>0.5)growBranch(bp.x,bp.y,a+0.6+Math.random()*0.4,depth+1,maxDepth);
        if(Math.random()>0.7)growBranch(bp.x,bp.y,a-0.6-Math.random()*0.4,depth+1,maxDepth);
      }
    }
    if(pulseRef)pulseRef.current=()=>{pulseIntensityRef.current=1;};
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(pulseIntensityRef.current>0)pulseIntensityRef.current=Math.max(0,pulseIntensityRef.current-0.025);
      nodesRef.current.forEach(branch=>{
        branch.phase+=branch.speed;
        const breathe=0.5+0.5*Math.sin(branch.phase);
        const pulse=pulseIntensityRef.current;
        const baseAlpha=branch.opacity*(0.5+0.5*breathe);
        const finalAlpha=Math.min(1,baseAlpha+pulse*0.6);
        if(branch.points.length<2)return;
        for(let i=0;i<branch.points.length-1;i++){
          const p1=branch.points[i],p2=branch.points[i+1];
          const tipFade=1-p1.t*0.7;const alpha=finalAlpha*tipFade;
          if(alpha<0.01)continue;
          ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
          ctx.lineWidth=(0.6+pulse*1.2)*tipFade;
          ctx.strokeStyle=pulse>0.3?`rgba(0,230,118,${alpha})`:`rgba(0,200,83,${alpha})`;
          ctx.stroke();
          if(pulse>0.2&&i%3===0){ctx.beginPath();ctx.arc(p1.x,p1.y,2*pulse,0,Math.PI*2);ctx.fillStyle=`rgba(0,230,118,${alpha*pulse*0.5})`;ctx.fill();}
        }
      });
      frameRef.current=requestAnimationFrame(draw);
    };
    resize();window.addEventListener("resize",resize);frameRef.current=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frameRef.current);window.removeEventListener("resize",resize);};
  },[pulseRef]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.75}}/>;
}

function ScoreBar({score}){
  const col=scoreColor(score),pale=scorePale(score),bord=scoreBorder(score);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
        <div>
          <div style={{fontFamily:C.mono,fontSize:9,color:C.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Overall score</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.35,duration:0.25}}
              style={{fontFamily:C.display,fontSize:48,fontWeight:700,fontStyle:"italic",color:col,letterSpacing:"-2px",lineHeight:1}}>{score}</motion.span>
            <span style={{fontFamily:C.mono,fontSize:13,color:C.inkDim,marginBottom:6}}>/100</span>
          </div>
        </div>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.5}}
          style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:3,background:pale,border:`1px solid ${bord}`}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:col}}/>
          <span style={{fontFamily:C.mono,fontSize:10,color:col,fontWeight:600,letterSpacing:"0.1em"}}>{scoreWord(score)}</span>
        </motion.div>
      </div>
      <div style={{height:2,background:C.raised,borderRadius:1,overflow:"hidden",marginBottom:10}}>
        <motion.div initial={{scaleX:0}} animate={{scaleX:score/100}} transition={SP.score}
          style={{height:"100%",background:col,borderRadius:1,originX:0,transformBox:"fill-box"}}/>
      </div>
      <p style={{fontFamily:C.body,fontSize:13,color:C.inkDim,lineHeight:1.6,margin:0}}>{scoreNote(score)}</p>
    </div>
  );
}

function ScoreRing({score}){
  const col=scoreColor(score),r=22,circ=2*Math.PI*r;
  return(
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{position:"relative",width:56,height:56,flexShrink:0}}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke={C.raised} strokeWidth="3"/>
          <motion.circle cx="28" cy="28" r={r} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ}
            initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ*(1-score/100)}}
            transform="rotate(-90 28 28)" transition={{...SP.score,delay:0.1}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:C.mono,fontSize:12,fontWeight:600,color:col}}>{score}</span>
        </div>
      </div>
      <div>
        <div style={{fontFamily:C.mono,fontSize:11,fontWeight:600,color:col,marginBottom:4}}>{scoreWord(score)}</div>
        <div style={{fontFamily:C.body,fontSize:12,color:C.inkDim,lineHeight:1.55,maxWidth:240}}>{scoreNote(score)}</div>
      </div>
    </div>
  );
}

function Row({text,type,index=0}){
  const col=type==="match"?C.good:type==="missing"?C.bad:C.gold;
  return(
    <motion.div initial={{opacity:0,scale:0.97,y:-4}} animate={{opacity:1,scale:1,y:0}} transition={{...SP.spore,delay:index*0.03}}
      style={{display:"flex",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{width:4,height:4,borderRadius:"50%",background:col,marginTop:10,flexShrink:0}}/>
      <p style={{fontFamily:C.body,fontSize:13,fontWeight:500,lineHeight:1.7,color:type==="missing"?C.ink:C.inkMid,margin:0}}>{text}</p>
    </motion.div>
  );
}

function Chip({children,type}){
  const map={match:{bg:C.goodPale,color:C.good,border:`1px solid ${C.goodBorder}`},missing:{bg:C.badPale,color:C.bad,border:`1px solid ${C.badBorder}`},neutral:{bg:C.raised,color:C.inkMid,border:`1px solid ${C.border}`}};
  const s=map[type]||map.neutral;
  return <span style={{display:"inline-block",background:s.bg,color:s.color,border:s.border,borderRadius:3,fontSize:11,padding:"4px 10px",margin:"3px 4px 3px 0",fontFamily:C.mono,fontWeight:500,letterSpacing:"0.03em"}}>{children}</span>;
}

function L({children}){return <span style={{fontFamily:C.mono,fontSize:11,fontWeight:600,color:C.inkMid,letterSpacing:"0.1em",textTransform:"uppercase"}}>{children}</span>;}

function CardSection({label,color,children}){
  return(
    <div style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{width:2,height:10,borderRadius:1,background:color,flexShrink:0}}/>
        <span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:color,letterSpacing:"0.14em",textTransform:"uppercase"}}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function VineTape({delay=0}){
  return(
    <motion.div initial={{scaleY:0}} animate={{scaleY:1}} transition={{...SP.vine,delay}}
      style={{position:"absolute",left:0,top:0,width:2,height:"100%",background:`linear-gradient(180deg,${C.emerald},${C.emeraldDeep})`,borderRadius:"0 1px 1px 0",zIndex:10,originY:0,transformBox:"fill-box"}}/>
  );
}

function UploadBtn({filename,onFile}){
  return(
    <motion.label whileHover={{scale:1.01}} whileTap={{scale:0.97,transition:SP.press}}
      style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:C.mono,fontSize:10,letterSpacing:"0.08em",color:filename?C.good:C.inkDim,cursor:"pointer",border:`1px solid ${filename?C.goodBorder:C.border}`,padding:"6px 12px",borderRadius:4,background:filename?C.goodPale:"transparent",transition:"all 120ms ease"}}>
      {filename?(<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={C.good} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>):(<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 8V2M3 5l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
      {filename?filename.slice(0,20):"Upload PDF"}
      <input type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
    </motion.label>
  );
}

function JDField({value,onChange,placeholder,minHeight=220,onScan}){
  const [focused,setFocused]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [scanPct,setScanPct]=useState(0);
  const [scanDone,setScanDone]=useState(false);
  const prevLenRef=useRef(0);const scanRef=useRef(null);
  const words=wordCount(value);
  const biasFlags=detectBias(value);
  const fillPct=Math.min((words/150)*100,100);
  const fillColor=fillPct<33?C.bad:fillPct<66?C.warn:C.good;
  const isReady=words>=50;
  const wordStatus=words<300?"Too short":words>700?"Too long":"Good length";
  const wordStatusColor=words<300||words>700?C.warn:C.good;

  useEffect(()=>{
    const newLen=value.length;
    if(newLen>prevLenRef.current+80){
      setScanDone(false);setScanning(true);setScanPct(0);
      let start=null;const DURATION=1800;
      const tick=ts=>{if(!start)start=ts;const p=Math.min((ts-start)/DURATION,1);setScanPct(p*100);if(p<1){scanRef.current=requestAnimationFrame(tick);}else{setScanning(false);setScanDone(true);setScanPct(0);onScan&&onScan();}};
      if(scanRef.current)cancelAnimationFrame(scanRef.current);
      scanRef.current=requestAnimationFrame(tick);
    }
    prevLenRef.current=newLen;
    return()=>{if(scanRef.current)cancelAnimationFrame(scanRef.current);};
  },[value,onScan]);

  return(
    <div>
      <div style={{position:"relative"}}>
        {scanDone&&value&&biasFlags.length>0&&(
          <div style={{position:"absolute",inset:0,pointerEvents:"none",padding:"16px 18px",fontFamily:C.mono,fontSize:13,fontWeight:500,lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word",color:"transparent",zIndex:1,borderRadius:8}}>
            {value.split(new RegExp(`(${biasFlags.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})`, "gi")).map((part,i)=>{
              const isFlag=biasFlags.some(w=>part.toLowerCase()===w.toLowerCase());
              return isFlag?<mark key={i} style={{background:"rgba(184,150,12,0.35)",color:"transparent",borderRadius:2}}>{part}</mark>:<span key={i}>{part}</span>;
            })}
          </div>
        )}
        <motion.div animate={{borderColor:scanning?C.emerald:focused?C.borderHigh:C.border}} transition={{duration:0.2}}
          style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",background:C.surface,position:"relative"}}>
          <textarea value={value} onChange={onChange} placeholder={placeholder} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",fontFamily:C.mono,fontSize:13,fontWeight:500,color:C.ink,padding:"16px 18px",resize:"vertical",lineHeight:1.8,minHeight,caretColor:C.emerald,boxSizing:"border-box",position:"relative",zIndex:2}}/>
          {scanning&&(<>
            <div style={{position:"absolute",left:0,right:0,top:`${scanPct}%`,height:2,pointerEvents:"none",zIndex:4,background:`linear-gradient(90deg,transparent 0%,${C.emerald} 20%,${C.emeraldBright} 50%,${C.emerald} 80%,transparent 100%)`}}/>
            <div style={{position:"absolute",left:0,right:0,top:`calc(${scanPct}% - 10px)`,height:22,pointerEvents:"none",zIndex:3,background:"linear-gradient(180deg,transparent,rgba(0,200,83,0.07) 50%,transparent)"}}/>
            <div style={{position:"absolute",left:0,right:0,top:0,height:`${scanPct}%`,pointerEvents:"none",zIndex:2,background:"rgba(0,200,83,0.025)"}}/>
          </>)}
          {focused&&!scanning&&(<motion.div initial={{opacity:0}} animate={{opacity:[0.3,0.7,0.3]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}
            style={{position:"absolute",left:0,right:0,top:0,height:1,background:`linear-gradient(90deg,transparent,${C.emerald}70,transparent)`,pointerEvents:"none",zIndex:3}}/>)}
        </motion.div>
      </div>
      <div style={{marginTop:8,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,height:1,background:C.raised,borderRadius:1,overflow:"hidden",minWidth:60}}>
          <motion.div animate={{scaleX:fillPct/100}} transition={{duration:0.4,ease:"easeOut"}}
            style={{height:"100%",background:fillColor,borderRadius:1,originX:0,transformBox:"fill-box"}}/>
        </div>
        <span style={{fontFamily:C.mono,fontSize:10,color:C.inkDim}}>{words} <span style={{color:C.inkFaint}}>words</span></span>
        {words>0&&<span style={{fontFamily:C.mono,fontSize:10,color:wordStatusColor}}>{wordStatus}</span>}
        {biasFlags.length>0&&(<motion.span initial={{opacity:0}} animate={{opacity:1}} style={{fontFamily:C.mono,fontSize:10,color:C.warn,display:"flex",alignItems:"center",gap:4}}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1L7 7H1L4 1Z" stroke={C.warn} strokeWidth="1" strokeLinejoin="round"/></svg>
          {biasFlags.length} flag{biasFlags.length>1?"s":""}
        </motion.span>)}
        {isReady&&biasFlags.length===0&&(<span style={{fontFamily:C.mono,fontSize:10,color:C.good,display:"flex",alignItems:"center",gap:4}}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke={C.good} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Ready
        </span>)}
      </div>
    </div>
  );
}

function ResumeField({value,onChange,placeholder,minHeight=160}){
  const [focused,setFocused]=useState(false);
  return(
    <motion.div animate={{borderColor:focused?C.borderHigh:C.border}} transition={{duration:0.15}}
      style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",background:C.surface,position:"relative"}}>
      <textarea value={value} onChange={onChange} placeholder={placeholder} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontFamily:C.mono,fontSize:13,fontWeight:500,color:C.ink,padding:"16px 18px",resize:"vertical",lineHeight:1.8,minHeight,caretColor:C.gold,boxSizing:"border-box"}}/>
      {focused&&(<motion.div initial={{opacity:0}} animate={{opacity:[0.25,0.6,0.25]}} transition={{duration:2.5,repeat:Infinity,ease:"easeInOut"}}
        style={{position:"absolute",left:0,right:0,top:0,height:1,background:`linear-gradient(90deg,transparent,${C.gold}60,transparent)`,pointerEvents:"none"}}/>)}
    </motion.div>
  );
}

const DIMENSIONS=[
  {id:"structure",label:"Structure",color:"#00897B",pale:"rgba(0,137,123,0.10)",border:"rgba(0,137,123,0.22)",icon:<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="2.5" rx="1" fill="#00897B" opacity="0.9"/><rect x="1" y="6.5" width="9" height="2.5" rx="1" fill="#00897B" opacity="0.6"/><rect x="1" y="11" width="11" height="2.5" rx="1" fill="#00897B" opacity="0.75"/></svg>},
  {id:"bias",label:"Bias",color:"#D32F2F",pale:"rgba(211,47,47,0.10)",border:"rgba(211,47,47,0.22)",icon:<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v3.5M8 11.5v.5" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round"/></svg>},
  {id:"keywords",label:"Keywords",color:"#00C853",pale:"rgba(0,200,83,0.10)",border:"rgba(0,200,83,0.22)",icon:<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8h4M10 8h4M8 2v4M8 10v4" stroke="#00C853" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="2" stroke="#00C853" strokeWidth="1.5"/></svg>},
  {id:"salary",label:"Salary",color:"#B8960C",pale:"rgba(184,150,12,0.10)",border:"rgba(184,150,12,0.25)",icon:<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#B8960C" strokeWidth="1.5"/><path d="M8 4.5v7M6 6.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5S9 8 8 8s-2 .7-2 1.5S7 11 8 11s2-.7 2-1.5" stroke="#B8960C" strokeWidth="1.3" strokeLinecap="round"/></svg>},
];

function DimensionCard({dim,result,expanded,setExpanded,mountDelay=0}){
  const isExpanded=expanded===dim.id;
  const r=result;
  let summary="",content=null;
  if(dim.id==="structure"){
    const missing=r.structure.missingSections.length;
    summary=missing===0?"All sections present":`${missing} section${missing>1?"s":""} missing`;
    content=(<>
      <CardSection label="Missing" color={C.bad}>{r.structure.missingSections.length===0?<p style={{fontFamily:C.body,fontSize:13,color:C.good,margin:0}}>All key sections present.</p>:r.structure.missingSections.map((s,i)=><Row key={i} text={s} type="missing" index={i}/>)}</CardSection>
      <CardSection label="Present" color={C.good}>{r.structure.presentSections.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}</CardSection>
      <CardSection label="Suggestions" color={C.warn}>{r.structure.suggestions.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}</CardSection>
    </>);
  }
  if(dim.id==="bias"){
    const flagged=r.bias.flaggedPhrases.length;
    summary=flagged===0?"No biased language":`${flagged} phrase${flagged>1?"s":""} flagged`;
    content=(<>
      <div style={{paddingBottom:16,marginBottom:4,borderBottom:`1px solid ${C.border}`}}><ScoreRing score={r.bias.inclusivityScore}/></div>
      <CardSection label="Flagged phrases" color={C.bad}>{flagged===0?<p style={{fontFamily:C.body,fontSize:13,color:C.good,margin:"8px 0 0"}}>No biased language detected.</p>:<div style={{paddingTop:4}}>{r.bias.flaggedPhrases.map((p,i)=><Chip key={i} type="missing">{p}</Chip>)}</div>}</CardSection>
      <CardSection label="Improvements" color={C.warn}>{r.bias.improvements.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}</CardSection>
    </>);
  }
  if(dim.id==="keywords"){
    summary=`${r.keywords.strong.length} strong · ${r.keywords.missing.length} missing`;
    content=(<>
      <CardSection label="Strong" color={C.good}><div style={{paddingTop:4}}>{r.keywords.strong.map((k,i)=><Chip key={i} type="match">{k}</Chip>)}</div></CardSection>
      <CardSection label="Missing" color={C.bad}><div style={{paddingTop:4}}>{r.keywords.missing.map((k,i)=><Chip key={i} type="missing">{k}</Chip>)}</div></CardSection>
      <CardSection label="SEO tips" color={C.warn}>{r.keywords.seoTips.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}</CardSection>
    </>);
  }
  if(dim.id==="salary"){
    summary=r.salary.transparent?"Salary disclosed":"No salary range";
    content=(<>
      <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:16,marginBottom:4,borderBottom:`1px solid ${C.border}`}}>
        <div style={{width:32,height:32,borderRadius:5,background:r.salary.transparent?C.goodPale:C.badPale,border:`1px solid ${r.salary.transparent?C.goodBorder:C.badBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {r.salary.transparent?<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke={C.good} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke={C.bad} strokeWidth="1.5" strokeLinecap="round"/></svg>}
        </div>
        <span style={{fontFamily:C.body,fontSize:14,fontWeight:500,color:r.salary.transparent?C.good:C.bad}}>{r.salary.transparent?"Salary disclosed":"No salary range"}</span>
      </div>
      <CardSection label="Observation" color={C.warn}><Row text={r.salary.observation} type="neutral" index={0}/></CardSection>
      <CardSection label="Recommendation" color={C.gold}><Row text={r.salary.recommendation} type="neutral" index={0}/></CardSection>
    </>);
  }
  return(
    <motion.div initial={{opacity:0,scale:0.96,y:-8}} animate={{opacity:1,scale:1,y:0}} transition={{...SP.spore,delay:mountDelay}}
      style={{border:`1px solid ${isExpanded?dim.border:C.border}`,borderRadius:8,overflow:"hidden",background:C.surface,position:"relative",transition:"border-color 200ms ease"}}>
      <VineTape delay={mountDelay+0.1}/>
      <div onClick={()=>setExpanded(isExpanded?null:dim.id)} style={{padding:"16px 18px 16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",borderBottom:isExpanded?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:6,background:dim.pale,border:`1px solid ${dim.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{dim.icon}</div>
          <div>
            <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:dim.color,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:3}}>{dim.label}</div>
            <div style={{fontFamily:C.body,fontSize:12,color:C.inkMid}}>{summary}</div>
          </div>
        </div>
        <motion.div animate={{rotate:isExpanded?180:0}} transition={SP.snap} style={{color:C.inkDim}}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.div>
      </div>
      <AnimatePresence>
        {isExpanded&&(<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.22,ease:[0.16,1,0.3,1]}} style={{overflow:"hidden"}}>
          <div style={{padding:"16px 18px 20px 22px"}}>{content}</div>
        </motion.div>)}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JDAnalyzer(){
  const [jd,setJd]=useState("");
  const [resume,setResume]=useState("");
  const [jdFile,setJdFile]=useState("");
  const [resFile,setResFile]=useState("");
  const [jd2,setJd2]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState(null);
  const [error,setError]=useState("");
  const [step,setStep]=useState("input");
  const [activeTab,setActiveTab]=useState("analysis");
  const [rewriteText,setRewriteText]=useState("");
  const [rewriteLoading,setRewriteLoading]=useState(false);
  const [compareResult,setCompareResult]=useState(null);
  const [compareLoading,setCompareLoading]=useState(false);
  const [copied,setCopied]=useState(false);
  const myceliumPulseRef=useRef(null);

  useEffect(()=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload=()=>{window.pdfjsLib=window["pdfjs-dist/build/pdf"];};
    document.head.appendChild(s);
  },[]);

  async function handleFile(file,setter,nameSetter){
    const t=file.type==="application/pdf"?await extractPDF(file):await file.text();
    if(t){setter(t);nameSetter(file.name);}
  }

  const flesch=fleschScore(jd);
  const duplicates=findDuplicates(jd);
  const words=wordCount(jd);

  async function analyze(){
    if(!jd.trim())return;
    setLoading(true);setResult(null);setError("");setRewriteText("");setCompareResult(null);setActiveTab("analysis");
    const hasResume=resume.trim().length>0;
    const clean=t=>{let out="";for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);if(c>=32&&c<=126)out+=t[i];else if(c===10||c===13||c===9)out+=" ";}return out.replace(/([A-Z]) ([A-Z]) ([A-Z])/g,"$1$2$3").replace(/\s{3,}/g," ").trim().slice(0,6000);};
    const prompt=`You are an expert HR analyst. Analyze the following and return ONLY a JSON object.
CRITICAL: Your response must be valid JSON only. No markdown. No backticks. No explanation. Start with { and end with }.
JOB DESCRIPTION:\n${clean(jd)}${hasResume?`\nRESUME:\n${clean(resume)}`:""}
Return this exact JSON structure:
{"overallScore":72,"structure":{"missingSections":["Benefits"],"presentSections":["Role overview","Responsibilities"],"suggestions":["Add team size context"]},"bias":{"flaggedPhrases":["rockstar"],"inclusivityScore":65,"improvements":["Replace rockstar with high-performing"]},"keywords":{"strong":["talent acquisition"],"missing":["ATS","HRBP"],"seoTips":["Add seniority level to title"]},"salary":{"transparent":false,"observation":"No salary range disclosed","recommendation":"Add a salary band"},"persona":{"title":"Who this JD will attract","seniorityLevel":"Mid-level","backgroundType":"Generalist HR","likelyAge":"28-35","riskProfile":"Risk-averse candidates who value stability","whatItSignals":"A traditional corporate environment","missingPersona":"High-performers seeking growth and transparency"}${hasResume?`,"resumeMatch":{"matchScore":58,"strengths":["Strong coordination experience"],"gaps":["No ATS experience"],"verdict":"Transferable skills present but lacks direct HR ops background"}`:""}}`
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
      if(!res.ok){setError(`HTTP ${res.status}`);setLoading(false);return;}
      const data=await res.json();
      const raw=data.content?.map(i=>i.text||"").join("")||"";
      const stripped=raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const match=stripped.match(/\{[\s\S]*\}/);
      if(!match){setError("Could not parse response.");setLoading(false);return;}
      let parsed=null;
      try{parsed=JSON.parse(match[0]);}catch{}
      if(!parsed){try{let s2="";for(let i=0;i<match[0].length;i++){const c=match[0].charCodeAt(i);if(c>=32||c===10||c===13||c===9)s2+=match[0][i];}parsed=JSON.parse(s2);}catch{}}
      if(!parsed){setError("Parse error. Please try again.");setLoading(false);return;}
      setResult(parsed);setExpanded(null);setStep("results");
      myceliumPulseRef.current&&myceliumPulseRef.current();
    }catch(e){setError(e.message);}
    setLoading(false);
  }

  async function generateRewrite(){
    if(!jd.trim()||rewriteText)return;
    setRewriteLoading(true);
    const prompt=`You are an expert HR copywriter. Rewrite the following job description to fix ALL issues: remove bias, add missing sections, improve clarity, add salary range placeholder, fix reading level to 8th grade, remove redundancy, make it inclusive and searchable.
Return ONLY the rewritten JD text. No commentary. No markdown headers. Just the clean rewritten JD.
ORIGINAL JD:\n${jd.slice(0,4000)}`;
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      setRewriteText(data.content?.map(i=>i.text||"").join("")||"");
    }catch(e){console.error(e);}
    setRewriteLoading(false);
  }

  async function compareJDs(){
    if(!jd.trim()||!jd2.trim())return;
    setCompareLoading(true);setCompareResult(null);
    const prompt=`Compare these two job descriptions and return ONLY valid JSON. No markdown.
JD A:\n${jd.slice(0,3000)}
JD B:\n${jd2.slice(0,3000)}
Return: {"winner":"A","scoreA":72,"scoreB":58,"summaryA":"Strong on keywords, weak on salary","summaryB":"Better structure but more biased language","advantages":["JD A has clearer role scope","JD A is more inclusive"],"disadvantages":["JD A missing benefits section","JD B has aggressive language"],"recommendation":"Use JD A as the base, add the benefits section from JD B approach"}`;
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:800,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const raw=data.content?.map(i=>i.text||"").join("")||"";
      const match=raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim().match(/\{[\s\S]*\}/);
      if(match){try{setCompareResult(JSON.parse(match[0]));}catch{}}
    }catch(e){console.error(e);}
    setCompareLoading(false);
  }

  const tabs=[
    {id:"analysis",label:"Analysis"},
    {id:"rewrite",label:"Rewrite"},
    {id:"persona",label:"Persona"},
    {id:"compare",label:"Compare"},
  ];

  const headline=jd.trim()===""?(<>Most JDs fail<br/><em>before anyone applies.</em></>):words<30?(<>Keep going —<br/><em style={{color:C.gold}}>reading your JD.</em></>):detectBias(jd).length>0?(<><em style={{color:C.bad}}>{detectBias(jd).length} flag{detectBias(jd).length>1?"s":""} detected</em><br/>in your JD.</>):words>=50?(<>Your JD looks<br/><em style={{color:C.emerald}}>ready to analyse.</em></>):(<>Most JDs fail<br/><em>before anyone applies.</em></>);
  const subline=jd.trim()===""?"Bias, keyword gaps, and missing sections cost you candidates. Paste your JD to find out.":detectBias(jd).length>0?`Detected: ${detectBias(jd).slice(0,3).join(", ")}${detectBias(jd).length>3?` and ${detectBias(jd).length-3} more`:""}.`:"Looking clean. Run analysis for the full examination.";

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:${C.void};}
        ::selection{background:rgba(0,200,83,0.18);color:${C.emerald};}
        ::placeholder{color:${C.inkFaint};font-family:'DM Mono',monospace;font-size:12px;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${C.raised};border-radius:2px;}
        input[type=file]{display:none;}
        @media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}canvas{display:none;}}
      `}</style>

      <MyceliumCanvas pulseRef={myceliumPulseRef}/>

      <div style={{minHeight:"100vh",background:"transparent",color:C.ink,fontFamily:C.body,position:"relative",zIndex:1}}>

        {/* HEADER */}
        <header style={{position:"sticky",top:0,zIndex:200,height:52,background:`rgba(3,10,5,0.92)`,backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke={C.emerald} strokeWidth="1.5"/>
              <path d="M12.5 12.5L16.5 16.5" stroke={C.emerald} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 8 Q8 5 10 8 Q8 11 6 8Z" fill={C.emerald} opacity="0.4"/>
            </svg>
            <span style={{fontFamily:C.display,fontSize:15,fontWeight:700,fontStyle:"italic",color:C.ink,letterSpacing:"-0.3px"}}>JD Analyzer</span>
            <span style={{fontFamily:C.mono,fontSize:9,color:C.inkFaint,letterSpacing:"0.1em"}}>by Divyah</span>
          </div>
          {step==="results"&&(
            <motion.button whileTap={{scale:0.97,transition:SP.press}}
              onClick={()=>{setStep("input");setResult(null);setError("");setExpanded(null);setRewriteText("");setCompareResult(null);}}
              style={{fontFamily:C.mono,fontSize:10,color:C.inkDim,background:"transparent",border:`1px solid ${C.border}`,padding:"6px 14px",borderRadius:4,letterSpacing:"0.08em",transition:"all 120ms ease"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.emerald;e.currentTarget.style.color=C.emerald;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
              ← New analysis
            </motion.button>
          )}
          <div style={{fontFamily:C.mono,fontSize:9,color:C.inkFaint,letterSpacing:"0.1em",textAlign:"right",lineHeight:1.6}}>DOCUMENT<br/>FORENSICS</div>
        </header>

        <AnimatePresence mode="wait">

          {/* INPUT */}
          {step==="input"&&(
            <motion.div key="input" initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.98}} transition={{duration:0.2,ease:[0.16,1,0.3,1]}}
              style={{maxWidth:680,margin:"0 auto",padding:"56px 24px 100px"}}>
              <motion.div initial={{opacity:0,scale:0.96,y:-8}} animate={{opacity:1,scale:1,y:0}} transition={{...SP.spore,delay:0.05}} style={{marginBottom:52}}>
                <div style={{fontFamily:C.mono,fontSize:9,color:C.emerald,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>HR Intelligence · Document Analysis</div>
                <h1 style={{fontFamily:C.display,fontWeight:700,fontStyle:"italic",fontSize:"clamp(36px,5vw,52px)",color:C.ink,letterSpacing:"-1px",lineHeight:1.1,margin:"0 0 16px"}}>{headline}</h1>
                <p style={{fontFamily:C.body,fontSize:14,color:C.inkMid,lineHeight:1.75,maxWidth:"52ch"}}>{subline}</p>
                {/* Live stats */}
                {words>0&&(
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}
                    style={{display:"flex",gap:16,marginTop:14,flexWrap:"wrap"}}>
                    <div style={{fontFamily:C.mono,fontSize:10,color:C.inkDim}}>
                      Reading level: <span style={{color:flesch>=60?C.good:flesch>=40?C.warn:C.bad,fontWeight:600}}>{readingLevelLabel(flesch)} ({flesch})</span>
                    </div>
                    {duplicates.length>0&&<div style={{fontFamily:C.mono,fontSize:10,color:C.warn}}>{duplicates.length} repeated phrase{duplicates.length>1?"s":""}</div>}
                  </motion.div>
                )}
              </motion.div>

              <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:0.12}} style={{display:"flex",flexDirection:"column",gap:20}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <L>Job Description <span style={{color:C.bad}}>*</span></L>
                    <UploadBtn filename={jdFile} onFile={f=>handleFile(f,setJd,setJdFile)}/>
                  </div>
                  <JDField value={jd} onChange={e=>{setJd(e.target.value);setJdFile("");}} placeholder="Paste the full job description — the scan begins on paste..." minHeight={220} onScan={()=>myceliumPulseRef.current&&myceliumPulseRef.current()}/>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><L>Resume</L><span style={{fontFamily:C.mono,fontSize:9,color:C.inkFaint,letterSpacing:"0.08em"}}>optional</span></div>
                    <UploadBtn filename={resFile} onFile={f=>handleFile(f,setResume,setResFile)}/>
                  </div>
                  <ResumeField value={resume} onChange={e=>{setResume(e.target.value);setResFile("");}} placeholder="Paste your resume to enable match scoring..." minHeight={150}/>
                </div>
                {error&&(<motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.arrive} style={{background:C.badPale,border:`1px solid ${C.badBorder}`,borderRadius:6,padding:"10px 14px",fontSize:12,color:C.bad,fontFamily:C.mono}}>{error}</motion.div>)}
                <div>
                  <motion.button whileTap={!jd.trim()||loading?{}:{scale:0.97,transition:SP.press}} whileHover={!jd.trim()||loading?{}:{scale:1.01,transition:SP.snap}} onClick={analyze} disabled={!jd.trim()||loading}
                    style={{height:50,paddingLeft:36,paddingRight:36,background:!jd.trim()||loading?C.raised:C.emerald,border:"none",borderRadius:6,color:!jd.trim()||loading?C.inkDim:C.void,fontFamily:C.body,fontSize:14,fontWeight:600,cursor:!jd.trim()||loading?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:10,letterSpacing:"-0.1px"}}>
                    {loading?(<><motion.div animate={{rotate:360}} transition={{duration:0.9,repeat:Infinity,ease:"linear"}} style={{width:14,height:14,border:`2px solid ${C.inkFaint}`,borderTopColor:C.ink,borderRadius:"50%"}}/>Analysing…</>):"Run analysis →"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* RESULTS */}
          {step==="results"&&result&&(
            <motion.div key="results" initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:0.2,ease:[0.16,1,0.3,1]}}
              style={{maxWidth:820,margin:"0 auto",padding:"32px 24px 100px"}}>

              {/* TABS */}
              <div style={{display:"flex",gap:2,marginBottom:24,background:C.surface,borderRadius:8,padding:4,border:`1px solid ${C.border}`}}>
                {tabs.map(t=>(
                  <motion.button key={t.id} onClick={()=>{setActiveTab(t.id);if(t.id==="rewrite"&&!rewriteText)generateRewrite();}}
                    whileTap={{scale:0.97,transition:SP.press}}
                    style={{flex:1,padding:"8px 12px",borderRadius:6,border:"none",fontFamily:C.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,cursor:"pointer",
                      background:activeTab===t.id?C.emerald:"transparent",
                      color:activeTab===t.id?C.void:C.inkDim,
                      transition:"all 150ms ease"}}>
                    {t.label}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ANALYSIS TAB */}
                {activeTab==="analysis"&&(
                  <motion.div key="analysis" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={SP.arrive}>
                    {/* Score + reading level row */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:10,marginBottom:10}}>
                      <motion.div initial={{opacity:0,scale:0.96,y:-8}} animate={{opacity:1,scale:1,y:0}} transition={SP.spore}
                        style={{padding:"28px 32px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,position:"relative",overflow:"hidden"}}>
                        <VineTape delay={0.1}/>
                        <div style={{paddingLeft:10}}><ScoreBar score={result.overallScore}/></div>
                      </motion.div>
                      {/* Reading level + word count card */}
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:0.1}}
                          style={{flex:1,padding:"16px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,position:"relative",overflow:"hidden"}}>
                          <VineTape delay={0.15}/>
                          <div style={{paddingLeft:8}}>
                            <div style={{fontFamily:C.mono,fontSize:8,color:C.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Reading Level</div>
                            <div style={{fontFamily:C.display,fontSize:24,fontWeight:700,fontStyle:"italic",color:flesch>=60?C.good:flesch>=40?C.warn:C.bad,lineHeight:1,marginBottom:4}}>{readingLevelLabel(flesch)}</div>
                            <div style={{fontFamily:C.mono,fontSize:10,color:C.inkDim}}>Score: {flesch} · Target: 60+</div>
                          </div>
                        </motion.div>
                        <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:0.15}}
                          style={{flex:1,padding:"16px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,position:"relative",overflow:"hidden"}}>
                          <VineTape delay={0.2}/>
                          <div style={{paddingLeft:8}}>
                            <div style={{fontFamily:C.mono,fontSize:8,color:C.gold,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Word Count</div>
                            <div style={{fontFamily:C.display,fontSize:24,fontWeight:700,fontStyle:"italic",color:words>=300&&words<=700?C.good:C.warn,lineHeight:1,marginBottom:4}}>{words}</div>
                            <div style={{fontFamily:C.mono,fontSize:10,color:C.inkDim}}>{words<300?"Too short":words>700?"Too long":"Ideal range"} · 300–700</div>
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Duplicates */}
                    {duplicates.length>0&&(
                      <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:0.2}}
                        style={{marginBottom:10,padding:"14px 18px 14px 22px",border:`1px solid ${C.warnBorder}`,borderRadius:8,background:C.warnPale,position:"relative",overflow:"hidden"}}>
                        <VineTape delay={0.25}/>
                        <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.warn,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Repeated Phrases</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {duplicates.map((p,i)=><Chip key={i} type="neutral">{p}</Chip>)}
                        </div>
                      </motion.div>
                    )}

                    {/* Dimension cards 2x2 */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      {DIMENSIONS.map((dim,i)=><DimensionCard key={dim.id} dim={dim} result={result} expanded={expanded} setExpanded={setExpanded} mountDelay={i*0.07}/>)}
                    </div>

                    {/* Resume match */}
                    {result.resumeMatch&&(
                      <motion.div initial={{opacity:0,scale:0.96,y:-8}} animate={{opacity:1,scale:1,y:0}} transition={{...SP.spore,delay:0.3}}
                        style={{border:`1px solid ${expanded==="match"?C.violetBorder:C.border}`,borderRadius:8,overflow:"hidden",background:C.surface,position:"relative",transition:"border-color 200ms ease"}}>
                        <VineTape delay={0.35}/>
                        <div onClick={()=>setExpanded(expanded==="match"?null:"match")} style={{padding:"16px 18px 16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",borderBottom:expanded==="match"?`1px solid ${C.border}`:"none"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:30,height:30,borderRadius:6,background:C.violetPale,border:`1px solid ${C.violetBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h8M2 8h6M2 12h7" stroke="#7B1FA2" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="9" r="3" stroke="#7B1FA2" strokeWidth="1.5"/><path d="M14.5 11.5l1.5 1.5" stroke="#7B1FA2" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                            <div>
                              <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.violet,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:3}}>Resume Match</div>
                              <div style={{fontFamily:C.body,fontSize:12,color:C.inkMid}}>{result.resumeMatch.matchScore}/100 match score</div>
                            </div>
                          </div>
                          <motion.div animate={{rotate:expanded==="match"?180:0}} transition={SP.snap} style={{color:C.inkDim}}>
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </motion.div>
                        </div>
                        <AnimatePresence>
                          {expanded==="match"&&(<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.22,ease:[0.16,1,0.3,1]}} style={{overflow:"hidden"}}>
                            <div style={{padding:"16px 18px 20px 22px"}}>
                              <div style={{paddingBottom:16,marginBottom:4,borderBottom:`1px solid ${C.border}`}}>
                                <ScoreRing score={result.resumeMatch.matchScore}/>
                                <p style={{fontFamily:C.body,fontSize:13,color:C.inkDim,lineHeight:1.7,margin:"12px 0 0"}}>{result.resumeMatch.verdict}</p>
                              </div>
                              <CardSection label="Strengths" color={C.good}>{result.resumeMatch.strengths.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}</CardSection>
                              <CardSection label="Gaps" color={C.bad}>{result.resumeMatch.gaps.map((s,i)=><Row key={i} text={s} type="missing" index={i}/>)}</CardSection>
                            </div>
                          </motion.div>)}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* REWRITE TAB */}
                {activeTab==="rewrite"&&(
                  <motion.div key="rewrite" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={SP.arrive}>
                    {rewriteLoading?(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0",gap:16}}>
                        <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} style={{width:24,height:24,border:`2px solid ${C.border}`,borderTopColor:C.emerald,borderRadius:"50%"}}/>
                        <span style={{fontFamily:C.mono,fontSize:11,color:C.inkDim,letterSpacing:"0.1em"}}>Rewriting JD…</span>
                      </div>
                    ):rewriteText?(
                      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.spore}
                        style={{border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,position:"relative",overflow:"hidden"}}>
                        <VineTape delay={0.05}/>
                        <div style={{padding:"16px 18px 14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div>
                            <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.emerald,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:3}}>Rewritten JD</div>
                            <div style={{fontFamily:C.body,fontSize:12,color:C.inkMid}}>All issues fixed · {wordCount(rewriteText)} words · Reading level improved</div>
                          </div>
                          <motion.button whileTap={{scale:0.96,transition:SP.press}}
                            onClick={()=>{navigator.clipboard.writeText(rewriteText);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                            style={{fontFamily:C.mono,fontSize:9,color:copied?C.emerald:C.inkDim,background:"transparent",border:`1px solid ${copied?C.emerald:C.border}`,borderRadius:4,padding:"5px 12px",cursor:"pointer",transition:"all 150ms",letterSpacing:"0.08em"}}>
                            {copied?"✓ Copied":"Copy"}
                          </motion.button>
                        </div>
                        <div style={{padding:"20px 22px"}}>
                          <p style={{fontFamily:C.mono,fontSize:13,color:C.inkMid,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{rewriteText}</p>
                        </div>
                      </motion.div>
                    ):null}
                  </motion.div>
                )}

                {/* PERSONA TAB */}
                {activeTab==="persona"&&result.persona&&(
                  <motion.div key="persona" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={SP.arrive}>
                    <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.spore}
                      style={{border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,position:"relative",overflow:"hidden",marginBottom:10}}>
                      <VineTape delay={0.05}/>
                      <div style={{padding:"20px 22px"}}>
                        <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.emerald,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>Who This JD Will Attract</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                          {[
                            {label:"Seniority",value:result.persona.seniorityLevel,color:C.emerald},
                            {label:"Background",value:result.persona.backgroundType,color:C.gold},
                            {label:"Likely Age Range",value:result.persona.likelyAge,color:C.emerald},
                            {label:"Risk Profile",value:result.persona.riskProfile,color:C.warn},
                          ].map((item,i)=>(
                            <motion.div key={i} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:i*0.06}}
                              style={{padding:"12px 14px",background:C.raised,borderRadius:6,border:`1px solid ${C.border}`}}>
                              <div style={{fontFamily:C.mono,fontSize:8,color:C.inkDim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>{item.label}</div>
                              <div style={{fontFamily:C.body,fontSize:13,fontWeight:600,color:item.color,lineHeight:1.4}}>{item.value}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {[
                        {label:"What it signals",value:result.persona.whatItSignals,color:C.warn,border:C.warnBorder,bg:C.warnPale},
                        {label:"Missing persona",value:result.persona.missingPersona,color:C.bad,border:C.badBorder,bg:C.badPale},
                      ].map((item,i)=>(
                        <motion.div key={i} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.spore,delay:0.2+i*0.06}}
                          style={{padding:"16px 18px 16px 22px",border:`1px solid ${item.border}`,borderRadius:8,background:item.bg,position:"relative",overflow:"hidden"}}>
                          <VineTape delay={0.25+i*0.06}/>
                          <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:item.color,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>{item.label}</div>
                          <p style={{fontFamily:C.body,fontSize:13,color:C.inkMid,lineHeight:1.7,margin:0}}>{item.value}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* COMPARE TAB */}
                {activeTab==="compare"&&(
                  <motion.div key="compare" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={SP.arrive}>
                    <div style={{marginBottom:14}}>
                      <div style={{fontFamily:C.mono,fontSize:9,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>JD A (already pasted above)</div>
                      <div style={{padding:"10px 14px",background:C.raised,border:`1px solid ${C.border}`,borderRadius:6,fontFamily:C.mono,fontSize:11,color:C.inkMid}}>{jd.slice(0,120)}…</div>
                    </div>
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontFamily:C.mono,fontSize:9,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase"}}>JD B — paste second JD here</div>
                      </div>
                      <textarea value={jd2} onChange={e=>setJd2(e.target.value)} placeholder="Paste the second job description to compare..."
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.ink,fontFamily:C.mono,fontSize:12,padding:"14px 16px",resize:"vertical",lineHeight:1.8,minHeight:140,caretColor:C.emerald,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <motion.button disabled={!jd2.trim()||compareLoading} whileTap={!jd2.trim()||compareLoading?{}:{scale:0.97,transition:SP.press}}
                      onClick={compareJDs}
                      style={{padding:"11px 28px",background:!jd2.trim()||compareLoading?C.raised:C.emerald,border:"none",borderRadius:6,color:!jd2.trim()||compareLoading?C.inkDim:C.void,fontFamily:C.mono,fontSize:10,fontWeight:700,letterSpacing:"0.14em",cursor:!jd2.trim()||compareLoading?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:8,marginBottom:16}}>
                      {compareLoading?(<><motion.div animate={{rotate:360}} transition={{duration:0.9,repeat:Infinity,ease:"linear"}} style={{width:11,height:11,border:`2px solid ${C.border}`,borderTopColor:C.void,borderRadius:"50%"}}/>Comparing…</>):"Compare JDs →"}
                    </motion.button>

                    {compareResult&&(
                      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.spore} style={{display:"flex",flexDirection:"column",gap:10}}>
                        {/* Winner banner */}
                        <div style={{padding:"16px 22px",background:C.goodPale,border:`1px solid ${C.goodBorder}`,borderRadius:8,display:"flex",alignItems:"center",gap:16}}>
                          <div style={{fontFamily:C.display,fontSize:36,fontWeight:700,fontStyle:"italic",color:C.good,lineHeight:1}}>JD {compareResult.winner}</div>
                          <div>
                            <div style={{fontFamily:C.mono,fontSize:9,color:C.good,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Recommended</div>
                            <div style={{fontFamily:C.body,fontSize:13,color:C.inkMid}}>{compareResult.recommendation}</div>
                          </div>
                        </div>
                        {/* Side by side scores */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          {[{label:"JD A",score:compareResult.scoreA,summary:compareResult.summaryA},{label:"JD B",score:compareResult.scoreB,summary:compareResult.summaryB}].map((item,i)=>(
                            <div key={i} style={{padding:"14px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8}}>
                              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
                                <span style={{fontFamily:C.mono,fontSize:9,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase"}}>{item.label}</span>
                                <span style={{fontFamily:C.display,fontSize:28,fontWeight:700,fontStyle:"italic",color:scoreColor(item.score),lineHeight:1}}>{item.score}</span>
                                <span style={{fontFamily:C.mono,fontSize:11,color:C.inkDim}}>/100</span>
                              </div>
                              <p style={{fontFamily:C.body,fontSize:12,color:C.inkMid,lineHeight:1.6,margin:0}}>{item.summary}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div style={{padding:"14px 18px 14px 22px",background:C.goodPale,border:`1px solid ${C.goodBorder}`,borderRadius:8,position:"relative",overflow:"hidden"}}>
                            <VineTape delay={0}/>
                            <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.good,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Advantages</div>
                            {compareResult.advantages.map((a,i)=><Row key={i} text={a} type="match" index={i}/>)}
                          </div>
                          <div style={{padding:"14px 18px 14px 22px",background:C.badPale,border:`1px solid ${C.badBorder}`,borderRadius:8,position:"relative",overflow:"hidden"}}>
                            <VineTape delay={0}/>
                            <div style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.bad,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Disadvantages</div>
                            {compareResult.disadvantages.map((a,i)=><Row key={i} text={a} type="missing" index={i}/>)}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}