/* node build.js：把 data.json 填进 scenes.src.js，生成 scenes.js 和 beats.json */
const fs=require('fs')
const d=JSON.parse(fs.readFileSync('data.json','utf8'))
fs.writeFileSync('scenes.js',fs.readFileSync('scenes.src.js','utf8').replace('/*DATA*/null',JSON.stringify(d)))
delete require.cache[require.resolve('./scenes.js')]
const S=require('./scenes.js')
fs.writeFileSync('beats.json',JSON.stringify(S.map(s=>s.beats)))
console.log(S.length,'scenes', S.reduce((a,s)=>a+s.beats.length,0),'beats')
