import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Choice = 'C' | 'D';
type Screen = 'intro' | 'tutorial' | 'lobby' | 'game' | 'final';
type Turn = { round: number; a: Choice; b: Choice; pa: number; pb: number };
const PAYOFF: Record<string, [number, number]> = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };
const MAX_ROUNDS = 10;
const label = (c: Choice) => c === 'C' ? 'Share' : 'Keep';

function Character({ side, mood = 'happy' }: { side: 'a' | 'b'; mood?: 'happy' | 'sad' | 'thinking' }) {
  return <div className={`character ${side} ${mood}`} aria-label={side === 'a' ? 'Milo the gardener' : 'Luna the gardener'} role="img">
    <div className="hat"><div className="hat-brim" /></div>
    <div className="face"><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /></div>
    <div className="body"><span className="pocket">✿</span></div>
  </div>;
}
function Garden({ moodA, moodB }: { moodA?: 'happy' | 'sad' | 'thinking'; moodB?: 'happy' | 'sad' | 'thinking' }) {
  return <div className="garden" aria-label="A sunny garden with two cartoon gardeners">
    <div className="sky-sun">☀</div><div className="cloud cloud-one" /><div className="cloud cloud-two" />
    <div className="hill hill-one" /><div className="hill hill-two" />
    <div className="gardeners"><Character side="a" mood={moodA} /><div className="garden-center"><span>🌱</span><small>OUR GARDEN</small></div><Character side="b" mood={moodB} /></div>
    <div className="flowers">✿　🌷　✿　🌼　✿</div>
  </div>;
}

function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [invite, setInvite] = useState('');
  const [session, setSession] = useState<{code:string;token:string;seat:'A'|'B'} | null>(null);
  const [connection, setConnection] = useState('Not connected');
  const [players, setPlayers] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [onlineHistory, setOnlineHistory] = useState<Turn[]>([]);
  const socket = useRef<WebSocket | null>(null);
  const api = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\\/$/, '');
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
    try { const res = await fetch(api + '/rooms', {method:'POST'}); if (!res.ok) throw Error('Could not create room'); connect(await res.json()); } catch(e) {setConnection(String(e));}
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
  const scores = revealed ? PAYOFF[a + b] : null;
  const visibleHistory = mode === 'online' ? onlineHistory : history;
  const totalA = visibleHistory.reduce((sum, t) => sum + t.pa, 0) + (mode === 'local' ? (scores?.[0] ?? 0) : 0);
  const totalB = visibleHistory.reduce((sum, t) => sum + t.pb, 0) + (mode === 'local' ? (scores?.[1] ?? 0) : 0);
  const cooperation = visibleHistory.filter(t => t.a === 'C' && t.b === 'C').length;
  const resultStory = a === 'C' && b === 'C' ? 'Both shared. The garden flourishes when trust is returned.' : a === 'D' && b === 'D' ? 'Neither shared. Both protected themselves, but the garden grew slowly.' : 'One gave while the other kept. Trust can be difficult to rebuild.';
  const reset = () => { socket.current?.close(); sessionStorage.removeItem('trust-garden-session'); setSession(null); setMode('local'); setOnlineHistory([]); setScreen('intro'); setTutorial(0); setRound(1); setA(null); setB(null); setHistory([]); };
  const advance = () => {
    if (!a || !b || !scores) return;
    const next = [...history, { round, a, b, pa: scores[0], pb: scores[1] }];
    setHistory(next); setA(null); setB(null);
    if (round === MAX_ROUNDS) setScreen('final');
    else setRound(round + 1);
  };

  return <main className="app-shell">
    <header className="topbar"><span className="brand">✿ THE TRUST GARDEN</span><span className="edition">A LITTLE STORY ABOUT BIG CHOICES</span></header>
    {screen === 'intro' && <section className="story-screen">
      <div className="eyebrow">CHAPTER ONE · TWO STRANGERS</div>
      <h1>Can a garden grow on trust?</h1>
      <Garden />
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Milo and Luna have inherited a little garden. Each day, they can share their harvest—or keep it for themselves. They cannot know what the other will choose.</p></div>
      <button className="primary" onClick={() => setScreen('tutorial')}>Discover the rules <span>→</span></button>
      <p className="disclaimer">Online play requires a separately hosted backend. Local demo works without one.</p>
    </section>}
    {screen === 'tutorial' && <section className="story-screen">
      <div className="eyebrow">CHAPTER TWO · THE CHOICE</div>
      <h1>Every choice changes the story.</h1>
      <Garden moodA="thinking" moodB="thinking" />
      <div className="dialogue"><span className="speaker">THE STORYTELLER · {tutorial + 1} OF 3</span>
        {tutorial === 0 && <p><strong>Share 🌱</strong> means giving some of your harvest to help the other gardener. If both share, both earn <strong>3 points</strong>.</p>}
        {tutorial === 1 && <p><strong>Keep 🧺</strong> means protecting your harvest. If one keeps while the other shares, the keeper earns <strong>5</strong> and the sharer earns <strong>0</strong>.</p>}
        {tutorial === 2 && <p>If both keep, each earns <strong>1 point</strong>. Play <strong>10 rounds</strong>. In the real online game, choices stay secret until both players have committed.</p>}
      </div>
      <div className="dots" aria-label="Tutorial progress">{[0, 1, 2].map(i => <span key={i} className={i === tutorial ? 'active' : ''} />)}</div>
      <div className="actions"><button className="secondary" onClick={() => tutorial === 0 ? setScreen('intro') : setTutorial(tutorial - 1)}>← Back</button><button className="primary" onClick={() => tutorial === 2 ? setScreen('lobby') : setTutorial(tutorial + 1)}>{tutorial === 2 ? 'Enter the garden' : 'Continue'} →</button></div>
    </section>}
    {screen === 'lobby' && <section className="story-screen">
      <div className="eyebrow">CHAPTER THREE · INVITE A FRIEND</div><h1>Every garden needs two gardeners.</h1><Garden />
      <div className="dialogue"><span className="speaker">CHOOSE HOW TO PLAY</span><p>For online play, both players open the website on their own device. The room host shares a six-character code. The backend must be deployed separately.</p></div>
      <div className="choice-grid">
        <div className="choice-card"><h2>ONLINE · TWO DEVICES</h2><button className="primary" onClick={createRoom}>Create private room</button>
          <p>Or join your friend's room:</p><input aria-label="Room code" placeholder="ROOM CODE" maxLength={6} value={invite} onChange={e=>setInvite(e.target.value)} />
          <button className="secondary" onClick={joinRoom}>Join room</button>
          {session && <p><strong>Room {session.code}</strong> · Seat {session.seat} · {players}/2 players</p>}
          <p role="status">{connection}</p>
        </div>
        <div className="choice-card"><h2>LOCAL · ONE DEVICE</h2><p>Try both roles on one screen to explore the rules before inviting someone.</p>
          <button className="secondary" onClick={() => {setMode('local');setScreen('game');}}>Try local demo</button>
        </div>
      </div>
      {session && <p>Share code <strong>{session.code}</strong> with your friend. The game begins automatically when both join.</p>}
    </section>}
    {screen === 'game' && <section className="story-screen">
      <div className="eyebrow">CHAPTER THREE · THE GARDEN GAME</div>
      <div className="game-heading"><h1>What will you choose?</h1><span className="round-pill">ROUND {round} / {MAX_ROUNDS}</span></div>
      <Garden moodA={revealed && a === 'C' && b === 'D' ? 'sad' : 'thinking'} moodB={revealed && a === 'D' && b === 'C' ? 'sad' : 'thinking'} />
      <div className="scoreboard"><div>MILO <strong>{totalA}</strong> points</div><div>LUNA <strong>{totalB}</strong> points</div></div>
      {mode === 'online' ? <div className="choice-card">
        <h2>YOU ARE {session?.seat === 'A' ? 'MILO' : 'LUNA'} · {connection}</h2>
        <p>{submitted ? 'Choice locked. Waiting for the other gardener…' : 'Your choice stays secret until both players have decided.'}</p>
        <div className="choice-buttons"><button disabled={submitted || players < 2} onClick={()=>onlineChoose('C')}>🌱 Share</button><button disabled={submitted || players < 2} onClick={()=>onlineChoose('D')}>🧺 Keep</button></div>
        <p>{players}/2 players connected to room {session?.code}</p>
        {onlineHistory.length > 0 && <p>Last round: Milo {label(onlineHistory[onlineHistory.length-1].a)}, Luna {label(onlineHistory[onlineHistory.length-1].b)} · +{onlineHistory[onlineHistory.length-1].pa} / +{onlineHistory[onlineHistory.length-1].pb}</p>}
      </div> : !revealed ? <div className="choice-grid">
        {([{ who: 'MILO', value: a, setter: setA }, { who: 'LUNA', value: b, setter: setB }] as const).map(player => <div className="choice-card" key={player.who}>
          <h2>{player.who}'S TURN</h2><p>{player.value ? 'Choice locked. Waiting for the other gardener.' : 'Make a choice for this gardener.'}</p>
          <div className="choice-buttons"><button disabled={player.value !== null} onClick={() => player.setter('C')}>🌱 Share</button><button disabled={player.value !== null} onClick={() => player.setter('D')}>🧺 Keep</button></div>
          <span className="choice-status">{player.value ? '✓ Choice submitted' : '○ Waiting for choice'}</span>
        </div>)}
      </div> : <div className="reveal" aria-live="polite">
        <div className="eyebrow">THE CHOICES ARE REVEALED</div>
        <h2>Milo: {label(a)} · Luna: {label(b)}</h2>
        <p>{resultStory}</p><div className="reveal-points">Milo +{scores?.[0]} <span>✿</span> Luna +{scores?.[1]}</div>
        <button className="primary" onClick={advance}>{round === MAX_ROUNDS ? 'See our story →' : 'Next round →'}</button>
      </div>}
      <p className="disclaimer">{mode === 'local' ? 'Local two-seat demonstration: both choices are made on this device.' : 'Online prototype: room state is held in server memory; restarting the backend ends the session.'}</p>
    </section>}
    {screen === 'final' && <section className="story-screen">
      <div className="eyebrow">THE FINAL CHAPTER · WHAT GREW?</div><h1>Every garden tells a story.</h1><Garden />
      <div className="final-scores"><div><span>MILO</span><strong>{totalA}</strong><small>points</small></div><div><span>LUNA</span><strong>{totalB}</strong><small>points</small></div></div>
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Across {MAX_ROUNDS} days, both gardeners shared together {cooperation} {cooperation === 1 ? 'time' : 'times'}. A single choice can earn points. A pattern of choices can build—or break—trust.</p></div>
      <h2 className="history-title">The ten days</h2>
      <div className="history-list">{visibleHistory.map(t => <div className="history-row" key={t.round}><span>Day {t.round}</span><span>{label(t.a)} / {label(t.b)}</span><strong>+{t.pa} / +{t.pb}</strong></div>)}</div>
      <button className="primary" onClick={reset}>Play the story again ↻</button>
    </section>}
    <footer>AN ORIGINAL INTERACTIVE STORY · THE TRUST GARDEN</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
