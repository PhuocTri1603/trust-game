import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Choice = 'C' | 'D';
type Screen = 'intro' | 'tutorial' | 'lobby' | 'game' | 'final';
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

function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [invite, setInvite] = useState('');
  const [h,setH] = useState(3);
  const [session, setSession] = useState<{code:string;token:string;seat:'A'|'B'} | null>(null);
  const [connection, setConnection] = useState('Not connected');
  const [players, setPlayers] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [onlineHistory, setOnlineHistory] = useState<Turn[]>([]);
  const socket = useRef<WebSocket | null>(null);
  const api = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const connect = (data:{code:string;token:string;seat:'A'|'B'}) => {
    socket.current?.close();
    setMode('online');
    setSession(data);
    sessionStorage.setItem('trust-garden-session', JSON.stringify(data));
    setConnection('Connecting…');
    const ws = new WebSocket(api.replace(/^http/, 'ws') + '/ws/' + data.code + '?token=' + encodeURIComponent(data.token));
    socket.current = ws;
    ws.onopen = () => setConnection('Connected');
    ws.onclose = () => setConnection('Disconnected — reconnect to resume');
    ws.onerror = () => setConnection('Connection error');
    ws.onmessage = (event:MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'room.state') {
        setH(msg.h);
        setPlayers(msg.players);
        setRound(Math.min(msg.round, MAX_ROUNDS));
        setSubmitted(msg.submitted);
        setOnlineHistory(msg.history.map((t:{round:number;a:Choice;b:Choice;points:number[]}) => ({round:t.round,a:t.a,b:t.b,pa:t.points[0],pb:t.points[1]})));
        if (msg.finished) setScreen('final');
        else if (msg.players === 2) setScreen('game');
      }
      if (msg.type === 'error') setConnection(msg.message);
    };
  };
  useEffect(() => {
    const saved = sessionStorage.getItem('trust-garden-session');
    if (saved) { try { const data = JSON.parse(saved); if (data.code && data.token && (data.seat === 'A' || data.seat === 'B')) connect(data); } catch { sessionStorage.removeItem('trust-garden-session'); } }
    return () => { socket.current?.close(); };
  }, []);
  const createRoom = async () => {
    try { const res = await fetch(api + '/rooms', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({h})}); if (!res.ok) throw Error('Could not create room'); connect(await res.json()); } catch(e) {setConnection(String(e));}
  };
  const joinRoom = async () => {
    try { const res = await fetch(api + '/rooms/join', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:invite.trim().toUpperCase()})}); if (!res.ok) throw Error('Room unavailable or full'); connect(await res.json()); } catch(e) {setConnection(String(e));}
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
  const totalA = visibleHistory.reduce((sum, t) => sum + t.pa, 0) + (mode === 'local' ? (scores?.[0] ?? 0) : 0);
  const totalB = visibleHistory.reduce((sum, t) => sum + t.pb, 0) + (mode === 'local' ? (scores?.[1] ?? 0) : 0);
  const latest = visibleHistory[visibleHistory.length - 1];
  const lastPayoffs: [number,number] | null = mode === 'local' && scores ? scores : latest ? [latest.pa, latest.pb] : null;
  const moodFor = (seat:0|1):'thinking'|'smug'|'furious' => !lastPayoffs || lastPayoffs[0] === lastPayoffs[1] ? 'thinking' : lastPayoffs[seat] > lastPayoffs[1-seat] ? 'smug' : 'furious';
  const cooperation = visibleHistory.filter(t => t.a === 'C' && t.b === 'C').length;
  const resultStory = a === 'C' && b === 'C' ? 'Cả hai chọn Đồng lòng (không dùng AI).' : a === 'D' && b === 'D' ? 'Cả hai chọn Âm thầm (đăng ký AI và trả phí).' : 'Hai bên đưa ra lựa chọn khác nhau. Lợi nhuận được tính theo mô hình Cournot.';
  const reset = () => { socket.current?.close(); sessionStorage.removeItem('trust-garden-session'); setSession(null); setMode('local'); setOnlineHistory([]); setScreen('intro'); setTutorial(0); setRound(1); setA(null); setB(null); setHistory([]); setH(3); };
  const advance = () => {
    if (!a || !b || !scores) return;
    const next = [...history, { round, a, b, pa: scores[0], pb: scores[1] }];
    setHistory(next); setA(null); setB(null);
    if (round === MAX_ROUNDS) setScreen('final');
    else setRound(round + 1);
  };

  return <main className="app-shell">
    <header className="topbar"><span className="brand">⚙ THE TRUST GARDEN · AI COMPETITION</span><span className="edition">AN AXELROD–COURNOT EXPERIMENT</span></header>
    {screen === 'intro' && <section className="story-screen">
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
      <div className="dialogue"><span className="speaker">CHOOSE HOW TO PLAY</span><p>Both firms join from separate devices. The host selects H (1–6) before creating the room. The same H applies to all 10 rounds.</p></div>
      <div className="dialogue"><span className="speaker">PAYOFF MATRIX · H={h}</span><table className="payoff-table"><thead><tr><th>Milo / Luna</th><th>Đồng lòng</th><th>Âm thầm</th></tr></thead><tbody>{([["C","C"],["C","D"],["D","C"],["D","D"]] as Choice[][]).filter((_,i)=>i===0||i===1||i===2||i===3).map(([x,y],i)=><tr key={i}><th>{label(x)} / {label(y)}</th><td colSpan={2}>{fmt(payoff(x,y,h)[0])} / {fmt(payoff(x,y,h)[1])}</td></tr>)}</tbody></table><p>Payoffs shown as Milo / Luna. H={h}, m=8, d=1, F=10. Payoffs are rounded to whole numbers each round. Negative payoffs are possible.</p></div><div className="choice-grid">
        <div className="choice-card"><h2>ONLINE · TWO DEVICES</h2><label htmlFor="h-select">AI benefit horizon H: </label><select id="h-select" value={h} disabled={!!session} onChange={e=>setH(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select><button className="primary" onClick={createRoom}>Create private room</button>
          <p>Or join your friend's room:</p><input aria-label="Room code" placeholder="ROOM CODE" maxLength={6} value={invite} onChange={e=>setInvite(e.target.value)} />
          <button className="secondary" onClick={joinRoom}>Join room</button>
          {session && <p><strong>Room {session.code}</strong> · H={h} · Seat {session.seat} · {players}/2 players</p>}
          <p role="status">{connection}</p>
        </div>
        <div className="choice-card"><h2>LOCAL · ONE DEVICE</h2><p>Explore both firms on one device. This demo does not conceal choices from the person holding the device.</p>
          <button className="secondary" onClick={() => {setMode('local');setScreen('game');}}>Try local demo (H={h})</button>
        </div>
      </div>
      {session && <p>Share code <strong>{session.code}</strong> with your friend. The game begins automatically when both join.</p>}
    </section>}
    {screen === 'game' && <section className="story-screen">
      <div className="eyebrow">CHAPTER FOUR · AI COMPETITION</div>
      <div className="game-heading"><h1>Đồng lòng hay Âm thầm?</h1><span className="round-pill">ROUND {round} / {MAX_ROUNDS} · H={h}</span></div>
      <Garden moodA={moodFor(0)} moodB={moodFor(1)} />
      <div className="scoreboard"><div>MILO <strong>{fmt(totalA)}</strong> profit</div><div>LUNA <strong>{fmt(totalB)}</strong> profit</div></div>
      {mode === 'online' ? <div className="choice-card">
        <h2>YOU ARE {session?.seat === 'A' ? 'MILO' : 'LUNA'} · {connection}</h2>
        <p>{submitted ? 'Choice locked. Waiting for the other firm…' : 'Lựa chọn Đồng lòng / Âm thầm được giữ bí mật đến khi cả hai quyết định.'}</p>
        <div className="choice-buttons"><button disabled={submitted || players < 2} onClick={()=>onlineChoose('C')}>🤝 Đồng lòng</button><button disabled={submitted || players < 2} onClick={()=>onlineChoose('D')}>🤫 Âm thầm</button></div>
        <p>{players}/2 players connected to room {session?.code}</p>
        {onlineHistory.length > 0 && <p>Last round: Milo {label(onlineHistory[onlineHistory.length-1].a)}, Luna {label(onlineHistory[onlineHistory.length-1].b)} · {fmt(onlineHistory[onlineHistory.length-1].pa)} / {fmt(onlineHistory[onlineHistory.length-1].pb)}</p>}
      </div> : !revealed ? <div className="choice-grid">
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
      <p className="disclaimer">{mode === 'local' ? 'Local two-seat demonstration: both choices are made on this device.' : 'Online prototype: room state is held in server memory; restarting the backend ends the session.'}</p>
    </section>}
    {screen === 'final' && <section className="story-screen">
      <div className="eyebrow">FINAL RESULTS · WHAT DID YOU EARN?</div><h1>Every decision shapes the market.</h1><Garden moodA={totalA===totalB?'thinking':totalA>totalB?'smug':'furious'} moodB={totalA===totalB?'thinking':totalB>totalA?'smug':'furious'} />
      <div className="final-scores"><div><span>MILO</span><strong>{fmt(totalA)}</strong><small>cumulative profit</small></div><div><span>LUNA</span><strong>{fmt(totalB)}</strong><small>cumulative profit</small></div></div>
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Over {MAX_ROUNDS} rounds at H={h}, neither firm subscribed in {cooperation} rounds. Milo subscribed in {visibleHistory.filter(t=>t.a==='D').length} rounds and Luna in {visibleHistory.filter(t=>t.b==='D').length}. These are descriptive outcomes, not evidence of an optimal strategy.</p></div>
      <h2 className="history-title">All 10 rounds</h2>
      <div className="history-list">{visibleHistory.map(t => <div className="history-row" key={t.round}><span>Round {t.round}</span><span>{label(t.a)} / {label(t.b)}</span><strong>{fmt(t.pa)} / {fmt(t.pb)}</strong></div>)}</div>
      <button className="primary" onClick={reset}>Start another match ↻</button>
    </section>}
    <footer>AXELROD–COURNOT HUMAN DECISION EXPERIMENT · THE TRUST GARDEN</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
