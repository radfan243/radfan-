/* GOLDAN AI — Interactive Binance-style chart. Keeps the existing Binance data/analysis untouched. */
(function(){
  const css=`
  .chart-panel{position:relative;overflow:hidden}
  .chart-panel.chart-fullscreen{position:fixed;inset:0;z-index:9999;margin:0;border-radius:0;padding:12px;background:#05070d;overflow:auto}
  .chart-fullscreen .chart-head{position:sticky;top:0;z-index:2;background:#05070d;padding:4px 0 8px}
  .chart-fullscreen canvas{height:calc(100vh - 145px)!important;min-height:360px}
  .chart-tools{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap}
  .chart-tool{border:1px solid #302817;background:#0d0f13;color:#c9aa5b;border-radius:9px;padding:6px 9px;font-family:inherit;font-size:9px;cursor:pointer}
  .chart-hint{color:#646b78;font-size:8px;margin-right:auto}
  #chart{touch-action:none;cursor:grab}
  #chart.chart-dragging{cursor:grabbing}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const c=()=>document.getElementById('chart');
  const panel=()=>c()&&c().closest('.chart-panel');
  const view={start:null,count:80,yShift:0,drag:false,lastX:0,lastY:0,pinch:0};
  function data(){return state.liveKline?[...state.klines.slice(0,-1),state.liveKline]:state.klines.slice();}
  function clampView(n){view.count=Math.max(25,Math.min(180,view.count));view.start=Math.max(0,Math.min(Math.max(0,n-view.count),view.start==null?Math.max(0,n-view.count):view.start));}
  function sma(vals,p){const out=Array(vals.length).fill(null);let sum=0;for(let i=0;i<vals.length;i++){sum+=vals[i];if(i>=p)sum-=vals[i-p];if(i>=p-1)out[i]=sum/p}return out}
  function boll(vals,p=20,m=2){const mid=sma(vals,p),up=Array(vals.length).fill(null),dn=Array(vals.length).fill(null);for(let i=p-1;i<vals.length;i++){let s=0;for(let j=i-p+1;j<=i;j++)s+=(vals[j]-mid[i])**2;const sd=Math.sqrt(s/p);up[i]=mid[i]+m*sd;dn[i]=mid[i]-m*sd}return{mid,up,dn}}
  function drawLine(ctx,arr,first,step,y,color,width,w,top,bottom,min,max){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let started=false;for(let i=first;i<Math.min(arr.length,first+view.count);i++){const v=arr[i];if(v==null)continue;const x=8+(i-first+0.5)*step;const yy=top+(max-v)/(max-min)*(bottom-top);if(!started){ctx.moveTo(x,yy);started=true}else ctx.lineTo(x,yy)}if(started)ctx.stroke()}
  function nicePrice(v){if(v>=10000)return fmt(v,2);if(v>=100)return fmt(v,2);if(v>=1)return fmt(v,4);return fmt(v,6)}
  function draw(){
    const canvas=c();if(!canvas||!state||!state.klines.length)return;
    const ctx=canvas.getContext('2d');const dpr=window.devicePixelRatio||1;const w=Math.max(1,canvas.clientWidth);const h=Math.max(320,canvas.clientHeight||300);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const all=data();const n=all.length;clampView(n);const first=view.start,last=Math.min(n,first+view.count),k=all.slice(first,last);if(k.length<2)return;
    const closes=all.map(x=>+x[4]),ma7=sma(closes,7),ma25=sma(closes,25),ma99=sma(closes,99),bb=boll(closes,20,2);
    const visible=k;let hi=Math.max(...visible.map(x=>+x[2])),lo=Math.min(...visible.map(x=>+x[3]));
    const ind=[];[ma7,ma25,ma99,bb.up,bb.mid,bb.dn].forEach(a=>{for(let i=first;i<last;i++)if(a[i]!=null)ind.push(a[i])});if(ind.length){hi=Math.max(hi,...ind);lo=Math.min(lo,...ind)}
    const base=hi-lo||1,extra=base*.07;hi+=extra;lo-=extra;const shift=(hi-lo)*view.yShift;hi+=shift;lo+=shift;
    const left=8,right=62,top=16,bottom=h-62,range=hi-lo,cw=(w-left-right)/k.length,priceY=v=>top+(hi-v)/range*(bottom-top-40),vh=Math.max(...k.map(x=>+x[5]))||1;
    ctx.font='10px Cairo';ctx.textAlign='left';
    for(let j=0;j<6;j++){const y=top+j*(bottom-top)/5;ctx.strokeStyle='#1c2025';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();const val=hi-j*range/5;ctx.fillStyle='#747b86';ctx.fillText('$'+nicePrice(val),w-right+5,y+3)}
    for(let j=0;j<7;j++){const x=left+j*(w-left-right)/6;ctx.strokeStyle='#15191e';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke()}
    ctx.fillStyle='#6f7682';ctx.fillText(state.interval||'',left,h-9);
    const step=cw;const y=priceY;
    // Volume area
    k.forEach((x,i)=>{const bh=(+x[5]/vh)*32;ctx.globalAlpha=.20;ctx.fillStyle=(+x[4]>=+x[1])?'#43dfa0':'#ff637d';ctx.fillRect(left+i*step+step*.12,h-43-bh,Math.max(1,step*.76),bh);ctx.globalAlpha=1});
    // Bollinger Bands
    drawLine(ctx,bb.up,first,step,y,'#e2b94f',1,w,top,bottom,lo,hi);drawLine(ctx,bb.mid,first,step,y,'#e05cc7',1.2,w,top,bottom,lo,hi);drawLine(ctx,bb.dn,first,step,y,'#e2b94f',1,w,top,bottom,lo,hi);
    // Moving averages similar to Binance
    drawLine(ctx,ma7,first,step,y,'#f0c93d',1.3,w,top,bottom,lo,hi);drawLine(ctx,ma25,first,step,y,'#e15bc6',1.25,w,top,bottom,lo,hi);drawLine(ctx,ma99,first,step,y,'#806bb7',1.3,w,top,bottom,lo,hi);
    // Candles
    k.forEach((x,i)=>{const o=+x[1],hh=+x[2],ll=+x[3],cl=+x[4],cx=left+i*step+step/2,up=cl>=o,col=up?'#43dfa0':'#ff637d';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,y(hh));ctx.lineTo(cx,y(ll));ctx.stroke();const yo=y(o),yc=y(cl);ctx.fillRect(cx-Math.max(2,step*.30)/2,Math.min(yo,yc),Math.max(2,step*.30),Math.max(2,Math.abs(yo-yc))) });
    // Live/current price line and right label
    const current=state.lastPrice!=null?+state.lastPrice:+all[n-1][4];const py=y(current);ctx.setLineDash([5,4]);ctx.strokeStyle='#e5e8ee';ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(w-right,py);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=current>+all[n-1][1]?'#43dfa0':'#ff637d';ctx.fillRect(w-right+1,py-10,right-2,20);ctx.fillStyle='#05070d';ctx.font='bold 9px Cairo';ctx.fillText(nicePrice(current),w-right+6,py+3);
    // Last candle marker
    ctx.fillStyle='#dfe4eb';ctx.beginPath();ctx.arc(left+(k.length-.5)*step,y(+k[k.length-1][4]),3,0,Math.PI*2);ctx.fill();
    // Legend
    ctx.font='8px Cairo';ctx.fillStyle='#747b86';ctx.fillText('MA7',left,h-47);ctx.fillText('MA25',left+38,h-47);ctx.fillText('MA99',left+82,h-47);ctx.fillText('BOLL',left+126,h-47);ctx.fillText('LIVE PRICE',left+166,h-47);ctx.fillText(`${k.length} شمعة · اسحب للتحريك · قرّب/بعّد`,left,h-27);
  }
  function fullscreen(){const p=panel();if(!p)return;p.classList.toggle('chart-fullscreen');const b=p.querySelector('.chart-full-btn');if(b)b.textContent=p.classList.contains('chart-fullscreen')?'✕':'⛶';setTimeout(draw,30)}
  function setup(){const canvas=c(),p=panel();if(!canvas||!p||canvas.dataset.interactive)return;canvas.dataset.interactive='1';
    const tools=document.createElement('div');tools.className='chart-tools';tools.innerHTML='<button class="chart-tool chart-full-btn" type="button">⛶ شاشة التحليل</button><button class="chart-tool" type="button" data-zoom="in">＋ تكبير</button><button class="chart-tool" type="button" data-zoom="out">－ تصغير</button><span class="chart-hint">اسحب يمين/يسار أو أعلى/أسفل · إصبعان للتكبير</span>';canvas.after(tools);
    tools.querySelector('.chart-full-btn').onclick=fullscreen;tools.querySelector('[data-zoom="in"]').onclick=()=>{const n=state.klines.length;view.count=Math.max(25,Math.round(view.count*.8));view.start=Math.min(Math.max(0,n-view.count),view.start+Math.round(view.count*.1));draw()};tools.querySelector('[data-zoom="out"]').onclick=()=>{const n=state.klines.length;view.count=Math.min(180,Math.round(view.count*1.25));view.start=Math.max(0,Math.min(n-view.count,view.start));draw()};
    canvas.addEventListener('wheel',e=>{e.preventDefault();const n=state.klines.length;view.count=Math.max(25,Math.min(180,Math.round(view.count*(e.deltaY>0?1.12:.89))));view.start=Math.max(0,Math.min(Math.max(0,n-view.count),view.start));draw()},{passive:false});
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);view.drag=true;view.lastX=e.clientX;view.lastY=e.clientY;canvas.classList.add('chart-dragging')});
    canvas.addEventListener('pointermove',e=>{if(!view.drag)return;const dx=e.clientX-view.lastX,dy=e.clientY-view.lastY;view.lastX=e.clientX;view.lastY=e.clientY;const step=Math.max(1,(canvas.clientWidth-70)/view.count);view.start-=Math.round(dx/step);view.yShift+=dy/(canvas.clientHeight||300)*.55;clampView(state.klines.length);view.yShift=Math.max(-.7,Math.min(.7,view.yShift));draw()});
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>canvas.addEventListener(ev,()=>{view.drag=false;canvas.classList.remove('chart-dragging')}));
    canvas.addEventListener('dblclick',fullscreen);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&p.classList.contains('chart-fullscreen'))fullscreen()});
    window.addEventListener('resize',()=>{if(state.klines.length)draw()});
  }
  const old=window.drawChart;
  window.drawChart=draw;
  setup();
  setTimeout(()=>{setup();draw()},0);
})();
