/* 从练习纸出题器导出视频要用的图形、纸堆、铅笔（data.json）；node build.js 把 data.json 填进 scenes.src.js 生成 scenes.js、beats.json */
const fs=require('fs')
const d=JSON.parse(fs.readFileSync('data.json','utf8'))
const keep={}
for (const k of ['ex1','try1','build','chal']) keep[k]={shapes:d[k].shapes.map(s=>({t:s.t,x:s.x,y:s.y,s:s.s,lab:s.lab,v:s.v&&s.v.map(p=>p.map(v=>+v.toFixed(2)))}))}
for (const k of ['take','try2']) keep[k]={ti:d[k].ti,lp:d[k].lp,papers:d[k].papers.map(q=>({x:q.x,y:q.y,v:q.v}))}
keep.game={key:d.game.key}
fs.writeFileSync('scenes.js',fs.readFileSync('scenes.src.js','utf8').replace('/*DATA*/null',JSON.stringify(keep)))
const S=require('./scenes.js')
fs.writeFileSync('beats.json',JSON.stringify(S.map(s=>s.beats)))
console.log(S.length,'scenes', S.reduce((a,s)=>a+s.beats.length,0),'beats')
