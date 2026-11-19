#!/usr/bin/env node
/*
 * 由 vendor/candidates.json + 白名单 + 手绘点阵生成 js/zhizhi-art.js。
 * 用法：node tools/import-icons/gen-art.js（依赖先跑完 filter.js）
 * 以后扩充图库：改白名单或加手绘点阵，重跑本脚本即可。
 *
 * 许可：转译图来自 Bootstrap Icons v1.13.2（MIT）；手绘图案为本仓库原创。
 */
'use strict'

var fs = require('fs')
var path = require('path')

var cands = JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor', 'candidates.json'), 'utf8'))

/* 中文名与主题（theme：动物/交通/日常/符号/自然）。cake 为空心轮廓版，与 cake-fill 重复，跳过。 */
var NAMES = {
  8: {
    'airplane-fill': ['飞机', '交通'], 'balloon-heart-fill': ['爱心气球', '日常'],
    'bell-fill': ['铃铛', '日常'], 'boombox': ['收录机', '日常'], 'bug-fill': ['小虫子', '动物'],
    'calendar-event': ['日历', '日常'], 'cloud-drizzle-fill': ['毛毛雨', '自然'],
    'cloud-rain-heavy-fill': ['大雨', '自然'], 'cone-striped': ['交通锥', '交通'],
    'cpu-fill': ['芯片', '日常'], 'credit-card': ['银行卡', '日常'], 'door-closed': ['门', '日常'],
    'easel': ['画架', '日常'], 'ev-station-fill': ['充电站', '交通'], 'geo-alt-fill': ['定位标', '符号'],
    'globe': ['地球', '日常'], 'hospital': ['医院', '日常'], 'bank2': ['银行', '日常'],
    'lightning-fill': ['闪电', '自然'], 'mailbox2-flag': ['邮筒', '日常'], 'moon-fill': ['月亮', '自然'],
    'mortarboard-fill': ['学士帽', '日常'], 'music-note-beamed': ['音符', '符号'],
    'pin-fill': ['图钉', '日常'], 'postage': ['邮票', '日常'], 'postcard': ['明信片', '日常'],
    'puzzle-fill': ['拼图', '日常'], 'question': ['问号', '符号'], 'rocket-fill': ['火箭', '交通'],
    'snow2': ['雪花', '自然'], 'star-fill': ['星星', '符号'], 'stoplights-fill': ['红绿灯', '交通'],
    'suit-club-fill': ['梅花', '符号'], 'suit-spade-fill': ['黑桃', '符号'],
    'trash3-fill': ['垃圾桶', '日常'], 'tree-fill': ['小树', '自然'], 'trophy-fill': ['奖杯', '日常'],
    'truck-front-fill': ['卡车', '交通'], 'lungs-fill': ['肺', '日常'], 'sd-card': ['内存卡', '日常'],
    'stickies': ['便利贴', '日常'], 'wallet': ['钱包', '日常'], 'phone-landscape': ['手机', '日常'],
    'virus': ['病毒', '自然'], 'signpost-split-fill': ['路牌', '交通']
  },
  10: {
    'airplane-fill': ['飞机', '交通'], 'bag': ['手提包', '日常'], 'balloon-heart-fill': ['爱心气球', '日常'],
    'bandaid-fill': ['创可贴', '日常'], 'bookshelf': ['书架', '日常'], 'bus-front-fill': ['公交车', '交通'],
    'cake-fill': ['蛋糕', '日常'], 'cloud-fog2-fill': ['云雾', '自然'], 'door-open': ['开门', '日常'],
    'flag-fill': ['旗帜', '符号'], 'funnel-fill': ['漏斗', '日常'], 'gear-fill': ['齿轮', '日常'],
    'gift': ['礼物盒', '日常'], 'lightning-fill': ['闪电', '自然'],
    'memory': ['内存条', '日常'], 'moon-fill': ['月亮', '自然'], 'music-note-beamed': ['音符', '符号'],
    'palette-fill': ['调色盘', '日常'], 'pin-fill': ['图钉', '日常'],
    'rocket-takeoff-fill': ['起飞的火箭', '交通'], 'telephone-fill': ['电话', '日常'],
    'ticket-perforated': ['门票', '日常'], 'tag-fill': ['吊牌', '日常'], 'tree-fill': ['小树', '自然'],
    'triangle-fill': ['三角', '符号'], 'truck-front-fill': ['卡车', '交通'],
    'exclamation-triangle-fill': ['警告牌', '符号'], 'question-diamond-fill': ['问号牌', '符号'],
    'diamond-fill': ['钻石', '符号'], 'caret-left-fill': ['左箭头', '符号'],
    'caret-right-fill': ['右箭头', '符号'], 'display': ['显示器', '日常'], 'star-fill': ['星星', '符号'],
    'suit-spade-fill': ['黑桃', '符号'], 'cone-striped': ['交通锥', '交通']
  },
  12: {
    'airplane-fill': ['飞机', '交通'], 'balloon-fill': ['气球', '日常'], 'bookshelf': ['书架', '日常'],
    'bus-front-fill': ['公交车', '交通'], 'cake-fill': ['蛋糕', '日常'], 'caret-down': ['下箭头', '符号'],
    'caret-right-fill': ['右箭头', '符号'], 'cone': ['甜筒', '日常'], 'diamond-fill': ['钻石', '符号'],
    'dpad-fill': ['游戏键', '符号'], 'eye-fill': ['眼睛', '符号'], 'film': ['胶片', '日常'],
    'fire': ['火苗', '自然'], 'flag-fill': ['旗帜', '符号'], 'flask-fill': ['烧瓶', '日常'],
    'fuel-pump-fill': ['加油机', '交通'], 'gear-fill': ['齿轮', '日常'], 'geo-alt-fill': ['定位标', '符号'],
    'hash': ['井号', '符号'], 'laptop': ['笔记本电脑', '日常'], 'leaf-fill': ['树叶', '自然'],
    'moon-fill': ['月亮', '自然'], 'music-note-beamed': ['音符', '符号'], 'palette-fill': ['调色盘', '日常'],
    'play-fill': ['播放键', '符号'], 'rocket-takeoff-fill': ['起飞的火箭', '交通'],
    'search-heart-fill': ['爱心放大镜', '日常'], 'star-fill': ['星星', '符号'], 'sticky': ['便利贴', '日常'],
    'suitcase-lg': ['行李箱', '交通'], 'tree-fill': ['小树', '自然'], 'triangle-fill': ['三角', '符号'],
    'grid-3x3': ['九宫格', '符号'], 'exclamation-triangle-fill': ['警告牌', '符号'],
    'postage': ['邮票', '日常'], 'suit-spade-fill': ['黑桃', '符号'], 'brightness-low-fill': ['太阳', '自然']
  }
}

/* 手绘点阵（本仓库原创）。5×5 为 L1 的数字与极简图形，8×8 补充动物主题。
 * 瘦体数字是为了压黑格比例（七段粗体会到 64%+，超 60% 生成门）；字母只留正交笔画的。
 * 两条硬约束踩过的坑：斜对角的笔画在 4-连通下不相连；左右对称的图案线索常容许镜像，唯一解过不了。 */
var HAND = [
  { name: '数字 1', theme: '符号', size: 5, rows: ['..X..', '.XX..', '..X..', '..X..', 'XXXXX'] },
  { name: '数字 4', theme: '符号', size: 5, rows: ['X...X', 'X...X', 'XXXXX', '....X', '....X'] },
  { name: '字母 T', theme: '符号', size: 5, rows: ['XXXXX', '..X..', '..X..', '..X..', '..X..'] },
  { name: '字母 F', theme: '符号', size: 5, rows: ['XXXXX', 'X....', 'XXXXX', 'X....', 'X....'] },
  { name: '字母 H', theme: '符号', size: 5, rows: ['X...X', 'X...X', 'XXXXX', 'X...X', 'X...X'] },
  { name: '字母 U', theme: '符号', size: 5, rows: ['X...X', 'X...X', 'X...X', 'X...X', 'XXXXX'] },
  { name: '字母 P', theme: '符号', size: 5, rows: ['XXXX.', 'X...X', 'XXXXX', 'X....', 'X....'] },
  { name: '蘑菇', theme: '自然', size: 5, rows: ['.XXX.', 'XXXXX', '..X..', '..X..', '.....'] },
  { name: '小山', theme: '自然', size: 5, rows: ['..X..', '.XXX.', '.XXX.', 'XXXXX', '.....'] },
  { name: '爱心', theme: '日常', size: 5, rows: ['.X.X.', '.XXX.', 'XXXXX', '.XXX.', '..X..'] },
  { name: '钻石', theme: '符号', size: 5, rows: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'] },
  { name: '小房子', theme: '日常', size: 5, rows: ['..X..', '.XXX.', 'XXXXX', 'X...X', 'X...X'] },
  { name: '十字', theme: '符号', size: 5, rows: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'] },
  { name: '雨伞', theme: '日常', size: 5, rows: ['.XXX.', 'XXXXX', '..X..', '..X..', '.XXX.'] },
  { name: '猫头', theme: '动物', size: 8, rows: ['........', '..X..X..', '..XXXX..', '.XXXXXX.', '.X.XX.X.', '.XXXXXX.', '..XXXX..', '........'] },
  { name: '小鱼', theme: '动物', size: 8, rows: ['........', '..XXXX..', 'XXXXXXXX', '.XX.XXXX', 'XXXXXXXX', '..XXXX..', '........', '........'] },
]

function main() {
  var arts = HAND.slice()
  var missing = []
  Object.keys(NAMES).forEach(function (N) {
    Object.keys(NAMES[N]).forEach(function (icon) {
      var hit = cands.filter(function (x) { return x.size === +N && x.name === icon })
      if (!hit.length) { missing.push(N + ':' + icon); return }
      arts.push({
        name: NAMES[N][icon][0], theme: NAMES[N][icon][1], size: +N,
        rows: hit[0].rows, src: 'bootstrap-icons:' + icon
      })
    })
  })
  if (missing.length) {
    console.error('候选里找不到：' + missing.join(', '))
    process.exit(1)
  }

  var by = {}
  arts.forEach(function (a) { by[a.size] = (by[a.size] || 0) + 1 })
  console.log('图库统计：' + JSON.stringify(by) + '，共 ' + arts.length + ' 幅')

  var js = '/*\n' +
    ' * 数织图案库。本文件由 tools/import-icons/gen-art.js 生成，不要手改——\n' +
    ' * 要加图：改 gen-art.js（白名单/手绘点阵）后重跑，或直接在 HAND/NAMES 里加。\n' +
    ' * rows 为等宽点阵：X 黑格、. 白格。来源：手绘（本仓库原创）与\n' +
    ' * Bootstrap Icons v1.13.2 栅格化转译（MIT，见 docs/superpowers/specs/2026-11-19-zhizhi-module-design.md）。\n' +
    ' * 每幅均已过生成门（唯一解、连通、比例），校验器全量复核。\n' +
    ' */\n' +
    "(function (root) {\n  'use strict'\n\n" +
    '  var ARTS = ' + JSON.stringify(arts, null, 2).replace(/\n/g, '\n  ') + '\n\n' +
    '  root.SumSum = root.SumSum || {}\n' +
    '  root.SumSum.zhizhiArt = { ARTS: ARTS }\n' +
    "})(typeof window !== 'undefined' ? window : globalThis)\n"

  fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'zhizhi-art.js'), js)
  console.log('✓ js/zhizhi-art.js')
}

main()
