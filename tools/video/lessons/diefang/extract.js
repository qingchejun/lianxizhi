globalThis.window = globalThis
globalThis.document = { getElementById(){return null}, querySelectorAll(){return []}, body:{classList:{remove(){},add(){}}} }
const path=require('path').join(__dirname,'..','..','..','..','js')+'/'
require(path+'render.js'); require(path+'aoshu-topics.js');
let src=require('fs').readFileSync(path+'aoshu-topic-diefang.js','utf8')
src=src.replace("DIEFANG._searchTake = searchTake","DIEFANG._searchTake = searchTake; root.__df={raster,paper,closureOf,labelPoint,mk,bbox,sat,TAKE_TABLE,takeSize,verts}")
eval(src)
const D=__df, T=SumSum.aoshu.topics.diefang, U=SumSum.aoshu.util
const out={}
function parseStack(key){ return key.split(':')[1].split('|').map(it=>{const f=it.split(','); const sh=D.mk(f[0],+f[1],+f[2],+f[3],+f[4],f[5]); return {t:f[0],x:+f[1],y:+f[2],s:+f[3],r:+f[4],lab:f[6],v:sh.v, area:0}}) }
function area(sh){ const R=D.raster([D.mk(sh.t,sh.x,sh.y,sh.s,sh.r,'w')],140,120,1); return R.area[0] }
function find(vid,d,pred,seed0){ for(let s=seed0||1;s<5000;s++){ const q=U.withSeed(s,()=>T.variants.find(v=>v.id===vid).gen({difficulty:d})); if(q&&pred(q)) return {seed:s,q} } }
// EX1: order L2, top shape largest
let r=find('order','L2',q=>{const S=parseStack(q.key); const a=S.map(area); return a[0]===Math.max(...a) && !S.some(x=>x.t==='star')})
out.ex1={key:r.q.key,answer:r.q.answer}
r=find('order','L1',q=>{const S=parseStack(q.key); return !S.some(x=>x.t==='star')},50); out.try1={key:r.q.key,answer:r.q.answer}
r=find('build','L2',q=>true,7); out.build={key:r.q.key,answer:r.q.answer}
r=find('build','L1',q=>true,90); out.chal={key:r.q.key,answer:r.q.answer}
r=find('take','L2',q=>q.answer===4 && /★ 纸被 \d+、\d+ 压着；/.test(q.solution[1].text)); out.take={key:r.q.key,answer:r.q.answer,sol:r.q.solution[1].text}
r=find('take','L1',q=>q.answer===3,30); out.try2={key:r.q.key,answer:r.q.answer,sol:r.q.solution[1].text}
r=find('game','L3',q=>{const n=q.key.split('|').length-2; return n===6 && /先取/.test(q.stem) && q.solution[1].text.split('，').length===3}); out.game={key:r.q.key,answer:r.q.answer,sol:r.q.solution.map(s=>s.text)}
// take label points
for (const k of ['take','try2']) { const p=out[k].key.split('|'); const wh=p[0].slice(5).split(',').map(Number), ti=+p[1]; const ps=p.slice(2).map(t=>{const f=t.split(',').map(Number);return D.paper(f[0],f[1],f[2])}); const R=D.raster(ps,wh[0],wh[1],1); const M={ov:ps.map(a=>ps.map(b=>a!==b&&D.sat(a.v,b.v)?1:0))}; const lvl=D.closureOf(M,ps.length,ti); out[k].papers=ps.map(q=>({x:q.x,y:q.y,r:q.r,v:q.v})); out[k].ti=ti; out[k].lvl=lvl; out[k].lp=ps.map((_,i)=>D.labelPoint(R,i,wh[0],wh[1])); out[k].wh=wh }
for (const k of ['ex1','try1','build','chal']) out[k].shapes=parseStack(out[k].key)
require('fs').writeFileSync('data.json',JSON.stringify(out))
for (const k in out) console.log(k, out[k].key.slice(0,140), '=>', out[k].answer, out[k].sol||'')
