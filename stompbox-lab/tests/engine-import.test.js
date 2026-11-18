const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  const res = await p.evaluate(async () => {
    const out = [];
    const ok = (name, cond, info = '') => out.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  [' + info + ']' : ''));
    const fr = logspace(20, 20000, 60);
    const acOut = c => { const n = compile(c), s = new Sim(n); if (!s.dcop()) throw new Error('dcop'); return s.ac(fr, [n.out])[0].mag.map(toDb); };
    const tranOut = c => { const n = compile(c), s = new Sim(n); s.dcop(); s.initTran(1 / 48000); const y = []; for (let i = 0; i < 4800; i++) { s.step(0.3 * Math.sin(2 * Math.PI * 440 * i / 48000)); y.push(s.V(n.out)); } return y; };
    const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    // 1. round-trip netlist di tutti gli esempi
    for (const k in EXAMPLES) {
      const c0 = buildExample(EXAMPLES[k][1]);
      circ = c0;
      const nl = genNetlist();
      const r = importNetlist(nl);
      const d1 = maxDiff(acOut(c0), acOut(r.circuit));
      const t0 = tranOut(c0), t1 = tranOut(r.circuit);
      const d2 = maxDiff(t0, t1);
      const pots0 = c0.comps.filter(c => c.type === 'POT').length, pots1 = r.circuit.comps.filter(c => c.type === 'POT').length;
      const sw0 = c0.comps.filter(c => c.type === 'SW').length, sw1 = r.circuit.comps.filter(c => c.type === 'SW').length;
      ok(`round-trip netlist "${k}"`, d1 < 0.05 && d2 < 2e-3 && pots0 === pots1 && sw0 === sw1 && !r.warnings.length,
         `ΔAC ${d1.toFixed(4)} dB, Δtran ${(d2 * 1000).toFixed(3)} mV, pot ${pots0}/${pots1}, sw ${sw0}/${sw1}, avvisi ${r.warnings.length}`);
    }
    // 2. round-trip JSON
    { const c0 = buildExample(EXAMPLES.overdrive[1]); circ = c0; const js = circuitJSON(); importAny(js); const d = maxDiff(acOut(c0), acOut(circ)); ok('round-trip JSON', d < 1e-9, 'Δ ' + d); }
    // 3. netlist LTspice scritta a mano: stadio non invertente, op-amp a 5 pin, .model, continuazioni, .param
    const lt = `* C:\\Users\\me\\Documents\\LTspice\\TS_test.asc
V1 VCC 0 9
V2 IN_SRC 0 SIN(0 0.1 1k) AC 1
Rin IN_SRC in 1k
C1 in N001 100n
R1 N001 VB 1Meg
R2 VCC VB 10k
R3 VB 0 10k
C2 VB 0 47u
XU1 N001 N002 VCC 0 out TL072
R4 out N002 {RF}
R5 N002 N003 10k
C3 N003 0 10u
D1 out N002 1N4148
+ ; continuazione
.param RF=100k
.model 1N4148 D(Is=2.52n Rs=0.568 N=1.752 Cjo=4p M=0.4 tt=20n)
.tran 0 10m
.backanno
.end`;
    const r = importNetlist(lt);
    circ = r.circuit;
    const n = compile(circ), s = new Sim(n); s.dcop();
    const vb = s.x[n.names.indexOf('VB') - 1];
    const g = s.ac([1000], [n.out])[0].mag[0];
    ok('import LTspice: op-amp a 5 pin e .param', r.circuit.comps.some(c => c.type === 'OPAMP' && c.props.vpos === 9 && c.props.vneg === 0), r.warnings.join(' | '));
    ok('import LTspice: VB = 4.5 V', Math.abs(vb - 4.5) < 0.01, vb.toFixed(4) + ' V');
    // guadagno atteso 1 + 100k/10k = 11 → con diodo polarizzato a 0 V resta ~11 (piccolo segnale)
    ok('import LTspice: guadagno 1 kHz ≈ 11 (20.8 dB)', Math.abs(toDb(g) - 20.83) < 0.3, toDb(g).toFixed(2) + ' dB');
    ok('import LTspice: titolo', r.title === 'TS_test', r.title);
    // 4. suffissi SPICE: M = milli, MEG = mega, 4k7
    ok('valori SPICE', spiceVal('1M') === 1e-3 && spiceVal('1MEG') === 1e6 && Math.abs(spiceVal('4k7') - 4700) < 1e-9 && Math.abs(spiceVal('2.2uF') - 2.2e-6) < 1e-15 && spiceVal('100') === 100);
    // 5. verifiche analitiche del motore
    const mk = fn => buildExample(fn);
    { // RC passa-basso: -3 dB a 1/(2πRC)
      const c = mk(a => { a.add('IN', 2, 6, 0, {rs:'1m'}); a.add('R', 6, 6, 0, {value:'10k'}); a.add('C', 8, 8, 1, {value:'10n'}); a.add('GND', 8, 10); a.w(8, 6, 12, 6); a.add('OUT', 14, 6, 0, {rl:'1G'}); });
      const n = compile(c), s = new Sim(n); s.dcop(); const fc = 1 / (2 * Math.PI * 1e4 * 1e-8);
      const m = s.ac([fc], [n.out])[0].mag[0]; ok('RC: -3.01 dB a fc', Math.abs(toDb(m) + 3.0103) < 0.01, toDb(m).toFixed(4) + ' dB');
    }
    { // op-amp non invertente guadagno 101: banda ≈ GBW/101
      const c = mk(a => {
        a.add('IN', 2, 6, 0, {rs:'1m'}); a.add('OPAMP', 6, 7, 0, {model:'TL072', vpos:15, vneg:-15}); a.w(4, 6, 4, 6);
        a.add('R', 4, 10, 1, {value:'1k'}); a.add('GND', 4, 12); a.w(4, 8, 4, 8);
        a.add('R', 7, 10, 0, {value:'100k'}); a.w(4, 8, 4, 10, 5, 10); a.w(9, 10, 9, 7); a.add('OUT', 13, 7, 0, {rl:'1G'}); a.w(9, 7, 11, 7);
      });
      const n = compile(c), s = new Sim(n); s.dcop();
      const ff = logspace(100, 1e6, 400), m = s.ac(ff, [n.out])[0].mag.map(toDb);
      const g0 = m[0], f3 = ff[m.findIndex(v => v < g0 - 3)];
      ok('op-amp: guadagno 40.1 dB', Math.abs(g0 - 40.09) < 0.1, g0.toFixed(2));
      ok('op-amp TL072: banda ≈ 3 MHz/101 ≈ 29.7 kHz', f3 > 26e3 && f3 < 33e3, fmtEng(f3, 'Hz'));
      // slew rate: gradino grande
      s.initTran(1e-7); let prev = s.V(n.out), maxSlope = 0;
      for (let i = 0; i < 400; i++) { s.step(1); const v = s.V(n.out); maxSlope = Math.max(maxSlope, (v - prev) / 1e-7); prev = v; }
      ok('op-amp TL072: slew rate ≈ 13 V/µs', maxSlope > 10e6 && maxSlope < 14.5e6, (maxSlope / 1e6).toFixed(2) + ' V/µs');
      ok('op-amp: saturazione a ±13.5 V', Math.abs(prev - 13.5) < 0.1, prev.toFixed(3) + ' V');
    }
    { // zener 5,1 V con 1k da 9 V
      const c = mk(a => { a.add('VCC', 2, 2); a.add('R', 2, 4, 1, {value:'1k'}); a.add('ZENER', 2, 8, 3, {model:'1N4733 (5,1 V)'}); a.add('GND', 2, 10); a.add('PROBE', 2, 6, 0, {label:'vz'}); });
      const n = compile(c), s = new Sim(n); s.dcop(); const v = s.V(n.probes[0].node);
      ok('Zener 5,1 V in breakdown', v > 5.0 && v < 5.3, v.toFixed(3) + ' V');
    }
    { // MOSFET 2N7000: Vgs 3 V, Rd 1k da 9 V → Id = β(Vgs-Vth)² = 0.05 A?? limitato da Rd → triodo
      const c = mk(a => { a.add('VCC', 2, 2, 0, {value:3}); a.add('NMOS', 6, 4); a.w(2, 2, 2, 4, 4, 4); a.add('VCC', 7, -2); a.add('R', 7, 0, 1, {value:'1k'}); a.add('GND', 7, 6); a.add('PROBE', 7, 2, 0, {label:'d'}); });
      const n = compile(c), s = new Sim(n); s.dcop(); const v = s.V(n.probes[0].node);
      ok('MOSFET 2N7000 acceso (Vds basso)', v > 0 && v < 0.5, v.toFixed(3) + ' V');
    }
    { // etichette di rete collegano nodi separati
      const c = mk(a => { a.add('IN', 2, 6, 0, {rs:'1m'}); a.add('NET', 4, 6, 0, {name:'X'}); a.add('NET', 10, 6, 2, {name:'X'}); a.add('OUT', 12, 6, 0, {rl:'1G'}); a.w(10, 6, 10, 6); a.add('GND', 0, 0); a.w(10, 6, 10, 6); });
      // OUT pin a (10,6) coincide con l'etichetta
      const n = compile(c), s = new Sim(n); s.dcop(); const m = s.ac([1000], [n.out])[0].mag[0];
      ok('etichette di rete con lo stesso nome sono collegate', Math.abs(m - 1) < 1e-3, m.toFixed(4));
    }
    { // deviatore: stato cambia la risposta
      const c = buildExample(EXAMPLES.dist[1]); circ = c;
      const sw = c.comps.find(x => x.type === 'SW');
      const amp = st => { sw.props.state = st; return Math.max(...tranOut(c).slice(2400)); };
      const a = amp('a'), b2 = amp('b'), o = amp('off');
      ok('deviatore: diodi < LED < nessun clipping', a < b2 && b2 < o, `${a.toFixed(3)} / ${b2.toFixed(3)} / ${o.toFixed(3)} V`);
    }
    return out;
  });
  console.log(res.join('\n'));
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
