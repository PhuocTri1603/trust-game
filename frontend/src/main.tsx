import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Choice = 'C' | 'D';
type Screen = 'intro' | 'tutorial' | 'game' | 'final';
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
  const [tutorial, setTutorial] = useState(0);
  const [round, setRound] = useState(1);
  const [a, setA] = useState<Choice | null>(null);
  const [b, setB] = useState<Choice | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const revealed = a !== null && b !== null;
  const scores = revealed ? PAYOFF[a + b] : null;
  const totalA = history.reduce((sum, t) => sum + t.pa, 0) + (scores?.[0] ?? 0);
  const totalB = history.reduce((sum, t) => sum + t.pb, 0) + (scores?.[1] ?? 0);
  const cooperation = history.filter(t => t.a === 'C' && t.b === 'C').length;
  const resultStory = a === 'C' && b === 'C' ? 'Both shared. The garden flourishes when trust is returned.' : a === 'D' && b === 'D' ? 'Neither shared. Both protected themselves, but the garden grew slowly.' : 'One gave while the other kept. Trust can be difficult to rebuild.';
  const reset = () => { setScreen('intro'); setTutorial(0); setRound(1); setA(null); setB(null); setHistory([]); };
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
      <p className="disclaimer">Interactive local prototype · Online two-player rooms are coming in a later milestone.</p>
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
      <div className="actions"><button className="secondary" onClick={() => tutorial === 0 ? setScreen('intro') : setTutorial(tutorial - 1)}>← Back</button><button className="primary" onClick={() => tutorial === 2 ? setScreen('game') : setTutorial(tutorial + 1)}>{tutorial === 2 ? 'Enter the garden' : 'Continue'} →</button></div>
    </section>}
    {screen === 'game' && <section className="story-screen">
      <div className="eyebrow">CHAPTER THREE · THE GARDEN GAME</div>
      <div className="game-heading"><h1>What will you choose?</h1><span className="round-pill">ROUND {round} / {MAX_ROUNDS}</span></div>
      <Garden moodA={revealed && a === 'C' && b === 'D' ? 'sad' : 'thinking'} moodB={revealed && a === 'D' && b === 'C' ? 'sad' : 'thinking'} />
      <div className="scoreboard"><div>MILO <strong>{totalA}</strong> points</div><div>LUNA <strong>{totalB}</strong> points</div></div>
      {!revealed ? <div className="choice-grid">
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
      <p className="disclaimer">Local two-seat demonstration: both choices are made on this device. Not yet private online multiplayer.</p>
    </section>}
    {screen === 'final' && <section className="story-screen">
      <div className="eyebrow">THE FINAL CHAPTER · WHAT GREW?</div><h1>Every garden tells a story.</h1><Garden />
      <div className="final-scores"><div><span>MILO</span><strong>{totalA}</strong><small>points</small></div><div><span>LUNA</span><strong>{totalB}</strong><small>points</small></div></div>
      <div className="dialogue"><span className="speaker">THE STORYTELLER</span><p>Across {MAX_ROUNDS} days, both gardeners shared together {cooperation} {cooperation === 1 ? 'time' : 'times'}. A single choice can earn points. A pattern of choices can build—or break—trust.</p></div>
      <h2 className="history-title">The ten days</h2>
      <div className="history-list">{history.map(t => <div className="history-row" key={t.round}><span>Day {t.round}</span><span>{label(t.a)} / {label(t.b)}</span><strong>+{t.pa} / +{t.pb}</strong></div>)}</div>
      <button className="primary" onClick={reset}>Play the story again ↻</button>
    </section>}
    <footer>AN ORIGINAL INTERACTIVE STORY · THE TRUST GARDEN</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
