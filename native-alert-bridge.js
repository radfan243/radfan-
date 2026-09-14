/* Connect the live web UI to the native Android background alert engine when available. */
(function(){
  function sync(){try{const cap=window.Capacitor,plugin=cap&&cap.Plugins&&cap.Plugins.GoldanAlerts;if(!plugin||!window.state)return;plugin.enable({symbol:state.symbol||'BTCUSDT',interval:state.interval||'15m'}).catch?.(()=>{});}catch(e){}}
  document.addEventListener('click',e=>{if(e.target&&((e.target.id==='alertBtn')||e.target.closest?.('.coin')||e.target.closest?.('.tf')))setTimeout(sync,500)});
  setTimeout(sync,2500);setInterval(sync,30000);
})();