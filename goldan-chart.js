(() => {
 'use strict';
 const host=document.getElementById('goldChart'), overlay=document.getElementById('drawingLayer');
 if(!host||!overlay||!window.LightweightCharts)return;
 if(!window.LightweightCharts){host.textContent='مكتبة الرسم غير متاحة حاليًا. تحقق من الاتصال بالإنترنت.';window.GoldanChart={setData(){},setLevels(){},setMode(){}};return;}\n const L=window.LightweightCharts;
 const chart=L.createChart(host,{width:host.clientWidth,height:host.clientHeight,layout:{background:{type:'solid',color:'#080d14'},textColor:'#b8c4d4',fontFamily:'Cairo,Arial'},grid:{vertLines:{color:'#172330'},horzLines:{color:'#172330'}},rightPriceScale:{borderColor:'#29394a'},timeScale:{borderColor:'#29394a',timeVisible:true,secondsVisible:false},crosshair:{mode:L.CrosshairMode.Normal},handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:true},handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:true}});
 const candles=chart.addCandlestickSeries({upColor:'#25c997',downColor:'#ff647d',borderUpColor:'#25c997',borderDownColor:'#ff647d',wickUpColor:'#25c997',wickDownColor:'#ff647d',priceLineVisible:true});
 const volume=chart.addHistogramSeries({priceFormat:{type:'volume'},priceScaleId:'volume',scaleMargins:{top:.84,bottom:0},lastValueVisible:false,priceLineVisible:false});
 let drawings=JSON.parse(localStorage.getItem('goldan_drawings_xauusd')||'[]'), mode='pan', draft=null, undoStack=[],redoStack=[];
 const color='#e6bd63';
 const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const point=(x,y)=>({time:chart.timeScale().coordinateToTime(x),price:candles.coordinateToPrice(y)});
 const xy=p=>({x:chart.timeScale().timeToCoordinate(p.time),y:candles.priceToCoordinate(p.price)});
 const valid=p=>p&&p.time!=null&&Number.isFinite(p.price);
 function save(){localStorage.setItem('goldan_drawings_xauusd',JSON.stringify(drawings));}
 function history(){undoStack.push(JSON.stringify(drawings));if(undoStack.length>50)undoStack.shift();redoStack=[];}
 function line(x1,y1,x2,y2,stroke=color,dash=''){return `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='${stroke}' stroke-width='1.7' ${dash?`stroke-dasharray='${dash}'`:''}/>`;}
 function render(){
  const w=host.clientWidth,h=host.clientHeight;overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);overlay.setAttribute('width',w);overlay.setAttribute('height',h);
  let out='';
  for(const d of drawings){
   const a=xy(d.a),b=d.b?xy(d.b):null;if(!a||a.x==null||a.y==null)continue;
   if(d.type==='h')out+=line(0,a.y,w,a.y,'#e6bd63','5 4')+`<text x='8' y='${a.y-5}' fill='#e6bd63' font-size='11'>${esc(d.a.price.toFixed(2))}</text>`;
   else if(d.type==='v')out+=line(a.x,0,a.x,h,'#e6bd63','5 4');
   else if(b&&b.x!=null&&b.y!=null){
    if(['trend','ray','line'].includes(d.type)){let ex=b.x,ey=b.y;if(d.type==='ray'){const dx=b.x-a.x,dy=b.y-a.y;if(dx!==0){const t=(w-a.x)/dx;ex=w;ey=a.y+dy*t;}}out+=line(a.x,a.y,ex,ey,d.color||color);}
    if(d.type==='rect'){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),rw=Math.abs(b.x-a.x),rh=Math.abs(b.y-a.y);out+=`<rect x='${x}' y='${y}' width='${rw}' height='${rh}' fill='#e6bd63' fill-opacity='.08' stroke='#e6bd63' stroke-width='1.5'/>`;}
    if(d.type==='fib'||d.type==='fibext'){const levels=d.type==='fib'?[0,.236,.382,.5,.618,.786,1,-.272,-.618]:[0,1,.618,1.618,2.618];const delta=b.price-a.price;for(const level of levels){const price=a.price+delta*level,y=candles.priceToCoordinate(price);if(y==null)continue;out+=line(Math.min(a.x,b.x),y,w,y,'#d7b45e','4 4')+`<text x='${Math.min(a.x,b.x)+5}' y='${y-4}' fill='#e8ca7b' font-size='10'>${(level*100).toFixed(1)}% · ${price.toFixed(2)}</text>`;}}
    if(d.type==='channel'){const dx=b.x-a.x,dy=b.y-a.y;out+=line(a.x,a.y,b.x,b.y,'#66b4ff')+line(a.x,a.y+dy*.45,b.x,b.y+dy*.45,'#66b4ff','4 3');}
   }
   if(d.type==='text'&&b){out+=`<text x='${a.x}' y='${a.y}' fill='#f2d68c' font-size='13'>${esc(d.text||'ملاحظة')}</text>`;}
  }
  if(draft){const a=xy(draft.a),b=xy(draft.b);if(a&&b&&a.x!=null&&b.x!=null)out+=line(a.x,a.y,b.x,b.y,'#66b4ff','4 3');}
  overlay.innerHTML=out;
 }
 function setMode(next){mode=next;overlay.style.pointerEvents=mode==='pan'?'none':'auto';overlay.style.cursor=mode==='pan'?'crosshair':'crosshair';document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===mode));}
 overlay.addEventListener('pointerdown',e=>{if(mode==='pan')return;const r=overlay.getBoundingClientRect(),p=point(e.clientX-r.left,e.clientY-r.top);if(!valid(p))return;overlay.setPointerCapture(e.pointerId);if(mode==='h'||mode==='v'){history();drawings.push({type:mode,a:p});save();render();return;}if(mode==='text'){const text=prompt('اكتب ملاحظتك على الرسم:');if(text){history();drawings.push({type:'text',a:p,text});save();render();}return;}draft={type:mode,a:p,b:p};render();});
 overlay.addEventListener('pointermove',e=>{if(!draft)return;const r=overlay.getBoundingClientRect();draft.b=point(e.clientX-r.left,e.clientY-r.top);render();});
 overlay.addEventListener('pointerup',()=>{if(!draft)return;if(valid(draft.a)&&valid(draft.b)){history();drawings.push(draft);save();}draft=null;render();});
 document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tool)));
 document.getElementById('drawUndo')?.addEventListener('click',()=>{if(!undoStack.length)return;redoStack.push(JSON.stringify(drawings));drawings=JSON.parse(undoStack.pop());save();render();});
 document.getElementById('drawRedo')?.addEventListener('click',()=>{if(!redoStack.length)return;undoStack.push(JSON.stringify(drawings));drawings=JSON.parse(redoStack.pop());save();render();});
 document.getElementById('drawClear')?.addEventListener('click',()=>{if(!drawings.length)return;history();drawings=[];save();render();});
 document.getElementById('drawMode')?.addEventListener('click',()=>setMode(mode==='pan'?'trend':'pan'));
 const observer=new ResizeObserver(()=>{chart.applyOptions({width:host.clientWidth,height:host.clientHeight});render();});observer.observe(host);
 chart.timeScale().subscribeVisibleTimeRangeChange(render);
 function setData(rows){const data=rows.map(c=>({time:Math.floor(c.time),open:c.open,high:c.high,low:c.low,close:c.close}));candles.setData(data);volume.setData(rows.map(c=>({time:Math.floor(c.time),value:c.volume||0,color:c.close>=c.open?'rgba(37,201,151,.35)':'rgba(255,100,125,.35)'})));chart.timeScale().fitContent();render();}
 function setLevels(plan){candles.applyOptions({});const old=chart.__goldanLines||[];old.forEach(x=>candles.removePriceLine(x));chart.__goldanLines=[];if(!plan||!plan.valid)return;const defs=[['دخول',plan.entry,'#e6bd63'],['وقف',plan.stop,'#ff647d'],['TP1',plan.targets[0],'#25c997'],['TP2',plan.targets[1],'#25c997'],['TP3',plan.targets[2],'#25c997']];for(const [title,price,col] of defs){if(!Number.isFinite(price))continue;chart.__goldanLines.push(candles.createPriceLine({price,title,color:col,lineWidth:1,lineStyle:L.LineStyle.Dashed,axisLabelVisible:true}));}}
 window.GoldanChart={setData,setLevels,chart,render,setMode};setMode('pan');
})();