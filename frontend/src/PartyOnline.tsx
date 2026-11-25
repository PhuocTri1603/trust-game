import React,{useEffect,useRef,useState} from 'react';
import './party.css';
type Session={code:string;seat:number;token:string;h:number};
type Match={seats:number[];actions:string[];points:number[]};
type State={code:string;seat:number;h:number;names:(string|null)[];connected:number[];submitted:number[];round:number;pairs:number[][];scores:number[];history:{round:number;matches:Match[]}[];finished:boolean};
const api=(import.meta.env.VITE_API_URL||'http://localhost:8000').replace(/\/$/,'');
const key='trust-garden-party-session';
const avatars=['🐱','🐰','🐸','🦊','🐻','🐼'];
export default function PartyOnline({h,onExit}:{h:number;onExit:()=>void}){
 const [name,setName]=useState('');const [code,setCode]=useState(new URLSearchParams(location.search).get('party')||'');
 const [session,setSession]=useState<Session|null>(null);const [state,setState]=useState<State|null>(null);
 const [connected,setConnected]=useState(false);const [notice,setNotice]=useState('');const [pending,setPending]=useState(false);
 const ws=useRef<WebSocket|null>(null);const busy=useRef(false);const sent=useRef(false);
 const connect=(s:Session)=>{
  const old=ws.current;ws.current=null;old?.close();setSession(s);setConnected(false);sent.current=false;
  sessionStorage.setItem(key,JSON.stringify(s));
  const socket=new WebSocket(api.replace(/^http/,'ws')+'/party/ws/'+s.code+'?token='+encodeURIComponent(s.token));ws.current=socket;
  socket.onopen=()=>{if(ws.current===socket){setConnected(true);setNotice('')}};
  socket.onclose=()=>{if(ws.current===socket){setConnected(false);setNotice('Mất kết nối. Hãy kết nối lại.')}};
  socket.onmessage=e=>{if(ws.current!==socket)return;const m=JSON.parse(e.data);if(m.type==='party.state'){setState(m);sent.current=false;}else if(m.type==='error'){setNotice(m.message);sent.current=false;}};
 };
 useEffect(()=>{try{const raw=sessionStorage.getItem(key);if(raw){const s=JSON.parse(raw);if(!code||s.code===code.toUpperCase())connect(s)}}catch{sessionStorage.removeItem(key)}return()=>{const old=ws.current;ws.current=null;old?.close()}},[]);
 const enter=async(join:boolean)=>{if(busy.current||!name.trim())return;busy.current=true;setPending(true);setNotice('');try{const res=await fetch(api+'/party/rooms'+(join?'/join':''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(join?{name:name.trim(),code}:{name:name.trim(),h})});if(!res.ok)throw Error((await res.json()).detail||'Không thể vào phòng');connect(await res.json())}catch(e){setNotice(String(e))}finally{busy.current=false;setPending(false)}};
 const exit=()=>{if(session&&!window.confirm('Rời màn hình? Ghế vẫn được giữ để bạn quay lại.'))return;onExit()};
 const forget=()=>{if(!window.confirm('Bỏ thông tin ghế trên thiết bị này? Bạn sẽ không thể lấy lại ghế cũ.'))return;const old=ws.current;ws.current=null;old?.close();sessionStorage.removeItem(key);setSession(null);setState(null);setConnected(false)};
 const ready=!!state&&state.connected.length===6;
 const my=state?.seat??0;
 const pos=(i:number)=>{const angle=(i-my)*Math.PI/3;return [50+40*Math.sin(angle),50+40*Math.cos(angle)]};
 const opponent=state?.pairs.find(p=>p.includes(my))?.find(i=>i!==my);
 const last=state?.history[state.history.length-1];
 const choose=(action:string)=>{if(!state||!ready||!connected||state.finished||state.submitted.includes(my)||sent.current||ws.current?.readyState!==WebSocket.OPEN)return;sent.current=true;ws.current.send(JSON.stringify({type:'action.submit',action,round_number:state.round}));};
 return <section className="party-screen"><header className="party-header"><button onClick={exit}>← Thoát</button><strong>PARTY ONLINE</strong><span>H={state?.h??h}</span></header>
 {!session?<div className="party-controls"><input placeholder="Tên của bạn" maxLength={20} value={name} onChange={e=>setName(e.target.value)}/><button disabled={pending||!name.trim()} onClick={()=>enter(false)}>Tạo phòng</button><input placeholder="Mã phòng" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button disabled={pending||!name.trim()||code.length!==6} onClick={()=>enter(true)}>Vào phòng</button></div>:<>
 <div className="party-controls"><strong>Phòng {session.code}</strong><button onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname+'?party='+session.code);setNotice('Đã sao chép link')}catch{setNotice('Hãy gửi mã phòng cho bạn bè')}}}>Sao chép link</button>{!connected&&<><button onClick={()=>connect(session)}>Kết nối lại</button><button onClick={forget}>Bỏ ghế đã lưu</button></>}</div>
 <p className="party-note">{state?.connected.length??0}/6 kết nối · {state?.submitted.length??0}/6 đã chọn</p>
 <div className="party-table"><svg className="party-links" viewBox="0 0 100 100" aria-hidden="true">{ready&&state?.pairs.map(([a,b])=>{const [x1,y1]=pos(a),[x2,y2]=pos(b);return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a===my||b===my?'#eac477':'#779c91'} strokeWidth=".6" strokeDasharray="2 2"/>})}</svg>
 <div className="party-center"><small>THE MARKET</small><strong>{state?.finished?'END':ready?state?.round+'/10':'WAIT'}</strong><span>{ready&&opponent!==undefined?state?.names[opponent]:'Chờ đủ 6 người'}</span></div>
 {avatars.map((avatar,i)=>{const [x,y]=pos(i);return <div key={i} className={'party-seat '+(i===my?'target ':'')+(i===opponent?'opponent':'')} style={{left:x+'%',top:y+'%'}}><span className="party-avatar">{avatar}</span><b>{state?.names[i]||'Ghế trống'}{i===my?' (Bạn)':''}</b><span>◉ {state?.scores[i]??0}</span><small>{state?.connected.includes(i)?state.submitted.includes(i)?'🂠 Đã chọn':'● Online':'○ Offline'}</small></div>})}</div>
 {last&&<div className="party-note"><strong>Kết quả vòng {last.round}</strong>{last.matches.map(m=><div key={m.seats[0]}>{m.seats.map((i,j)=>(state?.names[i]||'')+' '+(m.actions[j]==='C'?'🤝':'🤫')+' '+m.points[j]).join(' — ')}</div>)}</div>}
 <div className="party-controls">{state?.finished?<strong>🏆 {state.names.filter((_,i)=>state.scores[i]===Math.max(...state.scores)).join(', ')} · {Math.max(...state.scores)} điểm</strong>:<><button disabled={!ready||!connected||state?.submitted.includes(my)} onClick={()=>choose('C')}>🤝 Đồng lòng</button><button disabled={!ready||!connected||state?.submitted.includes(my)} onClick={()=>choose('D')}>🤫 Âm thầm</button></>}</div></>}
 <p role="status" className="party-note">{notice}</p></section>;
}
