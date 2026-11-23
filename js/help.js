/**
 * 使用说明（2026-11 二次改版）：独立的帮助页 help.html，左边目录、右边内容。
 *
 *   - 在 help.html 里（有 #help-page）：把下面的文案渲染成整页，含「备份与恢复」的导出 / 导入按钮。
 *   - 在其他页面：侧栏「使用说明」是个链接，这里把它指向 help.html#<当前板块>；
 *     账号菜单「备份与恢复」跳到 help.html#backup。不再自动弹窗。
 *
 * 文案全是写死的，没有任何用户输入，可以直接进 innerHTML。
 * 备份数据逻辑在 js/backup.js，须先于本文件加载。改了哪个板块的功能，记得回来同步这里的说明。
 */
;(function (root) {
  'use strict'

  var doc = root.document

  var START =
    '<p>练习纸的初衷就六个字：<b>少报班，少看屏</b>。它给一年级孩子出 A4 练习纸。每天打开网站，先到<b>今天</b>：每个板块今天要做的纸都摆在那里。</p>' +
    '<ol class="help-steps">' +
      '<li><b>选一张纸</b>：在「今天」点纸上的「打印」，或点进板块调整题型、范围和题量。</li>' +
      '<li><b>看一眼</b>：板块页中间的纸，就是打印出来的样子；右边是设置。</li>' +
      '<li><b>打印</b>：点右上角蓝色「打印」。</li>' +
      '<li><b>登记</b>：孩子做完，家长用手机扫纸左下角的二维码，点一下「会了 / 一般 / 不会」，下一张纸就按这个排。</li>' +
    '</ol>'

  var MARK =
    '<div class="help-list">' +
      '<p>每张题目纸的左下角都有一个小二维码（拼音在右上角）。孩子做完，家长用手机（微信扫一扫或相机）扫一下，就打开这张纸的登记页。手机要登录同一个账号，第一次扫会先让你登录。</p>' +
      '<p>扫哪一张都行：登记页下面会接着列出今天打印、还没登记的其他纸，一次点完。</p>' +
      '<p><b>口算、奥数</b>：点「会了 / 一般 / 不会」。会了＝全对或只错 1 题；一般＝错了几题；不会＝错一半以上，或做不下去。想更准，点「展开点错题」把做错的题点出来，档位会自动选好；口算的错题下一张会再出现，奥数点过错题的课会进「待复习」，攒到 3 课「今天」页就提醒打印复习卷。</p>' +
      '<p><b>游戏</b>（数独、火柴、密码、迷宫、数织）：点「太简单 / 刚好 / 太难」，下一张自动升一档或降一档；「今天」页会写明改成了第几关，不满意可以撤销。</p>' +
      '<p><b>识字</b>：在登记页直接点孩子没认出的字，再点「登记结果」，和在识字页登记一样。<b>拼音</b>的登记细一些，扫码后会回到拼音页这张卷的登记区。</p>' +
      '<p>点错了直接改，以最后一次为准。不登记也没关系，下一张照常出。在电脑上，板块页顶上的「登记」按钮也能打开同一个登记页。</p>' +
    '</div>'

  var PRINT =
    '<div class="help-list">' +
      '<p>纸张选 <b>A4</b>，缩放选「默认」或 100%。</p>' +
      '<p>在打印对话框的「更多设置」里<b>关掉「页眉和页脚」</b>，纸面上就不会印出网址和日期。</p>' +
      '<p>Windows 的 Edge / Chrome 与 Mac 的 Chrome 都能直接打印；Safari 请在「显示详细信息」里同样关掉页眉页脚。</p>' +
      '<p>口算、数独、识字、火柴、密码、迷宫、数织的设置会写进网址：复制网址发给别人，打开就是同一张卷子。想换一批题，点「重新生成」。</p>' +
    '</div>'

  var ACCOUNT =
    '<div class="help-list">' +
      '<p>登录后，奥数的「已学」标记、识字的错字集与进度、拼音的练习卷与登记都会<b>自动同步</b>到你的账号。换一台电脑，登录同一个账号就能接着用。</p>' +
      '<p>改密码：点左下角自己的邮箱，选「账号与密码」。改完后其他设备需要重新登录。</p>' +
      '<p>忘了密码：在登录页点「忘记密码？」，邮箱会收到 6 位验证码。没收到请看一下垃圾邮件箱。</p>' +
      '<p>几个家长共用一台电脑时，换人前请先退出登录。另一个账号登录时，这台电脑上上一位的数据会先清掉，不会混进去。</p>' +
    '</div>'

  var BACKUP =
    '<div class="help-backup">' +
      '<p>账号已经会自动同步，一般用不到备份。想自己留一份存档，或者在没登录的电脑之间搬数据时，可以用这里导出成一个文件，再在另一边导入。</p>' +
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
      key: '拼音',
      lead: '每天约五分钟，先独立读，卡住时照家长卡示范，再换题试试。',
      items: [
        '顺的题什么都不点；提示了或没读出，点那一题右边的按钮。做完点「本组做完」，中途结束时选最后做到的题。',
        '在纸上练时：提示画 ∨，没读出画 ×，跳过的题画横线，中途结束圈最后一题。之后到「历史」按卷号补登记。',
        '需要集中练某个方向时，可从「专题」或「课程」直接打开。'
      ]
    },
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
        '<b>字表</b>：面板最上面选考哪套字。默认是<b>洪恩识字</b>（1600 字）；也可以选<b>人教版一年级上册</b>（课本书后识字表，280 字），再在「学校学到」里选孩子学到哪一课，每日一卷就只考学校已经教过的字。跟着学校进度隔几天改一次就行。错字集两套字表共用。',
        '<b>本周复习</b>：打印这一周的字，每周 100 字，16 周复习一遍。只印字不印拼音：孩子念，你听。印完点「下一周 ▶」，进度会记住。用人教版时这一页签叫<b>单元检查</b>：一个单元的字印一张，学完一个单元考一次。',
        '<b>按课看掌握情况</b>（人教版）：「历史」页签最上面按课列出：哪一课有字没认出（红）、哪些错过但已学会，还没教到的课变淡。',
        '<b>人教版认识字：按课本顺序 / 随机</b>：默认按课本顺序往下出，一轮里不重复，出到学校学到的那一课就从头再来；面板上写着复习到哪一课了。也可以改成随机。人教版只考课本里的错字，洪恩独有的错字不会出现；人教版里没认出的字，切回洪恩也照样会考。',
        '<b>写字</b>（右边最上面切到「写字」，要用人教版字表）：按课本「写字表」一课出一张田字格练字纸。每个字第一行是范字（红色数字是第几笔从哪下笔）、拼音、几画和笔顺分解（一格加一笔，黑色是这一笔，下面写着笔画名）；第二行先描红、再自己写。默认练学校学到的那一课，也可以挑别的课，格子分大格 / 中格，描红 2–4 格。在屏幕上点范字，会一笔一笔演示怎么写。',
        '<b>点字标记</b>：孩子念不出来的字，在卷面上点一下（出现红框）＝这次<b>没认出</b>，点「登记结果」时一起记下；点错了再点一下取消。可以边念边点，也可以先在纸上圈、事后对着点。标记不会印到纸上。',
        '<b>错字集</b>：切到「错字集」打印一张全是错字的卷子。<b>红底</b>是在集里，右上角数字是还差几次认出毕业；<b>半红</b>是认出过一次、等 3 天后复核。复核认出就毕业移出。',
        '<b>历史</b>：只要错过一次的字都记着，毕业、清空都不会抹掉。「历史」页签按错的次数分组列出所有字，还有每天登记认出几个、又错几个。格子左上角「×3」这样的数字是累计错过几次。',
        '<b>顺带复习错字</b>：在「本周复习」里打开「附一页错字」，会从错字集里抽 20 个字附在后面：错得越多越容易抽到，认出过一次的（半红）机会减半。'
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
        '<b>卡住了</b>：点「提示」，会填上一格并说明为什么是这个数。直接点作答面板上的数字，能把盘上所有同样的数高亮出来。',
        '<b>做完了</b>：点「提交批改」（或按回车），错的格子会标红。计时从填第一个数开始，全对才停。'
      ]
    },
    {
      key: '火柴',
      lead: '火柴棒算式：卷子上印着一道用火柴拼出来的错算式，按提示拿走、添上或移动一根火柴，让它变对。每道题都保证只有一个答案。',
      items: [
        '<b>怎么玩</b>：数字像电子表那样用火柴拼，加号两根、减号一根，等号不许动。按题目旁边的提示动一根：拿走的那根打 ×，添上的那根用铅笔画出来，再把改好的算式写在横线上。',
        '<b>从哪下手</b>：先把算式读一遍，看错在哪儿；再看哪个数字多一根或少一根能变成别的数，比如 9 拿走一根能变 3 或 5，6 添一根能变 8。减号添一根竖的就变成加号，加号拿走竖的就变成减号。',
        '<b>四关递进</b>：第 1 关拿走一根 → 第 2 关添上一根（卷面上淡虚线是能放火柴的空位）→ 第 3 关移动一根，可以在同一个数字里挪，也可以挪到别处 → 第 4 关移动一根，数字到 20，有两位数。',
        '<b>卡住了</b>：勾「打印时附答案页」，答案页印着正确算式，并在原图上标出动的那根：打 × 的是拿走的，垫着灰底的是添上的。',
        '<b>对战</b>：「打印份数」选 2 份，同一套题父子各一张，看谁先改对。'
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
    }
  ]

  var SLUG = { '今天': 'start', '拼音': 'pinyin', '口算': 'kousuan', '奥数': 'aoshu', '识字': 'shizi',
    '数独': 'shudu', '火柴': 'huochai', '密码': 'mima', '数织': 'zhizhi', '迷宫': 'migong' }
  /* 帮助页上的板块顺序与侧栏一致 */
  var ORDER = ['口算', '奥数', '识字', '拼音', '数独', '火柴', '密码', '迷宫', '数织']

  function currentModuleName() {
    var a = doc.querySelector('.rail-link.active')
    return a ? (a.getAttribute('data-module') || '') : ''
  }

  function moduleOf(key) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].key === key) return MODULES[i]
    return null
  }

  /* 更新记录：数据在 js/changelog.js，新的在前 */
  function changelogHtml() {
    var log = (root.SumSum && root.SumSum.changelog && root.SumSum.changelog.list) || []
    if (!log.length) return '<p>暂无。</p>'
    function esc(t) {
      return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] })
    }
    return '<div class="help-log">' + log.map(function (e) {
      var d = e.date.split('-')
      return '<div class="help-log-day"><time datetime="' + esc(e.date) + '">' + d[0] + ' 年 ' + (+d[1]) + ' 月 ' + (+d[2]) + ' 日</time>' +
        '<div class="help-list">' + e.items.map(function (t) { return '<p>' + esc(t) + '</p>' }).join('') + '</div></div>'
    }).join('') + '</div>'
  }

  function renderPage(host) {
    var toc = [['start', '开始使用'], ['mark', '扫码登记'], ['print', '打印设置']]
      .concat(ORDER.map(function (k) { return [SLUG[k], k] }))
      .concat([['account', '账号与同步'], ['backup', '备份与恢复'], ['changelog', '更新记录']])
    var secs = [
      '<section id="start"><h2>开始使用</h2>' + START + '</section>',
      '<section id="mark"><h2>扫码登记</h2>' + MARK + '</section>',
      '<section id="print"><h2>打印设置</h2>' + PRINT + '</section>'
    ].concat(ORDER.map(function (k) {
      var m = moduleOf(k)
      return '<section id="' + SLUG[k] + '"><h2>' + k + '</h2>' +
        '<p class="help-lead">' + m.lead + '</p>' +
        '<div class="help-list">' + m.items.map(function (t) { return '<p>' + t + '</p>' }).join('') + '</div>' +
        (m.extra || '') +
        '<p class="help-go"><a href="' + SLUG[k] + '.html">打开' + k + '</a></p></section>'
    })).concat([
      '<section id="account"><h2>账号与同步</h2>' + ACCOUNT + '</section>',
      '<section id="backup"><h2>备份与恢复</h2>' + BACKUP + '</section>',
      '<section id="changelog"><h2>更新记录</h2>' + changelogHtml() + '</section>'
    ])
    host.innerHTML =
      '<nav class="help-toc" aria-label="目录"><ol>' + toc.map(function (t, i) {
        return (i === 2 ? '</ol><p>板块</p><ol>' : t[0] === 'account' ? '</ol><p>账号</p><ol>' : t[0] === 'changelog' ? '</ol><p>其他</p><ol>' : '') +
          '<li><a href="#' + t[0] + '" data-toc="' + t[0] + '">' + t[1] + '</a></li>'
      }).join('') + '</ol></nav>' +
      '<article class="help-article">' + secs.join('') + '</article>'
    wireBackup(host.querySelector('.help-backup'))

    /* 目录高亮跟着读到的那一节走 */
    var links = host.querySelectorAll('[data-toc]')
    function mark(id) {
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-toc') === id) })
    }
    if ('IntersectionObserver' in root) {
      var io = new root.IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id) })
      }, { root: host.closest('.help-scroll'), rootMargin: '0px 0px -70% 0px' })
      host.querySelectorAll('.help-article > section').forEach(function (sec) { io.observe(sec) })
    }
    /* 滚到底时最后一节可能够不着上沿，直接高亮最后一项 */
    var scroller = host.closest('.help-scroll')
    if (scroller) scroller.addEventListener('scroll', function () {
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) mark(toc[toc.length - 1][0])
    })
    mark((root.location.hash || '#start').slice(1))
    if (root.location.hash) {
      var target = doc.getElementById(root.location.hash.slice(1))
      if (target) target.scrollIntoView()
    }
  }

  function build() {
    var page = doc.getElementById('help-page')
    if (page) renderPage(page)
    var helpLink = doc.querySelector('a[data-help]')
    var slug = SLUG[currentModuleName()]
    if (helpLink && slug) helpLink.href = 'help.html#' + slug
    doc.querySelectorAll('[data-intro-help]').forEach(function (b) {
      b.addEventListener('click', function () { root.location.href = 'help.html' })
    })
    var backupBtn = doc.querySelector('[data-backup]')
    if (backupBtn && !page) backupBtn.addEventListener('click', function () { root.location.href = 'help.html#backup' })
    if (backupBtn && page) backupBtn.addEventListener('click', function () {
      var b = doc.getElementById('backup')
      if (b) b.scrollIntoView({ behavior: 'smooth' })
    })
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
      return lines.map(function (t) { return '<p>' + t + '</p>' }).join('')
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
        '到另一台电脑上，打开「使用说明 → 备份与恢复」点「导入备份」选这个文件。', 'ok')
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
