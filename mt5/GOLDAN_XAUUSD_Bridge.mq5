#property strict
#property version "1.00"
#property description "GOLDAN AI read-only XAUUSD candle relay. Never sends trade orders."
input string BridgeURL = "https://YOUR-VPS-DOMAIN";
input string BridgeToken = "CHANGE_THIS_LONG_RANDOM_TOKEN";
input string GoldSymbol = "XAUUSD";
input int BarsToSend = 500;
input int SendEverySeconds = 15;
input ENUM_TIMEFRAMES FeedTimeframe = PERIOD_M5;
string TfName(ENUM_TIMEFRAMES tf) {
 switch(tf) { case PERIOD_M1:return "M1"; case PERIOD_M5:return "M5"; case PERIOD_M15:return "M15"; case PERIOD_M30:return "M30"; case PERIOD_H1:return "H1"; case PERIOD_H4:return "H4"; case PERIOD_D1:return "D1"; } return "M5";
}
bool SendFeed(ENUM_TIMEFRAMES tf) {
 MqlRates rates[]; ArraySetAsSeries(rates,false);
 int copied=CopyRates(GoldSymbol,tf,0,BarsToSend,rates);
 if(copied<60) { Print("GOLDAN: waiting for 60+ bars; got ",copied); return false; }
 int digits=(int)SymbolInfoInteger(GoldSymbol,SYMBOL_DIGITS);
 string body="{\"symbol\":\"XAUUSD\",\"timeframe\":\""+TfName(tf)+"\",\"candles\":[";
 for(int i=0;i<copied;i++) {
  if(i>0) body+=",";
  body+="{\"time\":"+IntegerToString((long)rates[i].time)+",\"open\":"+DoubleToString(rates[i].open,digits)+",\"high\":"+DoubleToString(rates[i].high,digits)+",\"low\":"+DoubleToString(rates[i].low,digits)+",\"close\":"+DoubleToString(rates[i].close,digits)+",\"volume\":"+IntegerToString((long)rates[i].tick_volume)+"}";
 }
 body+="]}";
 char data[],result[]; StringToCharArray(body,data,0,WHOLE_ARRAY,CP_UTF8); ArrayResize(data,ArraySize(data)-1);
 string headers="Content-Type: application/json\r\nAuthorization: Bearer "+BridgeToken+"\r\n", responseHeaders;
 int code=WebRequest("POST",BridgeURL+"/api/mt5/candles",headers,10000,data,result,responseHeaders);
 if(code<200 || code>=300) { Print("GOLDAN bridge HTTP ",code,". Add VPS URL to MT5 WebRequest allowed URLs."); return false; }
 Print("GOLDAN: sent ",copied," ",GoldSymbol," ",TfName(tf)," candles"); return true;
}
int OnInit() {
 if(StringFind(BridgeURL,"YOUR-VPS")>=0 || StringLen(BridgeToken)<24) { Print("Set BridgeURL and a long random BridgeToken first."); return INIT_PARAMETERS_INCORRECT; }
 EventSetTimer(MathMax(10,SendEverySeconds)); SendFeed(FeedTimeframe); return INIT_SUCCEEDED;
}
void OnTimer() { SendFeed(FeedTimeframe); }
void OnDeinit(const int reason) { EventKillTimer(); }