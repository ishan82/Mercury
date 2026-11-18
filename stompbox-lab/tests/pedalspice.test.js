const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = process.argv[2] || path.join(__dirname, 'pedalspice/The-Expander.pedal.json');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(800);
  const txt = fs.readFileSync(FILE, 'utf8');
  const res = await p.evaluate(t => {
    const out = [], ok = (n, c, i = '') => out.push((c ? 'PASS ' : 'FAIL ') + n + (i ? '  [' + i + ']' : ''));
    const fr = logspace(20, 20000, 80);
    const sim = c => { const n = compile(c), s = new Sim(n); s.dcop(); const ac = s.ac(fr, [n.out])[0].mag.map(toDb); s.initTran(1 / 48000); const y = []; for (let i = 0; i < 4800; i++) { s.step(0.1 * Math.sin(2 * Math.PI * 440 * i / 48000)); y.push(s.V(n.out)); } return {ac, y}; };
    const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const d0 = JSON.parse(t);
    // reti attese dal file originale (per confronto indipendente)
    const r1 = importPedal(d0);
    ok('import PedalSpice senza avvisi', r1.warnings.length === 0, r1.warnings.join(' | '));
    const kinds = {}; for (const c of r1.circuit.comps) kinds[c.type] = (kinds[c.type] || 0) + 1;
    const want = {}; for (const x of d0.parts) want[x.type] = (want[x.type] || 0) + 1;
    ok('conteggio componenti', kinds.R === want.resistor && kinds.C === want.capacitor && kinds.OPAMP === want.opamp && kinds.POT === want.pot && (kinds.D || 0) + (kinds.LED || 0) === want.diode && kinds.NMOS === (want.mosfet || 0), JSON.stringify(kinds));
    // round-trip import → export → import
    circ = r1.circuit; $('#title').value = r1.title;
    const ex = exportPedal();
    const r2 = importPedal(JSON.parse(JSON.stringify(ex.json)));
    const s1 = sim(r1.circuit), s2 = sim(r2.circuit);
    ok('round-trip PedalSpice: risposta identica', diff(s1.ac, s2.ac) < 1e-6, diff(s1.ac, s2.ac).toExponential(2) + ' dB');
    ok('round-trip PedalSpice: forma d\'onda identica', diff(s1.y, s2.y) < 1e-6, (diff(s1.y, s2.y) * 1e3).toFixed(6) + ' mV');
    const pots = r2.circuit.comps.filter(c => c.type === 'POT').map(c => `${c.props.label}:${c.props.value}/${c.props.taper}/${c.props.pos}`).join(' ');
    ok('round-trip: potenziometri', pots.includes('Gain:500k/log/0.5') && pots.includes('Tone:25k/lin/0.5') && pots.includes('Volume:100k/log/0.5'), pots);
    ok('export: formato pedal-sim v3', ex.json.app === 'pedal-sim' && ex.json.version === 3 && ex.json.supply === 'pm9' && ex.json.parts.every(x => x.id && x.type && 'x' in x && 'y' in x) && ex.json.wires.every(w => w.a.part && w.b.part !== undefined), `${ex.json.parts.length} parti, ${ex.json.wires.length} fili`);
    // esempi di Stompbox Lab → PedalSpice → di nuovo
    for (const k in EXAMPLES) {
      const c0 = buildExample(EXAMPLES[k][1]); circ = c0;
      const e = exportPedal(), r = importPedal(JSON.parse(JSON.stringify(e.json)));
      const a = sim(c0), b2 = sim(r.circuit);
      // i deviatori sono esportati come collegamento fisso: confronto valido nella posizione attuale
      ok(`esempio "${k}" → PedalSpice → import`, diff(a.ac, b2.ac) < 0.05 && diff(a.y, b2.y) < 2e-3, `ΔAC ${diff(a.ac, b2.ac).toFixed(4)} dB, Δt ${(diff(a.y, b2.y) * 1e3).toFixed(3)} mV, avvisi ${e.warnings.length + r.warnings.length}`);
    }
    return out;
  }, txt);
  console.log(res.join('\n'));
  // regolazione dal vivo sul circuito grande
  await p.setInputFiles('#fOpen', FILE); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__runs = 0; const o = runAll; window.runAll = runAll = function(...a){ window.__runs++; return o.apply(this, a); }; });
  const f0 = await p.evaluate(() => st.lastFreq.db[60]);
  const kb = await p.locator('.knob[data-kid] svg').first().boundingBox();
  await p.mouse.move(kb.x + 28, kb.y + 28); await p.mouse.down();
  const t0 = Date.now();
  for (let i = 1; i <= 40; i++) { await p.mouse.move(kb.x + 28, kb.y + 28 - i * 2); await p.waitForTimeout(16); }
  const mid = await p.evaluate(() => ({db: st.lastFreq.db[60], runs: window.__runs}));
  const dt = Date.now() - t0;
  await p.mouse.up(); await p.waitForTimeout(800);
  console.log((mid.db !== f0 ? 'PASS' : 'FAIL') + ` manopola dal vivo su The Expander  [${mid.runs} aggiornamenti in ${dt} ms = ${(mid.runs / dt * 1000).toFixed(1)}/s, ${f0.toFixed(2)} → ${mid.db.toFixed(2)} dB]`);
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'expander.png') });
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
