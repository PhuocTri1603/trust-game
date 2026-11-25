import React,{useState} from 'react';
import './party.css';
type Choice='C'|'D';
const names=['Bạn','Luna','Pip','Nori','Rex','Kiko'];
const avatars=['🐱','🐰','🐸','🦊','🐻','🐼'];
const schedule=[[[0,5],[1,4],[2,3]],[[0,4],[5,3],[1,2]],[[0,3],[4,2],[5,1]],[[0,2],[3,1],[4,5]],[[0,1],[2,5],[3,4]]];
export default function Party({onExit,h}:{onExit:()=>void;h:number}){
 const [round,setRound]=useState(1);
 const [scores,setScores]=useState([0,0,0,0,0,0]);
 const [result,setResult]=useState<Choice[]|null>(null);
 const [target,setTarget]=useState(1);
 const [reaction,setReaction]=useState('');
 const [history,setHistory]=useState<Choice[][]>([]);
 const pairs=schedule[(round-1)%5];
 const opponent=pairs.find(p=>p.includes(0))!.find(i=>i!==0)!;
 const play=(choice:Choice)=>{
  if(result)return;
  const actions:Choice[]=[choice,Math.random()<.5?'C':'D','C',Math.random()<.5?'C':'D','D','C'];
  const previous=history[round-6];
  if(previous){const other=pairs.find(p=>p.includes(5))!.find(i=>i!==5)!;actions[5]=previous[other];}
  const points=Array(6).fill(0);
  for(const [a,b] of pairs){const x=Number(actions[a]==='D'),y=Number(actions[b]==='D');points[a]=Math.round(h*(8+2*x-y)**2/9-10*x);points[b]=Math.round(h*(8+2*y-x)**2/9-10*y);}
  setScores(s=>s.map((v,i)=>v+points[i]));setResult(actions);setHistory(v=>[...v,actions]);
 };
 return <section className="party-screen"><header className="party-header"><button onClick={onExit}>← Thoát</button><strong>THE TRUST GARDEN / PARTY</strong><span>H={h}</span></header>
 <p className="party-note">Chơi thử trên một thiết bị · 5 bot · chưa phải phòng online</p>
 <div className="party-table">
 <svg className="party-links" viewBox="0 0 100 100" aria-hidden="true">{pairs.map(([a,b])=>{const pos=(i:number)=>[50+40*Math.sin(i*Math.PI/3),50+40*Math.cos(i*Math.PI/3)];const [x1,y1]=pos(a),[x2,y2]=pos(b);return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a===0||b===0?'#eac477':'#779c91'} strokeWidth=".6" strokeDasharray="2 2"/>})}</svg>
 <div className="party-center"><small>THE MARKET</small><strong>{round}/10</strong><span>Đối thủ: {names[opponent]}</span></div>
 {names.map((name,i)=><button key={i} className={'party-seat '+(target===i?'target ':'')+(i===opponent?'opponent':'')} style={{left:(50+40*Math.sin(i*Math.PI/3))+'%',top:(50+40*Math.cos(i*Math.PI/3))+'%'}} onClick={()=>{if(i!==0){setTarget(i);setReaction('')}}} aria-label={name+' '+scores[i]}><span className="party-avatar">{avatars[i]}</span><b>{name}</b><span>◉ {scores[i]}</span>{result&&<small>{result[i]==='C'?'🤝':'🤫'}</small>}{target===i&&reaction&&<span className="party-reaction">{reaction}</span>}</button>)}
 </div>
 <div className="party-controls">{!result?<><button onClick={()=>play('C')}>🤝 Đồng lòng</button><button onClick={()=>play('D')}>🤫 Âm thầm</button></>:round<10?<button onClick={()=>{setRound(r=>r+1);setResult(null);setReaction('')}}>Vòng tiếp theo →</button>:<strong>🏆 {names.filter((_,i)=>scores[i]===Math.max(...scores)).join(', ')} · {Math.max(...scores)} điểm</strong>}</div>
 <div className="party-emotes"><small>Troll {names[target]} (mô phỏng)</small>{['😂','🍅','🥚','🤡','👑','😭'].map(e=><button key={e} onClick={()=>setReaction(e)}>{e}</button>)}</div>
 </section>;
}
