/* 从练习纸出题器（js/aoshu-topic-fanzhuan.js）挑视频要用的几道题，写 data.json */
globalThis.window = globalThis
globalThis.document = { getElementById(){return null}, querySelectorAll(){return []}, body:{classList:{remove(){},add(){}}} }
const path=require('path').join(__dirname,'..','..','..','..','js')+'/'
const P=require('fs').existsSync(path)?path:'/home/claude/lianxizhi/js/'
require(P+'render.js'); require(P+'aoshu-topics.js'); require(P+'aoshu-topic-fanzhuan.js')
const T=SumSum.aoshu.topics.fanzhuan, U=SumSum.aoshu.util
function find(vid,d,pred,s0){ for(let s=s0||1;s<9999;s++){ const q=U.withSeed(s,()=>T.variants.find(v=>v.id===vid).gen({difficulty:d})); if(q&&pred(q)) return q } }
function parse(q){ const f=q.key.split(':')[1].split('|'); return {dir:f[0], first:+f[1][0], a:f[1][1], b:f[1][2], path:f[2].split(',').map(t=>[+t[0],+t[1]]), order:f[3].split('').map(Number), answer:q.answer} }
const out={
  ex:  parse(find('lr','L2',q=>q.key.startsWith('lr:L|')&&q.answer==='B')),
  try1:parse(find('ud','L2',q=>q.key.startsWith('ud:D|')&&q.answer==='C',30)),
  ex2: parse(find('twice','L1',q=>q.key.startsWith('twice:LU|')&&q.answer==='D')),
  try2:parse(find('twice','L2',q=>q.key.startsWith('twice:RD|')&&q.answer==='A',40)),
  chal:parse(find('lr','L3',q=>q.key.startsWith('lr:R|')&&q.answer==='C',60))
}
require('fs').writeFileSync('data.json',JSON.stringify(out))
for(const k in out) console.log(k, JSON.stringify(out[k]))
