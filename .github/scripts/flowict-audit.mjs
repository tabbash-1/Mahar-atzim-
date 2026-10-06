const BASE='https://flowict.vercel.app/api/bybit?path=';
const get=async p=>{
  const r=await fetch(BASE+encodeURIComponent(p),{cache:'no-store'});
  if(!r.ok) throw new Error(p+' HTTP '+r.status);
  const j=await r.json();
  if(j.retCode!==0) throw new Error(j.retMsg||'API');
  return j.result;
};
const normK=r=>(r.list||[]).map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})).sort((a,b)=>a.t-b.t);
const ema=(arr,p)=>{if(arr.length<p)return NaN;const k=2/(p+1);let e=arr.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<arr.length;i++)e=arr[i]*k+e*(1-k);return e};
const atr=(cs,p=14)=>{if(cs.length<p+1)return NaN;const tr=[];for(let i=1;i<cs.length;i++){const a=cs[i],pc=cs[i-1].c;tr.push(Math.max(a.h-a.l,Math.abs(a.h-pc),Math.abs(a.l-pc)))}return tr.slice(-p).reduce((a,b)=>a+b,0)/p};
const pivots=(cs,w=2)=>{const highs=[],lows=[];for(let i=w;i<cs.length-w;i++){let hi=true,lo=true;for(let j=i-w;j<=i+w;j++){if(j===i)continue;if(cs[j].h>=cs[i].h)hi=false;if(cs[j].l<=cs[i].l)lo=false}if(hi)highs.push({i,p:cs[i].h,t:cs[i].t});if(lo)lows.push({i,p:cs[i].l,t:cs[i].t})}return{highs,lows}};
const trend=cs=>{const closes=cs.map(x=>x.c),e20=ema(closes,20),e50=ema(closes,50),p=pivots(cs.slice(-100));const lh=p.highs.at(-1),ph=p.highs.at(-2),ll=p.lows.at(-1),pl=p.lows.at(-2);let structure=0;if(lh&&ph&&ll&&pl){if(lh.p>ph.p&&ll.p>pl.p)structure=1;else if(lh.p<ph.p&&ll.p<pl.p)structure=-1}const ma=e20>e50?1:e20<e50?-1:0,score=ma+structure;return{dir:score>=1?'BULLISH':score<=-1?'BEARISH':'MIXED',e20,e50,structure}};
const sweep=cs=>{let best=null;const start=Math.max(22,cs.length-10);for(let i=start;i<cs.length;i++){const prev=cs.slice(Math.max(0,i-22),i),lo=Math.min(...prev.map(x=>x.l)),hi=Math.max(...prev.map(x=>x.h)),c=cs[i];if(c.l<lo&&c.c>lo)best={dir:'BULLISH',level:lo,extreme:c.l,t:c.t};if(c.h>hi&&c.c<hi)best={dir:'BEARISH',level:hi,extreme:c.h,t:c.t}}return best};
const mss=cs=>{const base=cs.slice(0,-1),p=pivots(base.slice(-120)),last=cs.at(-1),prev=cs.at(-2),a=atr(cs),body=Math.abs(last.c-last.o);let out=null;const sh=p.highs.at(-1),sl=p.lows.at(-1);if(sh&&last.c>sh.p&&prev.c<=sh.p)out={dir:'BULLISH',level:sh.p,displacement:Number.isFinite(a)&&body>a*.65};if(sl&&last.c<sl.p&&prev.c>=sl.p)out={dir:'BEARISH',level:sl.p,displacement:Number.isFinite(a)&&body>a*.65};return out};
const latestFvg=cs=>{let out=null;for(let i=Math.max(2,cs.length-45);i<cs.length;i++){const a=cs[i-2],c=cs[i];if(a.h<c.l)out={dir:'BULLISH',low:a.h,high:c.l,t:c.t};if(a.l>c.h)out={dir:'BEARISH',low:c.h,high:a.l,t:c.t}}return out};
const orderFlow=ts=>{let buy=0,sell=0,cvd=0,mid=0;if(!ts.length)return{buy:0,sell:0,deltaPct:0,cvdImpulse:0,abs:'NONE'};ts.forEach((x,i)=>{const q=x.q*x.p,s=x.side==='Buy'?q:-q;if(s>0)buy+=s;else sell+=-s;cvd+=s;if(i===Math.floor(ts.length/2))mid=cvd});const total=buy+sell,deltaPct=total?(buy-sell)/total*100:0,cvdImpulse=total?(cvd-mid)/total*100:0,n=Math.max(20,Math.floor(ts.length*.2)),first=ts.slice(0,n),last=ts.slice(-n),p0=first.reduce((a,x)=>a+x.p,0)/first.length,p1=last.reduce((a,x)=>a+x.p,0)/last.length;let abs='NONE';if(deltaPct<-7&&p1>=p0*.999)abs='BULLISH';if(deltaPct>7&&p1<=p0*1.001)abs='BEARISH';return{buy,sell,deltaPct,cvdImpulse,abs,p0,p1,total}};
const oiInfo=xs=>{if(xs.length<2)return{pct:NaN,last:NaN};const a=xs[0].v,b=xs.at(-1).v;return{pct:a?(b-a)/a*100:NaN,last:b}};
const scoreAll=ctx=>{let L=0,S=0;const add=(d,n)=>d==='LONG'?L+=n:S+=n;if(ctx.t4.dir==='BULLISH')add('LONG',2);if(ctx.t4.dir==='BEARISH')add('SHORT',2);if(ctx.t1.dir==='BULLISH')add('LONG',2);if(ctx.t1.dir==='BEARISH')add('SHORT',2);if(ctx.sw?.dir==='BULLISH')add('LONG',2);if(ctx.sw?.dir==='BEARISH')add('SHORT',2);if(ctx.ms?.dir==='BULLISH')add('LONG',ctx.ms.displacement?2:1);if(ctx.ms?.dir==='BEARISH')add('SHORT',ctx.ms.displacement?2:1);if(ctx.fv?.dir==='BULLISH')add('LONG',1);if(ctx.fv?.dir==='BEARISH')add('SHORT',1);if(ctx.of.deltaPct>5)add('LONG',2);if(ctx.of.deltaPct<-5)add('SHORT',2);if(ctx.of.cvdImpulse>2)add('LONG',1);if(ctx.of.cvdImpulse<-2)add('SHORT',1);if(ctx.of.abs==='BULLISH')add('LONG',1);if(ctx.of.abs==='BEARISH')add('SHORT',1);if(Number.isFinite(ctx.oi.pct)&&ctx.oi.pct>0.4){if(ctx.t1.dir==='BULLISH')add('LONG',1);if(ctx.t1.dir==='BEARISH')add('SHORT',1)}if(ctx.funding>0.05)L-=1;if(ctx.funding<-0.05)S-=1;const diff=L-S,top=Math.max(L,S),direction=top>=7&&Math.abs(diff)>=3?(L>S?'LONG':'SHORT'):'WAIT';return{L,S,diff,top,direction}};
const tsNorm=r=>(r.list||[]).map(x=>({t:+x.time,p:+x.price,q:+x.size,side:x.side})).sort((a,b)=>a.t-b.t);
const oiNorm=r=>(r.list||[]).map(x=>({t:+x.timestamp,v:+x.openInterest})).sort((a,b)=>a.t-b.t);

const [rExec,r1,r4,rTrades,rOi,rFunding]=await Promise.all([
  get('/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=260'),
  get('/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=240'),
  get('/v5/market/kline?category=linear&symbol=BTCUSDT&interval=240&limit=240'),
  get('/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=1000'),
  get('/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=30'),
  get('/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=3')
]);
const cExec=normK(rExec),c1=normK(r1),c4=normK(r4),ts=tsNorm(rTrades),ois=oiNorm(rOi),funding=+(rFunding.list||[])[0].fundingRate*100;
const of=orderFlow(ts),oi=oiInfo(ois);
const mk=({exec,one,four})=>{const ctx={price:exec.at(-1).c,t1:trend(one),t4:trend(four),sw:sweep(exec),ms:mss(exec),fv:latestFvg(exec),of,oi,funding};return{ctx,res:scoreAll(ctx)}};
const live=mk({exec:cExec,one:c1,four:c4});
const closed=mk({exec:cExec.slice(0,-1),one:c1.slice(0,-1),four:c4.slice(0,-1)});
const spanSec=ts.length?(ts.at(-1).t-ts[0].t)/1000:NaN;
console.log('TRADE_COUNT='+ts.length);
console.log('TRADE_SPAN_SECONDS='+spanSec.toFixed(3));
console.log('TRADE_FIRST='+new Date(ts[0].t).toISOString());
console.log('TRADE_LAST='+new Date(ts.at(-1).t).toISOString());
console.log('DELTA_PCT='+of.deltaPct.toFixed(2));
console.log('CVD_IMPULSE='+of.cvdImpulse.toFixed(2));
console.log('ABSORPTION='+of.abs);
console.log('ABS_PRICE_CHANGE_PCT='+(((of.p1/of.p0)-1)*100).toFixed(4));
console.log('LIVE='+JSON.stringify({price:live.ctx.price,t4:live.ctx.t4.dir,t1:live.ctx.t1.dir,sweep:live.ctx.sw,mss:live.ctx.ms,fvg:live.ctx.fv,oi:live.ctx.oi.pct,funding:live.ctx.funding,score:live.res}));
console.log('CLOSED='+JSON.stringify({price:closed.ctx.price,t4:closed.ctx.t4.dir,t1:closed.ctx.t1.dir,sweep:closed.ctx.sw,mss:closed.ctx.ms,fvg:closed.ctx.fv,oi:closed.ctx.oi.pct,funding:closed.ctx.funding,score:closed.res}));
console.log('LAST_1H_START='+new Date(c1.at(-1).t).toISOString());
console.log('PREV_1H_START='+new Date(c1.at(-2).t).toISOString());
console.log('LAST_4H_START='+new Date(c4.at(-1).t).toISOString());
