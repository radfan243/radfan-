(() => {
  const style = document.createElement('style');
  style.textContent = `
    .analysis-open-btn{border:1px solid #80652c;background:linear-gradient(145deg,#21190a,#0d0e12);color:#e8c76b;border-radius:11px;padding:8px 12px;font-family:inherit;font-size:9px;font-weight:800;cursor:pointer;box-shadow:0 0 20px rgba(216,174,77,.08)}
    .analysis-open-btn:hover{border-color:#c9a34c;transform:translateY(-1px)}
    .chart-panel.premium-focus{position:fixed;inset:10px;z-index:9999;margin:0!important;border-color:#6e5728;background:linear-gradient(145deg,#090b10,#05070d);box-shadow:0 25px 100px rgba(0,0,0,.8);display:flex;flex-direction:column;padding:18px}
    .chart-panel.premium-focus canvas{flex:1;min-height:0;height:auto!important;margin-top:12px;touch-action:none;cursor:grab}
    .chart-panel.premium-focus canvas.dragging{cursor:grabbing}
    .chart-panel.premium-focus .chart-legend{padding-top:8px}
    .chart-panel.premium-focus:before{content:'GOLDAN AI  •  REAL MARKET  •  LIVE';position:absolute;top:8px;left:18px;color:#5e6572;font-size:8px;letter-spacing:1.5px}
    .analysis-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);z-index:9998}
    .analysis-backdrop.show{display:block}
    .chart-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .chart-mode{border:1px solid #292d34;background:#0b0d11;color:#9ca2ae;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:8px}
    .chart-mode.active{color:#e7c86f;border-color:#765e28;background:#17130b}
    @media(max-width:560px){.chart-panel.premium-focus{inset:4px;padding:10px;border-radius:15px}.chart-panel.premium-focus canvas{min-height:0}.analysis-open-btn{padding:7px 9px}}
  `;
  document.head.appendChild(style);

  const panel = document.querySelector('.chart-panel');
  const head = panel?.querySelector('.chart-head');
  const canvas = document.getElementById('chart');
  if (!panel || !head || !canvas) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'analysis-backdrop';
  document.body.appendChild(backdrop);

  const tools = document.createElement('div');
  tools.className = 'chart-tools';
  const mode = document.createElement('span');
  mode.className = 'chart-mode active';
  mode.textContent = 'LIVE • OHLCV';
  const open = document.createElement('button');
  open.className = 'analysis-open-btn';
  open.textContent = '⛶ تحليل كامل';
  open.setAttribute('aria-label','فتح التحليل بملء الشاشة');
  tools.append(mode, open);
  head.appendChild(tools);

  const close = () => {
    panel.classList.remove('premium-focus');
    backdrop.classList.remove('show');
    document.body.style.overflow='';
    canvas.classList.remove('dragging');
    open.textContent='⛶ تحليل كامل';
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  };
  const openFull = () => {
    panel.classList.add('premium-focus');
    backdrop.classList.add('show');
    document.body.style.overflow='hidden';
    open.textContent='✕ إغلاق التحليل';
    setTimeout(() => { window.dispatchEvent(new Event('resize')); drawPremium(); }, 40);
  };
  open.onclick=()=>panel.classList.contains('premium-focus')?close():openFull();
  backdrop.onclick=close;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('premium-focus'))close()});

  let viewStart=null;
  let dragging=false;
  let startX=0;
  let startStart=0;
  const VISIBLE=100;
  const getMaxStart=()=>Math.max(0,(typeof state!=='undefined'&&Array.isArray(state.klines)?state.klines.length:0)-VISIBLE);
  const ensureView=()=>{const max=getMaxStart();if(viewStart===null)viewStart=max;viewStart=Math.max(0,Math.min(max,viewStart));return viewStart};

  canvas.addEventListener('pointerdown',e=>{
    if(!panel.classList.contains('premium-focus')) return;
    dragging=true;startX=e.clientX;startStart=ensureView();canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const sourceLen=typeof state!=='undefined'&&Array.isArray(state.klines)?state.klines.length:0;
    const maxStart=Math.max(0,sourceLen-VISIBLE);
    const w=canvas.clientWidth||360;
    const pixelsPerCandle=Math.max(2,w/VISIBLE);
    const candleShift=Math.round((startX-e.clientX)/pixelsPerCandle);
    viewStart=Math.max(0,Math.min(maxStart,startStart+candleShift));
    drawPremium();
  });
  const stopDrag=()=>{dragging=false;canvas.classList.remove('dragging')};
  canvas.addEventListener('pointerup',stopDrag);
  canvas.addEventListener('pointercancel',stopDrag);
  canvas.addEventListener('wheel',e=>{
    if(!panel.classList.contains('premium-focus')) return;
    e.preventDefault();
    const dir=e.deltaY>0?1:-1;
    viewStart=Math.max(0,Math.min(getMaxStart(),ensureView()+dir*5));
    drawPremium();
  },{passive:false});

  function drawPremium(){
    if(typeof state==='undefined'||!Array.isArray(state.klines)||state.klines.length<20) return;
    const c=canvas,ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight||300;
    c.width=Math.max(1,w*dpr); c.height=Math.max(1,h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const all=state.klines;
    const maxStart=Math.max(0,all.length-VISIBLE);
    ensureView();
    const source=all.slice(viewStart,Math.min(all.length,viewStart+VISIBLE));
    if(source.length<2)return;
    const closes=source.map(x=>+x[4]);
    const ema=[]; const k=2/21; let e=closes[0];
    closes.forEach((v,i)=>{e=i===0?v:v*k+e*(1-k);ema.push(e)});
    const highs=source.map(x=>+x[2]), lows=source.map(x=>+x[3]);
    const max=Math.max(...highs,...ema), min=Math.min(...lows,...ema), range=max-min||1;
    const pad={t:30,b:42,l:12,r:82}; const plotW=w-pad.l-pad.r, plotH=h-pad.t-pad.b; const step=plotW/source.length;
    const y=v=>pad.t+(max-v)/range*plotH;
    ctx.font='10px Cairo'; ctx.lineWidth=1;
    for(let j=0;j<6;j++){const yy=pad.t+j*plotH/5;ctx.strokeStyle='#20242b';ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillStyle='#747b87';ctx.fillText('$'+fmt(max-j*range/5,2),w-pad.r+8,yy+3)}
    const maxVol=Math.max(...source.map(x=>+x[5]))||1;
    source.forEach((x,i)=>{
      const o=+x[1],hi=+x[2],lo=+x[3],cl=+x[4],cx=pad.l+i*step+step/2;
      const up=cl>=o;ctx.strokeStyle=up?'#43dfa0':'#ff637d';ctx.fillStyle=up?'#43dfa0':'#ff637d';
      ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(cx,y(hi));ctx.lineTo(cx,y(lo));ctx.stroke();
      ctx.fillRect(cx-Math.max(2,step*.3),Math.min(y(o),y(cl)),Math.max(3,step*.6),Math.max(2,Math.abs(y(o)-y(cl))));
      ctx.globalAlpha=.18;const vh=(+x[5]/maxVol)*32;ctx.fillRect(cx-Math.max(2,step*.3),h-pad.b-vh,Math.max(3,step*.6),vh);ctx.globalAlpha=1;
    });

    // Real EMA20 line calculated directly from the same Binance candles.
    ctx.strokeStyle='#e2b94f';ctx.lineWidth=2;ctx.beginPath();let started=false;
    ema.forEach((v,i)=>{const cx=pad.l+i*step+step/2;if(!started){ctx.moveTo(cx,y(v));started=true}else ctx.lineTo(cx,y(v))});ctx.stroke();

    // Separate real price-trend line: linear regression of the visible closing prices.
    const n=closes.length;let sx=0,sy=0,sxy=0,sxx=0;
    for(let i=0;i<n;i++){sx+=i;sy+=closes[i];sxy+=i*closes[i];sxx+=i*i}
    const den=n*sxx-sx*sx;const slope=den?(n*sxy-sx*sy)/den:0;const intercept=(sy-slope*sx)/n;
    const trendStart=intercept,trendEnd=intercept+slope*(n-1);
    ctx.save();ctx.setLineDash([7,5]);ctx.strokeStyle='#7fb7ff';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(pad.l+step/2,y(trendStart));ctx.lineTo(pad.l+(n-.5)*step,y(trendEnd));ctx.stroke();ctx.restore();

    const last=closes[n-1];ctx.fillStyle='#e2b94f';ctx.font='bold 10px Cairo';ctx.fillText('EMA 20 حقيقي  '+fmt(ema[n-1],2),pad.l+4,pad.t-12);
    ctx.fillStyle='#7fb7ff';ctx.fillText('خط الاتجاه الحقيقي  '+(slope>=0?'صاعد':'هابط'),pad.l+125,pad.t-12);
    ctx.fillStyle='#747b87';ctx.font='9px Cairo';ctx.fillText(`${viewStart+1}–${viewStart+n} من ${all.length} شمعة`,8,h-9);
    ctx.fillText('اسحب ← → للرجوع والتقدم',w-150,h-9);
  }

  const originalDraw=window.drawChart;
  window.drawChart=()=>{if(typeof originalDraw==='function')originalDraw();if(panel.classList.contains('premium-focus'))drawPremium()};
  setInterval(()=>{if(panel.classList.contains('premium-focus'))drawPremium()},1000);
})();