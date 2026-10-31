(() => {
  'use strict';
  const KEY = 'goldan_mt5_bridge_url_v1';
  const clean = value => String(value || '').trim().replace(/\/+$/, '');
  const getBaseUrl = () => clean(localStorage.getItem(KEY) || '');
  const setBaseUrl = value => { const v=clean(value); if(v && !/^https:\/\//i.test(v) && !/^http:\/\/localhost(?::\d+)?$/i.test(v) && !/^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(v)) throw new Error('استخدم رابط HTTPS آمن للجسر'); localStorage.setItem(KEY,v); return v; };
  async function fetchCandles(timeframe='M5', limit=500) {
    const base=getBaseUrl(); if(!base) throw new Error('أدخل رابط جسر MT5 أولاً');
    const url=base+'/api/mt5/candles?symbol=XAUUSD&timeframe='+encodeURIComponent(timeframe)+'&limit='+limit;
    const response=await fetch(url,{cache:'no-store'}); if(!response.ok) throw new Error(response.status===404?'لم تصل شموع MT5 لهذا الإطار بعد':'تعذر قراءة بيانات MT5 (HTTP '+response.status+')');
    const payload=await response.json();
    if(!Array.isArray(payload.candles)||payload.candles.length<60) throw new Error('البيانات المستلمة أقل من 60 شمعة');
    const candles=payload.candles.map(c=>({time:Number(c.time),open:Number(c.open),high:Number(c.high),low:Number(c.low),close:Number(c.close),volume:Number(c.volume||0)}));
    if(candles.some(c=>![c.time,c.open,c.high,c.low,c.close].every(Number.isFinite))) throw new Error('وصلت بيانات شموع غير صالحة');
    return {...payload,candles};
  }
  async function fetchTradingViewSignal() {
    const base=getBaseUrl(); if(!base) return {data:null,error:'bridge not configured'};
    try { const r=await fetch(base+'/api/tradingview/signal?symbol=XAUUSD',{cache:'no-store'}); if(!r.ok) throw new Error('لا توجد إشارة TradingView واردة'); return {data:await r.json(),error:null}; } catch(e) { return {data:null,error:e.message}; }
  }
  async function fetchMultiTimeframe() {
    const frames=['M5','M15','H1','H4'];
    const results=await Promise.all(frames.map(async tf=>{try{return [tf,await fetchCandles(tf,500),null]}catch(e){return [tf,null,e.message]}}));
    const out=Object.fromEntries(results.map(([tf,data,error])=>[tf,{data,error}]));
    out.TV=await fetchTradingViewSignal();
    return out;
  }
  let timer=null, running=false;
  function stop(){if(timer)clearInterval(timer);timer=null;running=false;}
  function start(timeframe, callback, everyMs=7000){
    stop(); if(running)return; running=true;
    const poll=async()=>{try{const [chart,multi]=await Promise.all([fetchCandles(timeframe,500),fetchMultiTimeframe()]);callback({ok:true,chart,multi,stale:Number(chart.age_seconds||0)>120});}catch(error){callback({ok:false,error:error.message});}};
    poll(); timer=setInterval(poll,everyMs);
  }
  window.GoldanLiveFeed=Object.freeze({getBaseUrl,setBaseUrl,fetchCandles,fetchMultiTimeframe,fetchTradingViewSignal,start,stop});
})();