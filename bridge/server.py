import os, time
from threading import RLock
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

TOKEN = os.getenv('GOLDAN_BRIDGE_TOKEN', '').strip()
if not TOKEN: raise RuntimeError('Set GOLDAN_BRIDGE_TOKEN before starting the bridge')
app = FastAPI(title='GOLDAN AI MT5 Market Data Bridge', version='1.0.0')
origins = [x.strip() for x in os.getenv('GOLDAN_ALLOWED_ORIGINS', '*').split(',') if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=['GET','POST','OPTIONS'], allow_headers=['Authorization','Content-Type'])
lock = RLock(); store = {}
class Candle(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0
class Batch(BaseModel):
    symbol: str = Field(min_length=3, max_length=24)
    timeframe: str = Field(min_length=2, max_length=8)
    candles: list[Candle] = Field(min_length=60, max_length=2000)
    received_at: int | None = None
def authorize(value: str | None):
    if value != f'Bearer {TOKEN}': raise HTTPException(status_code=401, detail='Unauthorized')
@app.get('/health')
def health():
    with lock: return {'ok': True, 'service': 'GOLDAN AI MT5 Bridge', 'feeds': len(store), 'time': int(time.time())}
@app.post('/api/mt5/candles')
def publish(batch: Batch, authorization: str | None = Header(default=None)):
    authorize(authorization); symbol = batch.symbol.upper()
    if symbol not in ('XAUUSD', 'GOLD', 'XAUUSD.'): raise HTTPException(status_code=400, detail='Only gold symbols are enabled')
    rows = [c.model_dump() for c in batch.candles]
    for c in rows:
        if c['high'] < max(c['open'], c['close'], c['low']) or c['low'] > min(c['open'], c['close'], c['high']): raise HTTPException(status_code=422, detail='Invalid OHLC candle')
    with lock: store[(symbol, batch.timeframe.upper())] = {'symbol': symbol, 'timeframe': batch.timeframe.upper(), 'candles': rows, 'received_at': int(time.time())}
    return {'ok': True, 'symbol': symbol, 'timeframe': batch.timeframe.upper(), 'count': len(rows)}
@app.get('/api/mt5/candles')
def read(symbol: str = Query(default='XAUUSD'), timeframe: str = Query(default='M5'), limit: int = Query(default=500, ge=60, le=2000)):
    with lock: item = store.get((symbol.upper(), timeframe.upper()))
    if not item: raise HTTPException(status_code=404, detail='No MT5 candles received yet')
    return {**item, 'candles': item['candles'][-limit:], 'age_seconds': max(0, int(time.time()) - item['received_at'])}
@app.get('/')
def root(): return {'service': 'GOLDAN AI MT5 Bridge', 'health': '/health', 'read_api': '/api/mt5/candles?symbol=XAUUSD&timeframe=M5'}