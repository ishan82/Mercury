const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  const R = (n, c, i = '') => console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  [' + i + ']' : ''));
  await p.selectOption('#selExample', 'overdrive'); await p.waitForTimeout(600);
  // --- manopola in tempo reale
  await p.evaluate(() => { window.__runs = 0; const o = runAll; window.runAll = runAll = function(...a){ window.__runs++; return o.apply(this, a); }; });
  const f0 = await p.evaluate(() => st.lastFreq.db[80]);
  const kb = await p.locator('.knob[data-kid] svg').first().boundingBox();
  await p.mouse.move(kb.x + 28, kb.y + 28); await p.mouse.down();
  const t0 = Date.now();
  for (let i = 1; i <= 30; i++) { await p.mouse.move(kb.x + 28, kb.y + 28 - i * 2); await p.waitForTimeout(16); }
  const midDrag = await p.evaluate(() => ({db: st.lastFreq.db[80], runs: window.__runs, sticky: st.sticky}));
  await p.mouse.up(); await p.waitForTimeout(400);
  const dt = Date.now() - t0;
  R('manopola: risposta aggiornata durante il trascinamento', midDrag.db !== f0 && midDrag.sticky, `${f0.toFixed(2)} → ${midDrag.db.toFixed(2)} dB a ${midDrag.runs} aggiornamenti in ${dt} ms`);
  R('manopola: ≥ 8 aggiornamenti/s', midDrag.runs / (dt / 1000) >= 8, (midDrag.runs / (dt / 1000)).toFixed(1) + ' agg/s');
  // --- sweep e riferimento
  await p.selectOption('#fSweep', {index: 1}); await p.waitForTimeout(300);
  const ns = await p.evaluate(() => document.querySelector('#cvFreq')._cfg.series.length);
  R('sweep potenziometro: 5 curve + uscita + sonda', ns === 7, ns + ' serie');
  await p.selectOption('#fSweep', ''); await p.click('#fRef');
  await p.evaluate(() => { circ.comps.find(c => c.props.label === 'Tone').props.pos = 0.1; changed(); });
  await p.waitForTimeout(500);
  const names = await p.evaluate(() => document.querySelector('#cvFreq')._cfg.series.map(s => s.name));
  R('curva di riferimento visibile dopo una modifica', names.includes('Riferimento'), names.join(', '));
  // --- selezione ad area, copia/incolla, elimina, annulla
  const nBefore = await p.evaluate(() => [circ.comps.length, circ.wires.length]);
  const box = await p.locator('#sch').boundingBox();
  const g2s = async (gx, gy) => p.evaluate(([gx, gy]) => { const pt = svg.createSVGPoint(); pt.x = gx * 20; pt.y = gy * 20; const r = pt.matrixTransform(svg.getScreenCTM()); return [r.x, r.y]; }, [gx, gy]);
  let [x1, y1] = await g2s(20.5, 5); let [x2, y2] = await g2s(37, 16.5);
  await p.mouse.move(x1, y1); await p.mouse.down(); await p.mouse.move(x2, y2, {steps: 6}); await p.mouse.up();
  const sel = await p.evaluate(() => st.multi ? [st.multi.c.size, st.multi.w.size] : null);
  R('selezione ad area', sel && sel[0] >= 6, JSON.stringify(sel));
  await p.keyboard.press('Control+c'); await p.keyboard.press('Control+v'); await p.waitForTimeout(300);
  const nPaste = await p.evaluate(() => [circ.comps.length, circ.wires.length, new Set(circ.comps.map(c => c.ref).filter(Boolean)).size === circ.comps.filter(c => c.ref).length]);
  R('copia/incolla con riferimenti univoci', nPaste[0] === nBefore[0] + sel[0] && nPaste[2], JSON.stringify(nPaste));
  await p.keyboard.press('Delete'); await p.waitForTimeout(100);
  const nDel = await p.evaluate(() => circ.comps.length);
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  const nUndo = await p.evaluate(() => circ.comps.length);
  R('elimina e annulla', nDel === nBefore[0] && nUndo === nBefore[0], `${nDel} / ${nUndo}`);
  // spostamento con le frecce
  await p.evaluate(() => setSelection(circ.comps.slice(0, 3).map(c => c.id), []));
  const x0 = await p.evaluate(() => circ.comps[0].x);
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  R('sposta selezione con le frecce', (await p.evaluate(() => circ.comps[0].x)) === x0 + 2);
  await p.keyboard.press('Escape');
  // --- nuovi componenti da tastiera
  await p.click('#bNew'); await p.click('#bNew'); await p.waitForTimeout(200);
  await p.evaluate(() => { st.view = {x:-40, y:-40, s:1}; updateView(); });
  const click = async (gx, gy) => { const [x, y] = await g2s(gx, gy); await p.mouse.click(x, y); };
  for (const [k, gx, gy] of [['z', 4, 4], ['f', 12, 4], ['s', 20, 4], ['k', 28, 4], ['a', 36, 4]]) { await p.keyboard.press(k); await click(gx, gy); }
  await p.keyboard.press('Escape');
  const types = await p.evaluate(() => circ.comps.map(c => c.type).join(','));
  R('posizionamento Zener, MOSFET, deviatore, etichetta, op-amp', types === 'ZENER,NMOS,SW,NET,OPAMP', types);
  // --- import da file
  await p.setInputFiles('#fOpen', require('path').join(__dirname, 'nets/ts.cir')); await p.waitForTimeout(800);
  const imp = await p.evaluate(() => ({title: $('#title').value, n: circ.comps.filter(c => !['NET', 'GND'].includes(c.type)).length, st: $('#stMsg').textContent, modal: !$('#modal').hidden, warn: $('#mText').value, out: st.net && st.net.out > 0, f: $('#roFreq').innerText}));
  R('import file .cir', imp.title === 'Screamer test' && imp.out && imp.n >= 14, JSON.stringify(imp));
  if (imp.modal) await p.click('#mClose');
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'imported.png') });
  // --- import da testo incollato
  await p.click('#bExport'); await p.click('[data-exp=import]');
  await p.fill('#mText', 'R1 in out 10k\nC1 out 0 10n\nV1 in 0 AC 1\n.end');
  await p.click('#mAct'); await p.waitForTimeout(500);
  const imp2 = await p.evaluate(() => ({n: circ.comps.length, f: $('#roFreq').innerText.replace(/\n/g, ' '), modal: !$('#modal').hidden}));
  R('import da testo incollato (RC)', /1\.5\dkHz|1\.6\dkHz/.test(imp2.f), JSON.stringify(imp2));
  // --- deviatore dai controlli
  await p.selectOption('#selExample', 'dist'); await p.waitForTimeout(600);
  const before = await p.evaluate(() => st.lastScope && Math.max(...st.lastScope.ys[0]));
  await p.click('.swk button'); await p.waitForTimeout(400);
  const after = await p.evaluate(() => [swState(circ.comps.find(c => c.type === 'SW')), Math.max(...st.lastScope.ys[0])]);
  R('deviatore commutato dal pannello', after[0] === 'b' && after[1] > before, `${before.toFixed(3)} → ${after[1].toFixed(3)} V (${after[0]})`);
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'dist2.png') });
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
