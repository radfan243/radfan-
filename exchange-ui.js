/* GOLDAN AI — live exchange widgets. Uses the existing Binance REST/WebSocket engine without replacing it. */
(function(){
  const API='https://api.binance.com/api/v3';
  let lastBookSymbol='',bookBusy=false,lastNativeSymbol='';
  const $=id=>document.getElementById(id);
  const fmtN=(n,d=2)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
  const priceFmt=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  async function book(){
    if(typeof state==='undefined'||bookBusy)return; const s=state.symbol||'BTCUSDT'; if(s!==lastBookSymbol){lastBookSymbol=s;$('orderBook').innerHTML='<div>جاري تحديث دفتر الطلبات…</div>'}
    bookBusy=true;
    try{
      const r=await fetch(`${API}/depth?symbol=${s}&limit=10`,{cache:'no-store'}); if(!r.ok)throw Error('depth '+r.status); const d=await r.json();
      const asks=(d.asks||[]).slice(0,5),bids=(d.bids||[]).slice(0,5);
      const av=asks.reduce((a,x)=>a+Number(x[1]),0),bv=bids.reduce((a,x)=>a+Number(x[1]),0),tot=av+bv||1,ap=av/tot*100,bp=bv/tot*100;
      $('askRatio').textContent=ap.toFixed(2)+'%';$('bidRatio').textContent=bp.toFixed(2)+'%';$('askBar').style.width=ap+'%';$('bidBar').style.width=bp+'%';
      let html=''; for(let i=0;i<5;i++){const a=asks[i],b=bids[i];html+=`<div class="book-row"><span class="book-cell qty">${a?fmtN(a[1],5):'—'}</span><span class="book-cell ask-price">${a?priceFmt(a[0]):'—'}</span><span class="book-cell bid-price">${b?priceFmt(b[0]):'—'}</span><span class="book-cell qty">${b?fmtN(b[1],5):'—'}</span></div>`} $('orderBook').innerHTML=html;
    }catch(e){$('orderBook').innerHTML='<div class="book-cell">تعذر تحديث دفتر الطلبات — تحقق من الإنترنت.</div>'}finally{bookBusy=false}
  }
  function stats(){
    if(typeof state==='undefined')return; const s=state.symbol||'BTCUSDT',t=(state.ticker||[]).find(x=>x.symbol===s); if(!t)return;
    $('assetUsd').textContent='≈ $'+priceFmt(t.lastPrice); $('volBtc').textContent=fmtN(t.volume,2);$('volUsdt').textContent=fmtN(t.quoteVolume,0);$('high24').textContent=priceFmt(t.highPrice);$('low24').textContent=priceFmt(t.lowPrice);
    const k=state.klines||[],c=k.map(x=>Number(x[4])); if(c.length>=99){const sma=p=>c.slice(-p).reduce((a,b)=>a+b,0)/p;const m7=sma(7),m25=sma(25),m99=sma(99);$('maReadout').textContent='MA(7): '+priceFmt(m7);$('ma25Readout').textContent='MA(25): '+priceFmt(m25);$('ma99Readout').textContent='MA(99): '+priceFmt(m99);const mid=sma(20),sd=Math.sqrt(c.slice(-20).reduce((a,x)=>a+(x-mid)**2,0)/20);$('bollReadout').textContent='BOLL(20,2): UP '+priceFmt(mid+2*sd)+' · MB '+priceFmt(mid)+' · DN '+priceFmt(mid-2*sd)}
    const sig=$('signalText'); if(sig)$('signalReadout').textContent='AI: '+sig.textContent;
    if(state.alertEnabled&&state.symbol!==lastNativeSymbol){const plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.GoldanAlerts;if(plugin&&plugin.enable){plugin.enable({symbol:state.symbol,interval:state.interval||'15m'}).catch(()=>{});lastNativeSymbol=state.symbol}}
  }
  async function enableNative(){
    state.alertEnabled=true; $('alertBtn').textContent='جارٍ التفعيل…';
    try{
      const plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.GoldanAlerts;
      if(plugin&&plugin.enable){await plugin.enable({symbol:state.symbol||'BTCUSDT',interval:state.interval||'15m'});lastNativeSymbol=state.symbol||'BTCUSDT';$('alertText').textContent='تم تفعيل تنبيهات Android الخلفية. ستصل إشعارات الشراء والبيع حتى خارج التطبيق.'}
      else {if('Notification' in window){const p=await Notification.requestPermission();if(p==='granted')$('alertText').textContent='تم تفعيل تنبيه الويب. في APK سيعمل تنبيه Android الخلفي بعد البناء.';else $('alertText').textContent='اسمح بالإشعارات من إعدادات Android لتلقي التنبيهات.'} }
      $('alertBtn').textContent='مفعّلة';$('alertBtn').disabled=true;
    }catch(e){$('alertBtn').textContent='تفعيل';$('alertText').textContent='تعذر تفعيل التنبيه الآن. جرّب مرة أخرى.'}
  }
  function wire(){
    if(!$('alertBtn'))return;
    $('alertBtn').onclick=enableNative; if($('bellTop'))$('bellTop').onclick=()=>{const b=$('alertBtn');if(b&&!b.disabled)b.click()};
    if($('shareBtn'))$('shareBtn').onclick=async()=>{try{await navigator.share({title:'GOLDAN AI',text:'تحليل GOLDAN AI المباشر',url:location.href})}catch(e){}};
    book();stats();setInterval(book,2500);setInterval(stats,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,50));else setTimeout(wire,50);
})();
