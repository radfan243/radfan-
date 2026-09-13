/* GOLDAN AI — Future candle projection (non-repainting visual estimate). */
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .prediction-zone{position:absolute;right:0;top:0;width:118px;height:100%;z-index:5;pointer-events:none;display:none;background:linear-gradient(90deg,transparent,rgba(5,7,13,.72) 18%,rgba(5,7,13,.96));border-left:1px solid rgba(226,185,79,.16)}
    .prediction-zone canvas{width:100%;height:100%;display:block}
    .prediction-tag{position:absolute;top:7px;right:7px;padding:3px 7px;border-radius:7px;background:rgba(8,10,15,.9);border:1px solid rgba(226,185,79,.38);color:#d8bd72;font:700 8px Cairo,sans-serif;white-space:nowrap}
  `;
  document.head.appendChild(style);
  let zone,cv,ctx,lastKey='';
  function setup(){
    const chart=document.getElementById('chart');
    if(!chart||zone)return;
    const panel=chart.closest('.chart-panel'); if(!panel)return;
    if(getComputedStyle(panel).position==='static')panel.style.position='relative';
    zone=document.createElement('div');zone.className='prediction-zone';
    cv=document.createElement('canvas');zone.appendChild(cv);
    const tag=document.createElement('div');tag.className='prediction-tag';tag.textContent='توقع · 1–2 شمعة';zone.appendChild(tag);
    panel.appendChild(zone);resize();
    window.addEventListener('resize',resize);
  }
  function resize(){if(!zone||!cv)return;const d=devicePixelRatio||1;cv.width=zone.clientWidth*d;cv.height=zone.clientHeight*d;ctx=cv.getContext('2d');ctx.setTransform(d,0,0,d,0,0);}
  function ema(v,p){if(v.length<p)return null;let e=v.slice(0,p).reduce((a,b)=>a+b,0)/p,k=2/(p+1);for(let i=p;i<v.length;i++)e=v[i]*k+e*(1-k);return e}
  function atr(k,p=14){if(k.length<p+1)return 0;let tr=[];for(let i=1;i<k.length;i++)tr.push(Math.max(+k[i][2]-+k[i][3],Math.abs(+k[i][2]-+k[i-1][4]),Math.abs(+k[i][3]-+k[i-1][4])));let a=tr.slice(0,p).reduce((x,y)=>x+y,0)/p;for(let i=p;i<tr.length;i++)a=(a*(p-1)+tr[i])/p;return a}
  function makeForecast(){
    if(!window.state||!state.klines||state.klines.length<60)return null;
    const k=state.klines.slice();
    const closes=k.map(x=>+x[4]),vols=k.map(x=>+x[5]),last=closes.at(-1),e20=ema(closes,20),e50=ema(closes,50),a=atr(k,14)||last*.003;
    const n=closes.length;const m=Math.max(3,Math.min(12,n-1));const mom=(last-closes[n-1-m])/closes[n-1-m];
    const slope=(e20-e50)/(a||1);let bias=Math.max(-1,Math.min(1,mom*7+slope*.018));
    const avgVol=vols.slice(-20).reduce((x,y)=>x+y,0)/20;const volFactor=Math.max(.75,Math.min(1.25,(vols.at(-1)||avgVol)/(avgVol||1)));
    const drift=Math.max(-a*.9,Math.min(a*.9,a*(bias*.42)*volFactor));
    const make=(o,d,i)=>{const noise=a*(.22+.08*i);const c=o+d;const up=d>=0;return [o,up?o+noise*.35:o+noise*.18,up?c+noise*.22:c-noise*.22,up?o-noise*.20:o-noise*.35,c]};
    const p1=make(last,drift,0),p2=make(p1[4],drift*(.72+bias*.18),1);
    return {candles:[p1,p2],bull:bias>=0,atr:a,bias,base:last};
  }
  function draw(){
    setup(); if(!zone)return;
    const f=makeForecast(); if(!f){zone.style.display='none';return;}
    const key=[state.symbol,state.interval,state.klines.length,state.klines.at(-1)?.[4]].join('|');
    if(key===lastKey&&zone.style.display==='block')return; lastKey=key;
    resize();zone.style.display='block';
    const w=zone.clientWidth,h=zone.clientHeight;ctx.clearRect(0,0,w,h);
    const prices=[f.base,...f.candles.flatMap(x=>x.slice(1,4))];let hi=Math.max(...prices),lo=Math.min(...prices),range=hi-lo||f.atr||1;hi+=range*.25;lo-=range*.25;range=hi-lo;
    const y=v=>12+(hi-v)/range*(h-42), baseX=w-78, gap=37;
    const colors=f.bull?['rgba(67,223,160,.34)','rgba(67,223,160,.72)']:['rgba(255,99,125,.34)','rgba(255,99,125,.72)'];
    f.candles.forEach((x,i)=>{const [o,hh,ll,c]=x,cx=baseX+i*gap;ctx.strokeStyle=colors[1];ctx.fillStyle=colors[0];ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,y(hh));ctx.lineTo(cx,y(ll));ctx.stroke();const top=y(Math.max(o,c)),bottom=y(Math.min(o,c));ctx.fillRect(cx-9,top,18,Math.max(6,bottom-top));ctx.strokeStyle=colors[1];ctx.strokeRect(cx-9,top,18,Math.max(6,bottom-top));});
    ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(216,189,114,.65)';ctx.beginPath();ctx.moveTo(5,y(f.base));ctx.lineTo(w-5,y(f.base));ctx.stroke();ctx.setLineDash([]);
    ctx.font='8px Cairo,sans-serif';ctx.fillStyle='#9ba2ad';ctx.fillText(f.bull?'ميل متوقع ↑':'ميل متوقع ↓',7,h-18);
  }
  function hook(){
    if(!window.drawChart||window.drawChart.__predictionWrapped)return;
    const original=window.drawChart;
    function wrapped(){original.apply(this,arguments);setTimeout(draw,0)}
    wrapped.__predictionWrapped=true;window.drawChart=wrapped;
  }
  const timer=setInterval(()=>{if(window.drawChart){hook();draw();}},500);
  setTimeout(()=>{clearInterval(timer);hook();draw()},5000);
})();
