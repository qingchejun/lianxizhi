/**
 * 使用说明：左侧板块栏底部的「说明」「备份」两个按钮 + 弹窗。
 *
 * 七个页面共用这一个文件，弹窗由这里插进页面，按钮在板块栏里（tools/rail.py 生成，
 * 带 data-help / data-backup）。「备份」打开同一个弹窗，直接滚到备份那一段。
 * 打开时默认翻到当前页面那个板块。
 *
 * 2026-11-20 起，自动弹出按板块算：每个板块第一次打开时弹一次那个板块的说明
 * （key 为 sumsum:help:seen:<板块名>，读写失败就当「来过」，宁可不弹也别每次都弹）。
 * 从旧版「全站弹一次」过来的老用户自动迁移：老板块（今天/口算/奥数/识字/数独）
 * 一律当看过，只有新板块（密码/数织/迷宫）第一次点进去才会弹玩法介绍。
 *
 * 文案全是写死的，没有任何用户输入，可以直接进 innerHTML。
 * 弹窗里还有「导出 / 导入备份」，数据逻辑在 js/backup.js，页面上须先于本文件加载。
 * 改了哪个板块的功能，记得回来同步这里的说明；新增板块要往 MODULES 里加一页。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var SEEN_KEY = 'sumsum:help:seen' /* 旧版的全站一次性 key，仅迁移时读 */
  var SEEN_PREFIX = 'sumsum:help:seen:' /* 现按板块记：sumsum:help:seen:数织 这样 */
  /* 迁移时视为「早就看过」的板块：新板块（密码/数织/迷宫）不在此列，老用户第一次点进去会弹 */
  var OLD_KEYS = ['今天', '口算', '奥数', '识字', '数独']

  /* 四个板块都一样的部分：放在最上面，谁先看到都能明白这个站怎么用 */
  var COMMON =
    '<p class="help-fast"><b>最快</b>：打开网站先到「今天」，四张卡片都是上次的设置。' +
      '点卡片上的「打印」，看一眼纸没问题就打印；想改设置，点卡片进入对应板块。</p>' +
    '<ol class="help-steps">' +
      '<li><b>右边设置</b>：选题型、范围、题量。</li>' +
      '<li><b>中间就是纸</b>：屏幕上看到的，就是打印出来的样子。</li>' +
      '<li><b>点右上角蓝色「打印」</b>：纸张选 A4；打印对话框里把「页眉和页脚」关掉，纸面更干净。</li>' +
    '</ol>' +
    '<p class="help-note">口算、数独、识字、密码、数织、迷宫的设置会写进网址：<b>把链接收藏或发给别人，打开就是一模一样的那张卷子</b>。' +
      '想换一批题，点「重新生成」。</p>'

  /* 放在弹窗最后：板块栏的「备份」按钮直接滚到这里 */
  var BACKUP =
    '<div class="help-backup">' +
      '<h3>换电脑、换网址</h3>' +
      '<p>奥数「已学」标记、识字的进度和错字集存在<b>这台电脑的这个浏览器</b>里。' +
        '换之前（比如从旧网址 lianxizhi.pages.dev 搬到 lianxizhi.qingchejun.com），先在原来的地方点「导出备份」存一个文件，' +
        '再到新的地方点「导入备份」选这个文件。</p>' +
      '<p class="help-note">也可以不搬文件：在两台电脑上用<b>同一个账号</b>登录（侧栏「账号」），进度自动云端同步。' +
        '导入备份和云同步不冲突——导入的数据算最新，会同步到云端。</p>' +
      '<div class="help-backup-btns">' +
        '<button type="button" class="btn" data-bk="export">导出备份</button>' +
        '<button type="button" class="btn" data-bk="import">导入备份</button>' +
        '<input type="file" accept=".json,application/json" hidden />' +
      '</div>' +
      '<div class="help-backup-msg" role="status" hidden></div>' +
    '</div>'

  /* 数织示例：5×5「小树」从空盘走到揭晓，五步小棋盘。
     行列线索核过唯一解、且与 5×5 图库的点阵和线索签名都不撞（tools/check-zhizhi.js 同口径枚举过）。
     rows 字符：. 未定 / b 已定的黑 / n 这一步新涂 / x 确定的空；
     dimR / dimC：这条线是否已满足（在线玩里会变灰，与 zp-done 同一个意思） */
  var NONO = {
    rowClues: ['1', '3', '5', '1', '1'],
    colClues: ['1', '2', '5', '2', '1'],
    steps: [
      { rows: ['.....', '.....', '.....', '.....', '.....'], dimR: [0, 0, 0, 0, 0], dimC: [0, 0, 0, 0, 0],
        text: '开局先扫「正好排满」的数字：这盘第 3 行、第 3 列都印着 5——从它们下手。' },
      { rows: ['.....', '.....', 'nnnnn', '.....', '.....'], dimR: [0, 0, 1, 0, 0], dimC: [1, 0, 0, 0, 1],
        text: '第 1 招「排满就涂」：第 3 行印 5，整行涂黑。第 1、5 列各印 1，正好分到 1 格——这两列成了，数字变灰。' },
      { rows: ['..n..', '..n..', 'bbbbb', '..n..', '..n..'], dimR: [1, 0, 1, 1, 1], dimC: [1, 0, 1, 0, 1],
        text: '第 3 列也印 5，整列涂满。第 1、4、5 行印 1，都被正中间这格满足——变灰。' },
      { rows: ['xxbxx', 'x.b.x', 'bbbbb', 'xxbxx', 'xxbxx'], dimR: [1, 0, 1, 1, 1], dimC: [1, 0, 1, 0, 1],
        text: '成了的线（灰数字）剩下的格子全是空，大胆打 ×。一圈 × 打完，全盘只剩 2 个空格。' },
      { rows: ['xxbxx', 'xnbnx', 'bbbbb', 'xxbxx', 'xxbxx'], dimR: [1, 1, 1, 1, 1], dimC: [1, 1, 1, 1, 1],
        text: '第 2 列要连着的 2 格：第 3 行已黑、上下又被 × 卡死，只能涂第 2 行；第 4 列同理。全盘变灰，揭晓一棵小树。' }
    ]
  }

  function nonoExample() {
    function clue(txt, dim) {
      return '<td class="nono-clue' + (dim ? ' nono-dim' : '') + '">' + txt + '</td>'
    }
    var steps = NONO.steps.map(function (s) {
      var h = '<table class="nono-grid"><tr><td class="nono-blank"></td>'
      for (var j = 0; j < 5; j++) h += clue(NONO.colClues[j], s.dimC[j])
      h += '</tr>'
      for (var i = 0; i < 5; i++) {
        h += '<tr>' + clue(NONO.rowClues[i], s.dimR[i])
        for (var k = 0; k < 5; k++) {
          var ch = s.rows[i].charAt(k)
          h += '<td class="nono-c' +
            (ch === 'b' || ch === 'n' ? ' nono-on' + (ch === 'n' ? ' nono-new' : '') : '') +
            (ch === 'x' ? ' nono-x' : '') +
            '">' + (ch === 'x' ? '×' : '') + '</td>'
        }
        h += '</tr>'
      }
      return '<div class="nono-step">' + h + '</table><p class="nono-text">' + s.text + '</p></div>'
    }).join('')
    return (
      '<div class="help-nono">' +
      '<p class="help-nono-t">示例：5×5，从空盘到揭晓</p>' +
      '<div class="nono-steps">' + steps + '</div>' +
      '<p class="nono-legend">蓝色 = 这一步新涂的格子；× = 确定的空格；<span class="nono-dim">变灰的数字</span> = 这条线已经成了。</p>' +
      '</div>'
    )
  }

  var MODULES = [
    {
      key: '口算',
      lead: '加减乘除口算题，一张 A4 练习纸。适合每天 5 分钟的计算练习。',
      items: [
        '<b>最快的用法</b>：点「快速预设」里的一个按钮（如「20以内进退位」「乘法口诀」），马上出一张。',
        '<b>自己配</b>：「运算模式」选加法 / 减法 / 乘除 / 四则等，再设数值范围；加减法可以指定只出、多出或不出进位退位题。',
        '<b>题量与排版</b>：题目数量、每行几列、A4 纵向或横向都能调。每 10 题一组，中间有虚线，方便分段计时。',
        '<b>常用选项</b>：「跳过送分题」去掉 7+0、5×1 这类题；「附答案页」打印时多一页答案；加减法还能在答案页附凑十 / 破十提示，给家长讲题用。',
        '满意这张就直接打印；不满意点「重新生成」换一批。'
      ]
    },
    {
      key: '奥数',
      lead: 'L1、L2 共 40 个思维知识点，外加「L1 补充」拓展课，一天一个。每个知识点有讲解页、练习题和分步解析。',
      items: [
        '<b>选知识点</b>：左边目录切换「L1 算理」「L1 补充」「L2 思维」，点课名就换到那一课。学完 L1 先学「L1 补充」，再进 L2。带摄像机图标的课有讲解视频。',
        '<b>标记进度</b>：点课名前面的小圆点，或顶栏的「标记为已学」，标成「已学 ✓」。目录上方的「接着学 →」直接跳到下一课。',
        '<b>讲解视频</b>：在右边设置区最上面播放；点「放大播放」铺满屏幕给孩子看，按 Esc 收起，进度不丢。视频只在屏幕上，不会打印。',
        '<b>题型与难度</b>：每个知识点有几种题型，至少勾一种；难度分 20 以内 / 50 以内 / 100 以内。',
        '<b>推荐这样打印</b>：「打印哪几部分」里讲解页、解析页都勾上。先和孩子一起看讲解页（有视频就先看视频），再让孩子做练习，最后家长对着解析页讲。',
        '<b>综合复习</b>：学过几课后，打开「出一张综合复习卷」，在下面勾要混的几课（和「已学」标记互不影响，点「只选已学的」可以一键勾上学过的），解析页标明每题出自哪一课。'
      ]
    },
    {
      key: '识字',
      lead: '每天一张「每日一卷」：到期该复习的错字加认识字凑 20 个，生成后字固定，打印去考。',
      items: [
        '<b>每日一卷</b>：打开识字页默认就是它。一天最多一张，固定 20 个字：错字最多占 10 个、认识字凑满，顺序打乱。生成后字冻住——切去别的板块再回来，还是同一张。考完对着纸点<b>没认出</b>的字，点「登记结果」：点的记又错，没点的算认出。当天可撤销登记；不想登记就作废重来。登记完会提前把<b>明天的卷</b>出好（今晚登记的错字第二天接着考，就在上面）；出完之后又标了新的错字，还没考的明日卷会自动重排带上——考过的卷子绝不变脸。',
        '<b>毕业规则</b>：没认出的字第二天接着考，天天都在卷上；认出一次后隔 <b>3 天</b>回来复核一次，复核也认出才毕业（毕业 = 移出错字集）。复核没认出就回炉接着滚。每天带哪 10 个错字：昨晚没认出的和当天到期的先上（保证第二天接着考），空位再按最逾期、错得多、错得早的补。毕业了的字哪天又没认出，会重新收进错字集，错的次数接着累计。',
        '<b>本周复习</b>：打印这一周的字，每周 100 字，16 周复习一遍。只印字不印拼音：孩子念，你听。印完点「下一周 ▶」，进度会记住。',
        '<b>点字标记</b>：孩子念不出来的字，在卷面上点一下（深红框）＝这次<b>没认出</b>，点「登记结果」时一起记下；点错了再点一下取消。可以边念边点，也可以先在纸上圈、事后对着点。<b>纸上不会印出任何标记</b>。',
        '<b>错字集</b>：切到「错字集」打印一张全是错字的卷子。<b>红底</b>是在集里，右上角数字是还差几次认出毕业；<b>半红</b>是认出过一次、等 3 天后复核。复核认出就毕业移出。',
        '<b>历史</b>：只要错过一次的字都记着，毕业、清空都不会抹掉。「历史」页签按错的次数分组列出所有字，还有每天登记认出几个、又错几个。格子左上角「×3」这样的数字是累计错过几次。',
        '<b>顺带复习错字</b>：在「本周复习」里打开「附一页错字」，会从错字集里抽 20 个字附在后面：错得越多越容易抽到，认出过一次的（半红）机会减半。',
        '<b>换电脑、换网址</b>：错字集和进度只存在这个浏览器里，用下面的「导出备份 / 导入备份」带过去。'
      ]
    },
    {
      key: '数独',
      lead: '4 / 6 / 9 宫格数独。每一道都保证不用猜，一步步排除就能做完。可以打印，也可以直接在屏幕上玩。',
      items: [
        '<b>盘型</b>：初学从四宫格开始，熟练了换六宫格，最后到标准九宫格。',
        '<b>难度滑块</b>：拖动是在选「给几个提示数」，给得越少越难。拖到哪一档都不会卡死。',
        '<b>比赛玩法</b>：「打印份数」选 2 份，同一套题印两张，父子各一张，看谁先做完。',
        '<b>在屏幕上玩</b>：打开「屏幕上可以直接玩」，先点空格子，再点纸右边作答面板上的数字（或按键盘 1～9）。方向键移动，退格键擦除，Ctrl+Z 撤销。',
        '<b>卡住了</b>：点「💡 提示」，会填上一格并说明为什么是这个数。直接点作答面板上的数字，能把盘上所有同样的数高亮出来。',
        '<b>做完了</b>：点「提交批改」（或按回车），错的格子会标红。计时从填第一个数开始，全对才停。'
      ]
    },
    {
      key: '密码',
      lead: '猜密码推理游戏：卷子上印着一排候选数字和几行线索，把不可能的划掉，剩下的就是密码。每道题都保证不用猜、一步步能推到底。',
      items: [
        '<b>怎么玩</b>：纸的下方印着「数字带」（候选数字）和一条条线索。读线索，把数字带上不可能的数字划掉，全划完剩下的按顺序就是密码。让孩子用铅笔做，划错能擦。',
        '<b>线索怎么看</b>：● = 这个数字在密码里，位置也对；○ = 在密码里但位置不对；一行一个点都没有的印「—」，意思是这行出现的数字全错，数字带上一口气全划掉。第一次玩从第 1 关开始，它只有 ● 和全错两种线索。',
        '<b>四关递进</b>：第 1 关「点点入门」看 ● 排除 → 第 2 关加入 ○，学「在密码里、但不在这个位置」→ 第 3 关线索换成句子，和书上见到的题一个样子，开始练读题 → 第 4 关四位密码加「两个号码正确、位置都不对」这类复合线索，适合家长陪着一起推。',
        '<b>推荐用法</b>：让孩子把推理<b>说出来</b>——「这行全错，所以 3 和 7 都划掉」。说得出来的才算真会，光写出答案不算。',
        '<b>卡住了</b>：勾「打印时附答案页」，答案页有密码和分步推理——每一步划掉了哪个数字、依据是哪行线索，家长照着讲就行。',
        '<b>对战</b>：「打印份数」选 2 份，同一套题父子各一张，看谁先破译。'
      ]
    },
    {
      key: '数织',
      lead: '数织涂画游戏（Nonogram）：按网格边上的数字推理哪几格涂黑，全部涂完纸上会显出一幅画。每一道都只用数数和推理就能做出来，不需要猜。',
      items: [
        '<b>怎么玩</b>：网格<b>左边</b>的数字管这一行，<b>上方</b>的数字管这一列。一个数 = 这条线里有一段连着的黑格，数字是几就连几格；两个数 = 按顺序两段，中间至少空 1 格（比如「2 1」：先 2 格连黑，空至少 1 格，再 1 格黑）；<b>0 = 整条线都不涂</b>，可以直接整线打叉。全部推对，图案就出来了。用铅笔涂，涂错能擦。屏幕上每张题卡右上角有「试玩」按钮，可以先在线玩一把再打印。',
        '<b>从哪下手 · 三招</b>：①<b>排满就涂</b>——5×5 里印着 5 的线整线涂黑，印 0 的整线打叉；②<b>挤一挤</b>——把一段黑格先假设贴着最左（上）摆一遍、再贴着最右（下）摆一遍，两种摆法<b>重叠</b>的格子一定能涂；③<b>连着排除</b>——要凑「连着的 N 格」，摆法就那么几种，用已经确定的黑格和 × 一卡，常会只剩一种。三招轮着用，行推一点、列再推一点。',
        '<b>变灰 = 这条线成了</b>：在线玩时，哪条线涂出的黑格段正好对上数字，那条线的数字会变灰。灰了就说明这条线成了——剩下的格子全是空，大胆打 ×。',
        '<b>四关递进</b>：第 1 关 5×5 字母数字图形，第一次玩从它开始 → 第 2 关 8×8 动物和日常物件，学会挤一挤 → 第 3 关 10×10，行推出一点、列再推出一点 → 第 4 关 12×12 一整页一幅大图，适合安静的下午慢慢涂。',
        '<b>卡住了</b>：勾「打印时附答案页」，答案页有完成图和头几步起步提示（比如「第 5 行印着 5，正好排满」），孩子看一步就能接上。跟孩子约好：提示只看一条，看完合上自己推。',
        '<b>对战</b>：「打印份数」选 2 份，同一套图案父子各一张，看谁先涂出画。'
      ],
      extra: nonoExample()
    },
    {
      key: '迷宫',
      lead: '算式迷宫：满盘算式，只有答案对的格子才能踩，从「起」一路踩到「终」。每一张都保证只有一条全踩对的路线。',
      items: [
        '<b>怎么玩</b>：每格印一条算式（如 3+2=5）。<b>算式对的格子才能踩</b>：从「起」出发，上下左右走相邻的格子，只踩算对的，走到「终」就赢了。让孩子用铅笔把踩过的格子圈起来连成线，错了能擦。',
        '<b>先做什么</b>：不用急着找路——把每格都算一遍：错的格子打个 ×，对的格子圈起来，正确的路自己会显出来。',
        '<b>路上的岔口</b>：有的正确格子是岔路骗你的——踩上去能走通才是正路，走几步断头就退回来换一条。岔口里的正确格子不只是路上的，可能哪儿都通不了。',
        '<b>四关递进</b>：第 1 关 10 以内加法 · 4×4 小迷宫 → 第 2 关 10 以内加减混合 · 5×5，路上开始有岔口 → 第 3 关 20 以内进位加法（7+8 这种）· 6×6 一整张 → 第 4 关 20 以内加减混合（含退位 15-8 这种）· 6×6 岔口最多。',
        '<b>卡住了</b>：勾「打印时附答案页」，答案页印着唯一的那条正确路线（深色格子），家长一眼能对。',
        '<b>对战</b>：「打印份数」选 2 份，同一套迷宫父子各一张，比谁先从「起」走到「终」。'
      ]
    }
  ]

  function currentModuleName() {
    var a = doc.querySelector('.rail-link.active')
    return a ? (a.getAttribute('data-module') || '') : ''
  }

  function currentModule() {
    var name = currentModuleName()
    for (var i = 0; i < MODULES.length; i++) {
      if (MODULES[i].key === name) return i
    }
    return 0
  }

  function build() {
    var helpBtn = doc.querySelector('[data-help]')
    var backupBtn = doc.querySelector('[data-backup]')
    if (!helpBtn) return

    var tabs = MODULES.map(function (m, i) {
      return '<button type="button" class="stage-tab" data-i="' + i + '">' + m.key + '</button>'
    }).join('')
    var bodies = MODULES.map(function (m, i) {
      return '<section class="help-mod" data-i="' + i + '">' +
        '<p class="help-lead">' + m.lead + '</p>' +
        '<ul class="help-list">' + m.items.map(function (t) { return '<li>' + t + '</li>' }).join('') + '</ul>' +
        (m.extra || '') +
        '</section>'
    }).join('')

    var dlg = doc.createElement('dialog')
    dlg.className = 'help-dialog'
    dlg.setAttribute('aria-labelledby', 'help-title')
    dlg.innerHTML =
      '<div class="help-head">' +
        '<h2 id="help-title">使用说明</h2>' +
        '<button type="button" class="help-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="help-body">' +
        '<h3 class="help-h">三步出一张练习纸</h3>' + COMMON +
        '<h3 class="help-h">板块玩法</h3>' +
        '<div class="stage-tabs help-tabs">' + tabs + '</div>' +
        bodies + BACKUP +
      '</div>'
    doc.body.appendChild(dlg)

    function show(i) {
      dlg.querySelectorAll('.help-tabs .stage-tab').forEach(function (b) {
        b.classList.toggle('active', +b.dataset.i === i)
      })
      dlg.querySelectorAll('.help-mod').forEach(function (s) {
        s.hidden = +s.dataset.i !== i
      })
    }

    function open() {
      show(currentModule())
      dlg.showModal()
      dlg.querySelector('.help-body').scrollTop = 0
    }

    /* 「备份」：同一个弹窗，直接滚到备份那一段 */
    function openBackup() {
      open()
      dlg.querySelector('.help-backup').scrollIntoView({ block: 'start' })
    }

    helpBtn.addEventListener('click', open)
    if (backupBtn) backupBtn.addEventListener('click', openBackup)
    dlg.querySelector('.help-close').addEventListener('click', function () { dlg.close() })
    dlg.querySelector('.help-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.stage-tab')
      if (b) show(+b.dataset.i)
    })
    /* 点弹窗外的灰色遮罩关闭：点击落在 dialog 元素本身（而不是里面的内容）时就是点了遮罩 */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close()
    })

    wireBackup(dlg.querySelector('.help-backup'))

    /* 每个板块第一次打开自动弹一次。从旧版（全站弹一次）过来的老用户：
       老板块一律当看过——已看过旧说明的人不用再看一遍，只有没见过的新板块（密码/数织）会弹 */
    var seen = true
    try {
      if (root.localStorage.getItem(SEEN_KEY)) {
        for (var i = 0; i < OLD_KEYS.length; i++) {
          root.localStorage.setItem(SEEN_PREFIX + OLD_KEYS[i], '1')
        }
        root.localStorage.removeItem(SEEN_KEY)
      }
      var myKey = SEEN_PREFIX + (currentModuleName() || '今天')
      seen = !!root.localStorage.getItem(myKey)
      root.localStorage.setItem(myKey, '1')
    } catch (e) { /* 存不了就不自动弹 */ }
    if (!seen) open()
  }

  /* ---------- 备份 / 搬家（数据逻辑在 js/backup.js，这里只管按钮和提示） ---------- */

  function stamp() {
    var d = new Date()
    var p = function (n) {
      return (n < 10 ? '0' : '') + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds())
  }

  function wireBackup(box) {
    var B = root.SumSum && root.SumSum.backup
    if (!B) {
      box.hidden = true
      return
    }
    var msg = box.querySelector('.help-backup-msg')
    var file = box.querySelector('input[type=file]')
    var pending = null

    /* 所有文字都是写死的文案或 describe() 拼出来的固定句式，数字来自 JSON，不含文件里的原始字符串 */
    function say(html, kind) {
      msg.innerHTML = html
      msg.className = 'help-backup-msg' + (kind ? ' is-' + kind : '')
      msg.hidden = false
    }

    function list(lines) {
      return '<ul>' + lines.map(function (t) { return '<li>' + t + '</li>' }).join('') + '</ul>'
    }

    function doExport() {
      var pack
      try {
        pack = B.collect(root.localStorage)
      } catch (e) {
        return say('这个浏览器不允许读取本地数据（可能是无痕模式），没法导出。', 'bad')
      }
      if (!Object.keys(pack.data).length) {
        return say('这个浏览器上还没有可以备份的进度。', 'bad')
      }
      var name = '练习纸备份-' + stamp() + '.json'
      var url = URL.createObjectURL(new Blob([JSON.stringify(pack)], { type: 'application/json' }))
      var a = doc.createElement('a')
      a.href = url
      a.download = name
      doc.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      say('已下载 <b>' + name + '</b>，里面有：' + list(B.describe(pack.data)) +
        '到新电脑或新网址上，打开「使用说明」点「导入备份」选这个文件。', 'ok')
    }

    function confirmImport(r) {
      pending = r
      say('备份里有：' + list(B.describe(r.data)) +
        '导入后，这个浏览器上<b>同样的这几项会被备份里的替换掉</b>。' +
        '<div class="help-backup-btns">' +
          '<button type="button" class="btn btn-primary" data-bk="confirm">确认导入</button>' +
          '<button type="button" class="btn" data-bk="cancel">取消</button>' +
        '</div>')
    }

    function doImport() {
      if (!pending) return
      try {
        B.apply(root.localStorage, pending.data)
      } catch (e) {
        pending = null
        return say('这个浏览器不允许写入本地数据（可能是无痕模式），导入没有成功。', 'bad')
      }
      /* 导入是用户的明确意图：给导入的键盖「现在」，云同步会把它们当最新推上去 */
      if (root.SumSum && root.SumSum.store) root.SumSum.store.noteImport(pending.data)
      pending = null
      say('导入成功，页面马上刷新。', 'ok')
      /* 各板块只在页面加载时读一次存储，刷新一下才能看到导入的进度 */
      setTimeout(function () { root.location.reload() }, 900)
    }

    file.addEventListener('change', function () {
      var f = file.files && file.files[0]
      file.value = '' // 同一个文件再选一次也要触发 change
      if (!f) return
      var reader = new FileReader()
      reader.onload = function () {
        var r = B.parse(String(reader.result))
        if (r.ok) confirmImport(r)
        else say(r.error, 'bad')
      }
      reader.onerror = function () { say('文件读不出来，请重新选一次。', 'bad') }
      reader.readAsText(f)
    })

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bk]')
      if (!b) return
      var act = b.getAttribute('data-bk')
      if (act === 'export') doExport()
      else if (act === 'import') file.click()
      else if (act === 'confirm') doImport()
      else if (act === 'cancel') {
        pending = null
        msg.hidden = true
      }
    })
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build)
  else build()
})(window)
