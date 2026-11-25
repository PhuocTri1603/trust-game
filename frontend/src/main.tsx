import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Choice = 'C' | 'D';
type BotType = 'random' | 'cooperate' | 'defect' | 'tit_for_tat';
const botNames:Record<BotType,string> = {random:'Nori',cooperate:'Pip',defect:'Rex',tit_for_tat:'Kiko'};
const botDescriptions:Record<BotType,string> = {random:'Chọn Đồng lòng hoặc Âm thầm ngẫu nhiên, xác suất 50/50.',cooperate:'Luôn chọn Đồng lòng.',defect:'Luôn chọn Âm thầm.',tit_for_tat:'Vòng đầu Đồng lòng; từ vòng 2 lặp lại lựa chọn của bạn ở vòng trước.'};
const botChoice = (type:BotType,history:Turn[]):Choice => type === 'cooperate' ? 'C' : type === 'defect' ? 'D' : type === 'tit_for_tat' ? (history.length ? history[history.length-1].a : 'C') : (Math.random() < 0.5 ? 'C' : 'D');
type Screen = 'intro' | 'tutorial' | 'lobby' | 'game' | 'final' | 'ranking';
type Participant = 'human' | BotType;
type MatchResult = { first:Participant; second:Participant; turns:Turn[]; firstProfit:number; secondProfit:number };
const participants:Participant[]=['human','random','cooperate','defect','tit_for_tat'];
const participantName=(p:Participant)=>p==='human'?'Milo (Bạn)':botNames[p];
const simulateBotMatch=(first:BotType,second:BotType,h:number):MatchResult=>{
  const turns:Turn[]=[];
  for(let round=1;round<=MAX_ROUNDS;round++){
    const firstHistory=turns;
    const a=first==='tit_for_tat' ? (turns.length?turns[turns.length-1].b:'C') : botChoice(first,firstHistory);
    const b=second==='tit_for_tat' ? (turns.length?turns[turns.length-1].a:'C') : botChoice(second,turns);
    const [pa,pb]=payoff(a,b,h);
    turns.push({round,a,b,pa,pb});
  }
  return {first,second,turns,firstProfit:turns.reduce((sum,t)=>sum+t.pa,0),secondProfit:turns.reduce((sum,t)=>sum+t.pb,0)};
};
const tournamentOrder:BotType[] = ['random','cooperate','defect','tit_for_tat'];
type Turn = { round: number; a: Choice; b: Choice; pa: number; pb: number };
const payoff = (a:Choice,b:Choice,h:number):[number,number] => { const x=Number(a==='D'),y=Number(b==='D'); return [Math.round(h*(8+2*x-y)**2/9-10*x),Math.round(h*(8+2*y-x)**2/9-10*y)]; };
const fmt=(n:number)=>n.toFixed(0);
const MAX_ROUNDS = 10;
const label = (c: Choice) => c === 'C' ? 'Đồng lòng' : 'Âm thầm';

function Character({ side, mood = 'happy' }: { side: 'a' | 'b'; mood?: 'happy' | 'sad' | 'thinking' | 'smug' | 'furious' }) {
  return <div className={`character ${side} ${mood}`} aria-label={side === 'a' ? 'Milo, firm A' : 'Luna, firm B'} role="img">
    <div className="hat"><div className="hat-brim" /></div>
    <div className="face"><span className="brow left-brow" /><span className="brow right-brow" /><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /><span className="cheek left-cheek" /><span className="cheek right-cheek" /></div>
    <div className="body"><span className="pocket">✿</span></div>
  </div>;
}
function Garden({ moodA, moodB }: { moodA?: 'happy' | 'sad' | 'thinking' | 'smug' | 'furious'; moodB?: 'happy' | 'sad' | 'thinking' | 'smug' | 'furious' }) {
  return <div className="garden" aria-label="Two competing firms in a shared market">
    <div className="sky-sun">☀</div><div className="cloud cloud-one" /><div className="cloud cloud-two" />
    <div className="hill hill-one" /><div className="hill hill-two" />
    <div className="gardeners"><Character side="a" mood={moodA} /><div className="garden-center"><span>🏭</span><small>ONE MARKET</small></div><Character side="b" mood={moodB} /></div>
    <div className="flowers">🏢　⚙️　📈　⚙️　🏢</div>
  </div>;
}

type SavedMatch = { id:string; date:string; opponent:string; result:'Thắng'|'Thua'|'Hòa'; myProfit:number; theirProfit:number; h:number };
type GardenTheme='classic'|'sunset'|'night';
const gardenThemes:{id:GardenTheme;name:string;emoji:string;requiredXP:number}[]=[
  {id:'classic',name:'Vườn xanh',emoji:'🌿',requiredXP:0},
  {id:'sunset',name:'Hoàng hôn',emoji:'🌅',requiredXP:100},
  {id:'night',name:'Đêm sao',emoji:'🌙',requiredXP:300}
];
type PlayerProfile = { name:string; xp:number; theme?:GardenTheme; matches:SavedMatch[]; quests:{day:string; played:number; wins:number; rematches:number} };
const STORAGE_KEY='trust-garden-player-v1';
const todayKey=()=>new Date().toLocaleDateString('en-CA');
const initialProfile=():PlayerProfile=>({name:'Milo',xp:0,theme:'classic',matches:[],quests:{day:todayKey(),played:0,wins:0,rematches:0}});
const loadProfile=():PlayerProfile=>{
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return initialProfile();
    const value=JSON.parse(raw);
    if(typeof value.name!=='string'||typeof value.xp!=='number'||!Array.isArray(value.matches)||!value.quests)return initialProfile();
    const theme=gardenThemes.some(t=>t.id===value.theme&&value.xp>=t.requiredXP)?value.theme:'classic';
    return {...value,theme,name:value.name.slice(0,20),matches:value.matches.slice(0,10)};
  }catch{return initialProfile();}
};
type Session={code:string;token:string;seat:'A'|'B';publicQueue?:boolean};
function Board({names,totals,played,round,h}:{names:string[];totals:number[];played:(Choice|'hidden'|null)[];round:number;h:number}){
  return <div className="tabletop" aria-label="Bàn chơi hai người">
    <div className="table-player"><Character side="b"/><strong>{names[1]}</strong><span>🪙 {totals[1]}</span></div>
    <div className="table-market"><span>🏪 THỊ TRƯỜNG · H={h} · Vòng {round}/10</span><div className="table-slots">{[1,0].map(i=><div key={i} className={'table-slot '+(played[i]?'occupied':'')}><small>{names[i]}</small><strong>{played[i]==='hidden'?'🂠':played[i]?label(played[i] as Choice):'Chờ bài'}</strong></div>)}</div></div>
    <div className="table-player"><Character side="a"/><strong>{names[0]}</strong><span>🪙 {totals[0]}</span></div>
  </div>;
}
function App() {
  const [profile,setProfile]=useState<PlayerProfile>(loadProfile);
  const [recordedMatch,setRecordedMatch]=useState(false);
  const [isRematch,setIsRematch]=useState(false);
  const day=todayKey();
  const quests=profile.quests.day===day?profile.quests:{day,played:0,wins:0,rematches:0};
  const level=Math.floor(profile.xp/100)+1;
  const activeTheme=gardenThemes.find(t=>t.id===profile.theme&&profile.xp>=t.requiredXP)?.id??'classic';
  const updateProfile=(fn:(current:PlayerProfile)=>PlayerProfile)=>setProfile(current=>{
    const next=fn(current);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{/* storage disabled */}
    return next;
  });
  const saveResult=(opponent:string,myProfit:number,theirProfit:number)=>{
    if(recordedMatch)return;
    const result:SavedMatch['result']=myProfit>theirProfit?'Thắng':myProfit<theirProfit?'Thua':'Hòa';
    updateProfile(current=>{
      const q=current.quests.day===todayKey()?current.quests:{day:todayKey(),played:0,wins:0,rematches:0};
      const nextQ={...q,played:q.played+1,wins:q.wins+(result==='Thắng'?1:0),rematches:q.rematches+(isRematch?1:0)};
      const bonus=[q.played<1, q.wins<1&&result==='Thắng',q.rematches<1&&isRematch].filter(Boolean).length*15;
      return {...current,xp:current.xp+20+bonus,quests:nextQ,matches:[{id:crypto.randomUUID(),date:new Date().toISOString(),opponent,result,myProfit,theirProfit,h},...current.matches].slice(0,10)};
    });
    setRecordedMatch(true);
  };
  const [screen, setScreen] = useState<Screen>('intro');
  const [mode, setMode] = useState<'local' | 'online' | 'bot' | 'tournament'>('local');
  const [invite, setInvite] = useState('');
  const [botType,setBotType] = useState<BotType>('random');
  const [tournamentMatches,setTournamentMatches] = useState<MatchResult[]>([]);
  const [h,setH] = useState(3);
  const [session, setSession] = useState<Session | null>(null);
  const [connection, setConnection] = useState('Not connected');
  const [players, setPlayers] = useState(1);
  const [connectedPlayers,setConnectedPlayers]=useState(0);
  const [rematchVotes,setRematchVotes]=useState(0);
  const [votedRematch,setVotedRematch]=useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [onlineHistory, setOnlineHistory] = useState<Turn[]>([]);
  const socket = useRef<WebSocket | null>(null);
  const busy=useRef(false);
  const [pending,setPending]=useState(false);
  const [notice,setNotice]=useState('');
  const [opponentSubmitted,setOpponentSubmitted]=useState(false);
  const api = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const connect = (data:Session) => {
    setVotedRematch(false);
    socket.current?.close();
    setMode('online');
    setSession(data);
    sessionStorage.setItem('trust-garden-session', JSON.stringify(data));
    setConnection('Connecting…');
    const ws = new WebSocket(api.replace(/^http/, 'ws') + '/ws/' + data.code + '?token=' + encodeURIComponent(data.token));
    socket.current = ws;
    ws.onopen = () => {if(socket.current===ws)setConnection('Connected');};
    ws.onclose = () => {if(socket.current===ws)setConnection('Mất kết nối — nhấn Kết nối lại');};
    ws.onerror = () => {if(socket.current===ws)setConnection('Connection error');};
    ws.onmessage = (event:MessageEvent) => {
      if(socket.current!==ws)return;
      const msg = JSON.parse(event.data);
      if (msg.type === 'room.state') {
        setH(msg.h);
        setPlayers(msg.players);
        setConnectedPlayers(msg.connected ?? msg.players);
        setRematchVotes(msg.rematch_votes ?? 0);
        setRound(Math.min(msg.round, MAX_ROUNDS));
        setSubmitted(msg.submitted);
        setOpponentSubmitted(msg.opponent_submitted);
        setOnlineHistory(msg.history.map((t:{round:number;a:Choice;b:Choice;points:number[]}) => ({round:t.round,a:t.a,b:t.b,pa:t.points[0],pb:t.points[1]})));
        if (msg.finished) setScreen('final');
        else if (msg.players === 2) {setVotedRematch(false);setScreen('game');}
        else setScreen('lobby');
      }
      if (msg.type === 'error') {setNotice(msg.message);setSubmitted(false);}
    };
  };
  useEffect(() => {
    const code=new URLSearchParams(window.location.search).get('room');
    if(code && /^[A-Z0-9]{6}$/i.test(code)) {setInvite(code.toUpperCase());setScreen('lobby');}
    const saved = sessionStorage.getItem('trust-garden-session');
    if (saved) { try { const data = JSON.parse(saved); if (data.code && data.token && (data.seat === 'A' || data.seat === 'B')) connect(data); } catch { sessionStorage.removeItem('trust-garden-session'); } }
    return () => { socket.current?.close(); };
  }, []);
  const inviteLink=session?window.location.origin+window.location.pathname+'?room='+encodeURIComponent(session.code):'';
  const requestRematch=()=>{
    if(mode!=='online'||socket.current?.readyState!==WebSocket.OPEN||votedRematch)return;
    socket.current.send(JSON.stringify({type:'match.rematch'}));
    setVotedRematch(true);
  };
  const reconnect=()=>{if(session)connect(session);};
  const createRoom = async () => {
    if(busy.current||session)return;busy.current=true;setPending(true);
    try { const res = await fetch(api + '/rooms', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({h})}); if (!res.ok) throw Error('Could not create room'); connect(await res.json()); } catch(e) {setConnection(String(e));} finally{busy.current=false;setPending(false);}
  };
  const findOpponent = async () => {
    if(busy.current||session)return;busy.current=true;setPending(true);
    try {
      setConnection('Đang tìm đối thủ…');
      const res=await fetch(api+'/matchmaking/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({h})});
      if(!res.ok)throw Error('Không thể ghép trận lúc này');
      connect({...await res.json(),publicQueue:true});
    }catch(e){setConnection(String(e));}finally{busy.current=false;setPending(false);}
  };
  const cancelQueue=async()=>{
    if(!session?.publicQueue||busy.current)return;busy.current=true;setPending(true);
    try{const res=await fetch(api+'/matchmaking/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:session.code,token:session.token})});if(!res.ok)throw Error('Không thể hủy: có thể đã ghép trận.');const ws=socket.current;socket.current=null;ws?.close();sessionStorage.removeItem('trust-garden-session');setSession(null);setPlayers(1);setConnectedPlayers(0);setConnection('Not connected');setMode('local');setScreen('lobby');}catch(e){setNotice(String(e));}finally{busy.current=false;setPending(false);}
  };
  const joinRoom = async () => {
    if(busy.current||session)return;busy.current=true;setPending(true);
    try { const res = await fetch(api + '/rooms/join', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:invite.trim().toUpperCase()})}); if (!res.ok) throw Error('Room unavailable or full'); connect(await res.json()); } catch(e) {setConnection(String(e));} finally{busy.current=false;setPending(false);}
  };
  const onlineChoose = (choice:Choice) => {
    if (socket.current?.readyState !== WebSocket.OPEN || submitted || players < 2) return;
    socket.current.send(JSON.stringify({type:'action.submit',round_number:round,action:choice,request_id:crypto.randomUUID()}));
    setSubmitted(true);
  };
  const [tutorial, setTutorial] = useState(0);
  const [round, setRound] = useState(1);
  const [a, setA] = useState<Choice | null>(null);
  const [b, setB] = useState<Choice | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const revealed = a !== null && b !== null;
  const scores = revealed ? payoff(a,b,h) : null;
  const visibleHistory = mode === 'online' ? onlineHistory : history;
  const tournamentRanking = participants.map(p=>{
    const matches=tournamentMatches.filter(m=>m.first===p||m.second===p);
    const profit=matches.reduce((sum,m)=>sum+(m.first===p?m.firstProfit:m.secondProfit),0);
    return {id:p,name:participantName(p),profit,rounds:matches.reduce((sum,m)=>sum+m.turns.length,0),matches:matches.length};
  }).sort((x,y)=>y.profit-x.profit || participants.indexOf(x.id)-participants.indexOf(y.id));
  const totalA = visibleHistory.reduce((sum, t) => sum + t.pa, 0) + (mode !== 'online' ? (scores?.[0] ?? 0) : 0);
  const totalB = visibleHistory.reduce((sum, t) => sum + t.pb, 0) + (mode !== 'online' ? (scores?.[1] ?? 0) : 0);
  const latest = visibleHistory[visibleHistory.length - 1];
  const lastPayoffs: [number,number] | null = mode !== 'online' && scores ? scores : latest ? [latest.pa, latest.pb] : null;
  const moodFor = (seat:0|1):'thinking'|'smug'|'furious' => !lastPayoffs || lastPayoffs[0] === lastPayoffs[1] ? 'thinking' : lastPayoffs[seat] > lastPayoffs[1-seat] ? 'smug' : 'furious';
  const cooperation = visibleHistory.filter(t => t.a === 'C' && t.b === 'C').length;
  const resultStory = a === 'C' && b === 'C' ? 'Cả hai chọn Đồng lòng (không dùng AI).' : a === 'D' && b === 'D' ? 'Cả hai chọn Âm thầm (đăng ký AI và trả phí).' : 'Hai bên đưa ra lựa chọn khác nhau. Lợi nhuận được tính theo mô hình Cournot.';
  const reset = () => { setVotedRematch(false); socket.current?.close(); sessionStorage.removeItem('trust-garden-session'); setSession(null); setMode('local'); setOnlineHistory([]); setScreen('intro'); setTutorial(0); setRound(1); setA(null); setB(null); setHistory([]); setBotType('random'); setTournamentMatches([]); setH(3); };
  const rematch = () => {
    if (mode === 'online') return;
    setA(null); setB(null); setHistory([]); setRound(1); setRecordedMatch(false); setIsRematch(true);
    if (mode === 'tournament') { setTournamentMatches([]); setBotType(tournamentOrder[0]); }
    setScreen('game');
  };
  const chooseAgainstBot = (choice:Choice) => {
    if ((mode !== 'bot' && mode !== 'tournament') || a !== null || b !== null) return;
    const reply = botChoice(botType, history);
    setA(choice);
    setB(reply);
  };
  const advance = () => {
    if (!a || !b || !scores) return;
    const next = [...history, { round, a, b, pa: scores[0], pb: scores[1] }];
    setHistory(next); setA(null); setB(null);
    if (round === MAX_ROUNDS) {
      if (mode === 'bot' || mode === 'local') saveResult(mode==='bot'?botNames[botType]:'Local',next.reduce((sum,t)=>sum+t.pa,0),next.reduce((sum,t)=>sum+t.pb,0));
      if (mode === 'tournament') {
        const completed:MatchResult = {first:'human',second:botType,turns:next,firstProfit:next.reduce((sum,t)=>sum+t.pa,0),secondProfit:next.reduce((sum,t)=>sum+t.pb,0)};
        const humanMatches=[...tournamentMatches,completed];
        const updated=humanMatches.length===tournamentOrder.length ? [...humanMatches,...tournamentOrder.flatMap((first,i)=>tournamentOrder.slice(i+1).map(second=>simulateBotMatch(first,second,h)))] : humanMatches;
        setTournamentMatches(updated);
        if (humanMatches.length === tournamentOrder.length) {
          const mine=updated.filter(m=>m.first==='human').reduce((sum,m)=>sum+m.firstProfit,0);
          const others=Math.max(...tournamentOrder.map(bot=>updated.filter(m=>m.first===bot||m.second===bot).reduce((sum,m)=>sum+(m.first===bot?m.firstProfit:m.secondProfit),0)));
          // Tournament progress counts once, not once per bot match.
          saveResult('Tournament (đối thủ dẫn đầu)',mine,others);
          setScreen('ranking');
        }
        else {setBotType(tournamentOrder[humanMatches.length]);setHistory([]);setRound(1);setScreen('game');}
      } else setScreen('final');
    }
    else setRound(round + 1);
  };

  return <main className={`app-shell theme-${activeTheme}`}>
    <header className="topbar"><span className="brand">⚙ THE TRUST GARDEN · AI COMPETITION</span><span className="edition">AN AXELROD–COURNOT EXPERIMENT</span></header>
    {screen === 'intro' && <section className="story-screen">
      <div className="choice-card" style={{maxWidth:650,margin:'0 auto 18px'}}>
        <h2>🌱 HỒ SƠ NGƯỜI CHƠI · CẤP {level}</h2>
        <label htmlFor="player-name">Tên hiển thị: </label>
        <input id="player-name" aria-label="Tên người chơi" style={{letterSpacing:0,textTransform:'none'}} maxLength={20} value={profile.name} onChange={e=>updateProfile(p=>({...p,name:e.target.value.slice(0,20)}))}/>
        <p>⭐ {profile.xp} XP · {profile.xp%100}/100 XP để lên cấp tiếp theo</p>
        <h2>🎯 NHIỆM VỤ HÔM NAY</h2>
        <p>{quests.played>=1?'✅':'⬜'} Hoàn thành 1 trận · +15 XP</p>
        <p>{quests.wins>=1?'✅':'⬜'} Thắng 1 trận · +15 XP</p>
        <p>{quests.rematches>=1?'✅':'⬜'} Chơi Rematch · +15 XP</p>
        <p>Mỗi trận hoàn thành: +20 XP. Nhiệm vụ làm mới theo ngày trên thiết bị.</p>
        <h2>🎨 TRANG TRÍ KHU VƯỜN</h2>
        <p>Mở khóa bằng XP, miễn phí và chỉ thay đổi giao diện — không ảnh hưởng điểm số.</p>
        <div className="theme-picker">{gardenThemes.map(theme=><button key={theme.id} className={activeTheme===theme.id?'theme-option selected':'theme-option'} disabled={profile.xp<theme.requiredXP} aria-pressed={activeTheme===theme.id} onClick={()=>updateProfile(p=>({...p,theme:theme.id}))}>{theme.emoji} {theme.name} {profile.xp<theme.requiredXP?`🔒 ${theme.requiredXP} XP`:activeTheme===theme.id?'✓ Đang dùng':'Chọn'}</button>)}</div>
        <h2>📜 10 TRẬN GẦN NHẤT</h2>
        {profile.matches.length===0?<p>Chưa có trận nào được lưu.</p>:<div className="history-list">{profile.matches.map(m=><div className="history-row" key={m.id}><span>{m.result}</span><span>{m.opponent} · H={m.h}</span><strong>{m.myProfit}/{m.theirProfit}</strong></div>)}</div>}
        <p className="disclaimer">Dữ liệu chỉ lưu trên trình duyệt này; xóa dữ liệu trình duyệt sẽ mất tiến độ. PvP chưa cộng XP.</p>
      </div>
      <div className="eyebrow">CHAPTER ONE · TWO FIRMS</div>
      <h1>Two firms. One market. Your decision.</h1>
      <Garden />
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Milo and Luna lead two competing firms. Every round, each independently decides whether to subscribe to cost-reducing AI. Both firms' profits depend on both decisions. Đồng lòng means no AI; Âm thầm means a private AI subscription.</p></div>
      <button className="primary" onClick={() => setScreen('tutorial')}>Explore the economic rules <span>→</span></button>
      <p className="disclaimer">Online play requires a separately hosted backend. Local demo works without one.</p>
    </section>}
    {screen === 'tutorial' && <section className="story-screen">
      <div className="eyebrow">CHAPTER TWO · THE CHOICE</div>
      <h1>Does adopting AI always pay?</h1>
      <Garden moodA="thinking" moodB="thinking" />
      <div className="dialogue"><span className="speaker">THE STORYTELLER · {tutorial + 1} OF 3</span>
        {tutorial === 0 && <p><strong>Đồng lòng (C)</strong> = không đăng ký AI, không trả phí. <strong>Âm thầm (D)</strong> = đăng ký AI, giảm chi phí biên d = 1 và trả phí F = 10 mỗi vòng. Tên gọi chỉ thay đổi cách kể chuyện, không thay đổi payoff.</p>}
        {tutorial === 1 && <p><strong>Cournot competition</strong>: the two firms compete in one market. Each move represents H operating periods. Profit is calculated from both AI decisions using the model in the paper.</p>}
        {tutorial === 2 && <p>Play <strong>10 rounds</strong> with H fixed throughout the match. Decisions are simultaneous and hidden until both players submit. Your cumulative profit depends on the whole interaction history.</p>}
      </div>
      <div className="dots" aria-label="Tutorial progress">{[0, 1, 2].map(i => <span key={i} className={i === tutorial ? 'active' : ''} />)}</div>
      <div className="actions"><button className="secondary" onClick={() => tutorial === 0 ? setScreen('intro') : setTutorial(tutorial - 1)}>← Back</button><button className="primary" onClick={() => tutorial === 2 ? setScreen('lobby') : setTutorial(tutorial + 1)}>{tutorial === 2 ? 'Enter the market' : 'Continue'} →</button></div>
    </section>}
    {screen === 'lobby' && <section className="story-screen">
      <div className="eyebrow">CHAPTER THREE · INVITE A FRIEND</div><h1>Every market needs two firms.</h1><Garden />
      <div className="dialogue"><span className="speaker">CHOOSE HOW TO PLAY</span><p>Chọn đấu với người thật trên hai thiết bị, chơi thử trên một thiết bị, hoặc đấu với một trong bốn bot. H (1–6) được cố định trong 10 vòng.</p></div>
      <div className="dialogue"><span className="speaker">PAYOFF MATRIX · H={h}</span><table className="payoff-table"><thead><tr><th>Milo / Luna</th><th>Đồng lòng</th><th>Âm thầm</th></tr></thead><tbody>{([["C","C"],["C","D"],["D","C"],["D","D"]] as Choice[][]).filter((_,i)=>i===0||i===1||i===2||i===3).map(([x,y],i)=><tr key={i}><th>{label(x)} / {label(y)}</th><td colSpan={2}>{fmt(payoff(x,y,h)[0])} / {fmt(payoff(x,y,h)[1])}</td></tr>)}</tbody></table><p>Payoffs shown as Milo / Luna. H={h}, m=8, d=1, F=10. Payoffs are rounded to whole numbers each round. Negative payoffs are possible.</p></div><div className="choice-grid">
        <div className="choice-card"><h2>ONLINE · TWO DEVICES</h2><label htmlFor="h-select">AI benefit horizon H: </label><select id="h-select" value={h} disabled={!!session} onChange={e=>setH(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select><button className="primary" disabled={!!session||pending} onClick={createRoom}>Create private room</button>
          <p>Or join your friend's room:</p><input aria-label="Room code" placeholder="ROOM CODE" maxLength={6} value={invite} onChange={e=>setInvite(e.target.value)} />
          <button className="secondary" disabled={!!session||pending} onClick={joinRoom}>Join room</button>
          {session && <p><strong>Room {session.code}</strong> · H={h} · Seat {session.seat} · {players}/2 players</p>}
          {session && !session.publicQueue && <div><p>🔗 Mời bạn bè bằng liên kết:</p><input readOnly aria-label="Liên kết mời" value={inviteLink} style={{maxWidth:'100%',letterSpacing:0,textTransform:'none'}}/><button className="secondary" onClick={()=>navigator.clipboard.writeText(inviteLink).then(()=>setNotice('Đã sao chép liên kết')).catch(()=>setNotice('Không thể sao chép tự động'))}>📋 Sao chép liên kết</button></div>}
          {session && connection!=='Connected' && <button className="secondary" onClick={reconnect}>↻ Kết nối lại</button>}
          <p role="status">{connection} · {connectedPlayers}/2 đang kết nối</p>
        </div>
        <div className="choice-card"><h2>🎲 GHÉP TRẬN NGẪU NHIÊN</h2><p>Chơi PvP với người lạ có cùng H={h}. Nếu chưa có đối thủ, bạn sẽ đợi trong phòng chờ. Chưa có xếp hạng hoặc tài khoản.</p><button className="primary" disabled={!!session||pending} onClick={findOpponent}>🔎 Tìm đối thủ</button>{session?.publicQueue&&players===1&&<button className="secondary" disabled={pending} onClick={cancelQueue}>Hủy tìm trận</button>}<p>Ghép trận thử nghiệm: chỉ hoạt động khi backend đang trực tuyến.</p></div>
        <div className="choice-card"><h2>🤖 NGƯỜI VS BOT</h2><p>Bạn điều khiển Milo. Luna là bot và được công khai loại chiến lược trước trận.</p><label htmlFor="bot-select">Chọn đối thủ: </label><select id="bot-select" value={botType} onChange={e=>setBotType(e.target.value as BotType)}>{(Object.keys(botNames) as BotType[]).map(type=><option key={type} value={type}>{botNames[type]}</option>)}</select><p>Đối thủ máy tính có cách chơi riêng. Hãy khám phá qua từng vòng.</p><button className="primary" disabled={!!session||pending} onClick={()=>{setMode('bot');setA(null);setB(null);setHistory([]);setRound(1);setRecordedMatch(false);setIsRematch(false);setScreen('game');}}>Đấu với {botNames[botType]} (H={h})</button></div>
        <div className="choice-card"><h2>🏆 TOURNAMENT · 4 ĐỐI THỦ</h2><p>Vòng tròn 5 đối thủ: bạn đấu 4 bot (40 vòng), sau đó 6 trận bot-vs-bot chạy tự động. Mỗi trận 10 vòng, cùng H={h}. Xếp hạng theo tổng payoff.</p><button className="primary" disabled={!!session||pending} onClick={()=>{setMode('tournament');setTournamentMatches([]);setBotType(tournamentOrder[0]);setA(null);setB(null);setHistory([]);setRound(1);setRecordedMatch(false);setIsRematch(false);setScreen('game');}}>Bắt đầu Tournament</button></div>
        <div className="choice-card"><h2>LOCAL · ONE DEVICE</h2><p>Explore both firms on one device. This demo does not conceal choices from the person holding the device.</p>
          <button className="secondary" disabled={!!session||pending} onClick={() => {setMode('local');setA(null);setB(null);setHistory([]);setRound(1);setRecordedMatch(false);setIsRematch(false);setScreen('game');}}>Try local demo (H={h})</button>
        </div>
      </div>
      {session && <p>Share code <strong>{session.code}</strong> with your friend. The game begins automatically when both join.</p>}
    </section>}
    {screen === 'game' && <section className="story-screen">
      <div className="eyebrow">CHAPTER FOUR · AI COMPETITION</div>
      <div className="game-heading"><h1>Đồng lòng hay Âm thầm?</h1><span className="round-pill">ROUND {round} / {MAX_ROUNDS} · H={h}</span></div>
      {mode === 'tournament' && <p className="bot-banner">🏆 Trận {tournamentMatches.length+1}/{tournamentOrder.length} · Bạn đấu với <strong>{botNames[botType]}</strong> · {tournamentMatches.length} trận đã hoàn tất</p>}
      {mode === "bot" && <p className="bot-banner">🤖 Bạn là Milo · Đối thủ Luna: <strong>{botNames[botType]}</strong></p>}
      <Board names={["Milo",mode==="bot"||mode==="tournament"?botNames[botType]:"Luna"]} totals={[totalA,totalB]} round={round} h={h} played={mode==="online"?(session?.seat==="A"?[submitted?"hidden":null,opponentSubmitted?"hidden":null]:[opponentSubmitted?"hidden":null,submitted?"hidden":null]):[a?(revealed?a:"hidden"):null,b?(revealed?b:"hidden"):null]}/>
      <div className="scoreboard"><div>MILO <strong>{fmt(totalA)}</strong> profit</div><div>LUNA <strong>{fmt(totalB)}</strong> profit</div></div>
      {mode === 'online' ? <div className="choice-card">
        <h2>YOU ARE {session?.seat === 'A' ? 'MILO' : 'LUNA'} · {connection}</h2>
        <p>{connectedPlayers<2?'Đang đợi đối thủ kết nối hoặc quay lại trận…':submitted?'Đã chọn. Đang đợi đối thủ…':'Lựa chọn được giữ bí mật đến khi cả hai quyết định.'}</p>
        <div className="choice-buttons"><button disabled={submitted || connectedPlayers < 2 || connection!=='Connected'} onClick={()=>onlineChoose('C')}>🤝 Đồng lòng</button><button disabled={submitted || connectedPlayers < 2 || connection!=='Connected'} onClick={()=>onlineChoose('D')}>🤫 Âm thầm</button></div>
        <p>{connectedPlayers}/2 người đang kết nối · Phòng {session?.code}</p>
        {connection!=='Connected' && <button className="secondary" onClick={reconnect}>↻ Kết nối lại</button>}
        {onlineHistory.length > 0 && <p>Last round: Milo {label(onlineHistory[onlineHistory.length-1].a)}, Luna {label(onlineHistory[onlineHistory.length-1].b)} · {fmt(onlineHistory[onlineHistory.length-1].pa)} / {fmt(onlineHistory[onlineHistory.length-1].pb)}</p>}
      </div> : (mode === 'bot' || mode === 'tournament') && !revealed ? <div className="choice-card"><h2>MILO · LƯỢT CỦA BẠN</h2><p>Bạn đang đấu với {botNames[botType]}, một đối thủ máy tính. Cả hai lựa chọn được công bố cùng lúc.</p><div className="choice-buttons"><button onClick={()=>chooseAgainstBot('C')}>🤝 Đồng lòng</button><button onClick={()=>chooseAgainstBot('D')}>🤫 Âm thầm</button></div></div> : !revealed ? <div className="choice-grid">
        {([{ who: 'MILO', value: a, setter: setA }, { who: 'LUNA', value: b, setter: setB }] as const).map(player => <div className="choice-card" key={player.who}>
          <h2>{player.who}'S TURN</h2><p>{player.value ? 'Choice locked. Waiting for the other firm.' : 'Chọn Đồng lòng hoặc Âm thầm.'}</p>
          <div className="choice-buttons"><button disabled={player.value !== null} onClick={() => player.setter('C')}>🤝 Đồng lòng</button><button disabled={player.value !== null} onClick={() => player.setter('D')}>🤫 Âm thầm</button></div>
          <span className="choice-status">{player.value ? '✓ Choice submitted' : '○ Waiting for choice'}</span>
        </div>)}
      </div> : <div className="reveal" aria-live="polite">
        <div className="eyebrow">THE CHOICES ARE REVEALED</div>
        <h2>Milo: {label(a)} · Luna: {label(b)}</h2>
        <p>{resultStory}</p><div className="reveal-points">Milo {fmt(scores![0])} <span>⚙</span> Luna {fmt(scores![1])}</div>
        <button className="primary" onClick={advance}>{round === MAX_ROUNDS ? 'See results →' : 'Next round →'}</button>
      </div>}
      <p className="disclaimer">{mode === 'bot' || mode === 'tournament' ? 'Đối thủ là máy tính; chiến lược không được tiết lộ. Kết quả chỉ lưu tạm trong phiên chơi, chưa có database.' : mode === 'local' ? 'Local two-seat demonstration: both choices are made on this device.' : 'Online prototype: room state is held in server memory; restarting the backend ends the session.'}</p>
    </section>}
    {screen === 'ranking' && <section className="story-screen">
      <div className="eyebrow">🏆 ROUND-ROBIN COMPLETE · H={h}</div><h1>Bảng xếp hạng cuối cùng</h1>
      <p>5 đối thủ · 10 trận · 100 vòng đấu. Mỗi đối thủ chơi 4 trận (40 vòng). Xếp hạng theo <strong>tổng payoff</strong>.</p>
      <div className="ranking-scroll"><table className="ranking-table"><thead><tr><th>Hạng</th><th>Đối thủ</th><th>Trận</th><th>Tổng payoff</th><th>Payoff/vòng</th></tr></thead><tbody>{tournamentRanking.map((entry,i)=><tr key={entry.id} className={entry.id==='human'?'ranking-human':''}><td>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td><td>{entry.name}</td><td>{entry.matches}</td><td><strong>{fmt(entry.profit)}</strong></td><td>{entry.rounds?(entry.profit/entry.rounds).toFixed(2):'—'}</td></tr>)}</tbody></table></div>
      <h2 className="history-title">Ma trận tổng payoff đối đầu</h2><p>Mỗi ô là tổng payoff của đối thủ ở hàng khi gặp đối thủ ở cột (10 vòng).</p>
      <div className="ranking-scroll"><table className="ranking-table"><thead><tr><th>Đối thủ</th>{participants.map(p=><th key={p}>{participantName(p)}</th>)}</tr></thead><tbody>{participants.map(p=><tr key={p} className={p==='human'?'ranking-human':''}><th>{participantName(p)}</th>{participants.map(q=>{const match=tournamentMatches.find(m=>(m.first===p&&m.second===q)||(m.first===q&&m.second===p));return <td key={q}>{p===q?'—':match?fmt(match.first===p?match.firstProfit:match.secondProfit):'—'}</td>})}</tr>)}</tbody></table></div>
      <h2 className="history-title">Kết quả 10 trận</h2><div className="history-list">{tournamentMatches.map((m,i)=><div className="history-row" key={i}><span>Trận {i+1}</span><span>{participantName(m.first)} vs {participantName(m.second)}</span><strong>{fmt(m.firstProfit)} / {fmt(m.secondProfit)}</strong></div>)}</div>
      <p className="disclaimer">Bot đấu tự động theo quy tắc riêng; không được xem lựa chọn hiện tại của đối thủ. Đây là kết quả một tournament, chưa có kiểm định độ ổn định theo seed. Dữ liệu chưa lưu trên server.</p>
      <div className="actions"><button className="primary" onClick={rematch}>🏆 Đấu lại Tournament ↻</button><button className="secondary" onClick={reset}>Về trang đầu</button></div>
    </section>}
    {screen === 'final' && <section className="story-screen">
      <div className="eyebrow">FINAL RESULTS · WHAT DID YOU EARN?</div>{mode === "bot" && <p className="bot-banner">🤖 Trận đấu Người vs Bot · Luna: <strong>{botNames[botType]}</strong></p>}<h1>{totalA === totalB ? '🤝 Hòa! Một trận đấu cân sức.' : totalA > totalB ? '🏆 Milo chiến thắng!' : '🌱 Milo chưa thắng lần này!'}</h1><p>{totalA === totalB ? 'Hai bên có cùng tổng lợi nhuận. Bạn có thể thử chiến lược khác.' : totalA > totalB ? 'Bạn đã vượt đối thủ về tổng lợi nhuận. Bạn có thể giữ vững thành tích không?' : 'Đối thủ đạt lợi nhuận cao hơn. Hãy thử một cách chơi khác trong trận tái đấu.'}</p><Garden moodA={totalA===totalB?'thinking':totalA>totalB?'smug':'furious'} moodB={totalA===totalB?'thinking':totalB>totalA?'smug':'furious'} />
      {mode!=='online'&&<p className="bot-banner">⭐ +20 XP mỗi trận · nhiệm vụ hằng ngày thưởng thêm +15 XP khi hoàn thành lần đầu.</p>}
      <div className="final-scores"><div><span>MILO</span><strong>{fmt(totalA)}</strong><small>cumulative profit</small></div><div><span>LUNA</span><strong>{fmt(totalB)}</strong><small>cumulative profit</small></div></div>
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Over {MAX_ROUNDS} rounds at H={h}, neither firm subscribed in {cooperation} rounds. Milo subscribed in {visibleHistory.filter(t=>t.a==='D').length} rounds and Luna in {visibleHistory.filter(t=>t.b==='D').length}. These are descriptive outcomes, not evidence of an optimal strategy.</p></div>
      <h2 className="history-title">All 10 rounds</h2>
      <div className="history-list">{visibleHistory.map(t => <div className="history-row" key={t.round}><span>Round {t.round}</span><span>{label(t.a)} / {label(t.b)}</span><strong>{fmt(t.pa)} / {fmt(t.pb)}</strong></div>)}</div>
      {mode==='online'&&<p className="bot-banner">Phòng {session?.code} · {rematchVotes}/2 người yêu cầu tái đấu. Cả hai cần đồng ý để bắt đầu trận mới.</p>}
      <div className="actions">{mode==='online'&&<button className="primary" disabled={votedRematch||connection!=='Connected'} onClick={requestRematch}>{votedRematch?'Đang đợi đối thủ…':'⚔️ Mời tái đấu ↻'}</button>}{mode !== 'online' && <button className="primary" onClick={rematch}>⚔️ Đấu lại ngay ↻</button>}<button className="secondary" onClick={reset}>Chọn chế độ khác</button></div>
    </section>}
    {notice&&<p role="status">{notice}</p>}
    <footer>AXELROD–COURNOT HUMAN DECISION EXPERIMENT · THE TRUST GARDEN</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
