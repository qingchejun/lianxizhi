/*
 * 数织图案库。本文件由 tools/import-icons/gen-art.js 生成，不要手改——
 * 要加图：改 gen-art.js（白名单/手绘点阵）后重跑，或直接在 HAND/NAMES 里加。
 * rows 为等宽点阵：X 黑格、. 白格。来源：手绘（本仓库原创）与
 * Bootstrap Icons v1.13.2 栅格化转译（MIT，见 docs/superpowers/specs/2026-11-19-zhizhi-module-design.md）。
 * 每幅均已过生成门（唯一解、连通、比例），校验器全量复核。
 */
(function (root) {
  'use strict'

  var ARTS = [
    {
      "name": "数字 1",
      "theme": "符号",
      "size": 5,
      "rows": [
        "..X..",
        ".XX..",
        "..X..",
        "..X..",
        "XXXXX"
      ]
    },
    {
      "name": "数字 4",
      "theme": "符号",
      "size": 5,
      "rows": [
        "X...X",
        "X...X",
        "XXXXX",
        "....X",
        "....X"
      ]
    },
    {
      "name": "字母 T",
      "theme": "符号",
      "size": 5,
      "rows": [
        "XXXXX",
        "..X..",
        "..X..",
        "..X..",
        "..X.."
      ]
    },
    {
      "name": "字母 F",
      "theme": "符号",
      "size": 5,
      "rows": [
        "XXXXX",
        "X....",
        "XXXXX",
        "X....",
        "X...."
      ]
    },
    {
      "name": "字母 H",
      "theme": "符号",
      "size": 5,
      "rows": [
        "X...X",
        "X...X",
        "XXXXX",
        "X...X",
        "X...X"
      ]
    },
    {
      "name": "字母 U",
      "theme": "符号",
      "size": 5,
      "rows": [
        "X...X",
        "X...X",
        "X...X",
        "X...X",
        "XXXXX"
      ]
    },
    {
      "name": "字母 P",
      "theme": "符号",
      "size": 5,
      "rows": [
        "XXXX.",
        "X...X",
        "XXXXX",
        "X....",
        "X...."
      ]
    },
    {
      "name": "蘑菇",
      "theme": "自然",
      "size": 5,
      "rows": [
        ".XXX.",
        "XXXXX",
        "..X..",
        "..X..",
        "....."
      ]
    },
    {
      "name": "小山",
      "theme": "自然",
      "size": 5,
      "rows": [
        "..X..",
        ".XXX.",
        ".XXX.",
        "XXXXX",
        "....."
      ]
    },
    {
      "name": "爱心",
      "theme": "日常",
      "size": 5,
      "rows": [
        ".X.X.",
        ".XXX.",
        "XXXXX",
        ".XXX.",
        "..X.."
      ]
    },
    {
      "name": "钻石",
      "theme": "符号",
      "size": 5,
      "rows": [
        "..X..",
        ".XXX.",
        "XXXXX",
        ".XXX.",
        "..X.."
      ]
    },
    {
      "name": "小房子",
      "theme": "日常",
      "size": 5,
      "rows": [
        "..X..",
        ".XXX.",
        "XXXXX",
        "X...X",
        "X...X"
      ]
    },
    {
      "name": "十字",
      "theme": "符号",
      "size": 5,
      "rows": [
        "..X..",
        "..X..",
        "XXXXX",
        "..X..",
        "..X.."
      ]
    },
    {
      "name": "雨伞",
      "theme": "日常",
      "size": 5,
      "rows": [
        ".XXX.",
        "XXXXX",
        "..X..",
        "..X..",
        ".XXX."
      ]
    },
    {
      "name": "猫头",
      "theme": "动物",
      "size": 8,
      "rows": [
        "........",
        "..X..X..",
        "..XXXX..",
        ".XXXXXX.",
        ".X.XX.X.",
        ".XXXXXX.",
        "..XXXX..",
        "........"
      ]
    },
    {
      "name": "小鱼",
      "theme": "动物",
      "size": 8,
      "rows": [
        "........",
        "..XXXX..",
        "XXXXXXXX",
        ".XX.XXXX",
        "XXXXXXXX",
        "..XXXX..",
        "........",
        "........"
      ]
    },
    {
      "name": "飞机",
      "theme": "交通",
      "size": 8,
      "rows": [
        "...XX...",
        "...XX...",
        "...XX...",
        "...XX...",
        ".XXXXXX.",
        "XXXXXXXX",
        "...XX...",
        "...XX..."
      ],
      "src": "bootstrap-icons:airplane-fill"
    },
    {
      "name": "爱心气球",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        "XXXXXXXX",
        "XXXXXXXX",
        ".XXXXXX.",
        "..XXXX..",
        "...XX...",
        "........",
        "........"
      ],
      "src": "bootstrap-icons:balloon-heart-fill"
    },
    {
      "name": "铃铛",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        "...XX..."
      ],
      "src": "bootstrap-icons:bell-fill"
    },
    {
      "name": "收录机",
      "theme": "日常",
      "size": 8,
      "rows": [
        "........",
        "XXXXXXXX",
        "X......X",
        "XXXXXXXX",
        "X.X..X.X",
        "XX....XX",
        "X.X..X.X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:boombox"
    },
    {
      "name": "小虫子",
      "theme": "动物",
      "size": 8,
      "rows": [
        "........",
        "..XXXX..",
        ".XXXXXX.",
        ".XX..X..",
        ".XXXXXX.",
        "XXXXXXXX",
        "..XXXX..",
        "..XXXX.."
      ],
      "src": "bootstrap-icons:bug-fill"
    },
    {
      "name": "日历",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        "XXXXXXXX",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:calendar-event"
    },
    {
      "name": "毛毛雨",
      "theme": "自然",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "XXXXXXX.",
        "XXXXXXXX",
        "XXXXXXXX",
        "........",
        "........",
        "........"
      ],
      "src": "bootstrap-icons:cloud-drizzle-fill"
    },
    {
      "name": "大雨",
      "theme": "自然",
      "size": 8,
      "rows": [
        "...XXX..",
        "..XXXX..",
        "XXXXXXX.",
        "XXXXXXXX",
        "XXXXXXX.",
        "........",
        "........",
        "........"
      ],
      "src": "bootstrap-icons:cloud-rain-heavy-fill"
    },
    {
      "name": "交通锥",
      "theme": "交通",
      "size": 8,
      "rows": [
        "...XX...",
        "...XX...",
        "...XX...",
        "..XXXX..",
        "...XX...",
        "..XXXX..",
        "XXXXXXXX",
        "..XXXX.."
      ],
      "src": "bootstrap-icons:cone-striped"
    },
    {
      "name": "芯片",
      "theme": "日常",
      "size": 8,
      "rows": [
        "........",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        "........"
      ],
      "src": "bootstrap-icons:cpu-fill"
    },
    {
      "name": "银行卡",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X......X",
        "XXXXXXXX",
        "X......X",
        "X......X",
        "XX.....X",
        "XX.....X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:credit-card"
    },
    {
      "name": "门",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        ".X....X.",
        ".X....X.",
        ".X....X.",
        ".X....X.",
        ".X....X.",
        ".X....X.",
        ".XXXXXX."
      ],
      "src": "bootstrap-icons:door-closed"
    },
    {
      "name": "画架",
      "theme": "日常",
      "size": 8,
      "rows": [
        "........",
        "XXXXXXXX",
        "X......X",
        "X......X",
        "X......X",
        "XXXXXXXX",
        ".X....X.",
        "........"
      ],
      "src": "bootstrap-icons:easel"
    },
    {
      "name": "充电站",
      "theme": "交通",
      "size": 8,
      "rows": [
        ".XXXXX..",
        ".X...X..",
        ".X...X.X",
        ".X...X.X",
        ".XXXXX.X",
        ".XXXXXXX",
        ".XXXXX.X",
        "XXXXXX.."
      ],
      "src": "bootstrap-icons:ev-station-fill"
    },
    {
      "name": "定位标",
      "theme": "符号",
      "size": 8,
      "rows": [
        "..XXXX..",
        "XXXXXXXX",
        "XX....XX",
        "XX....XX",
        ".XXXXXX.",
        ".XXXXXX.",
        "..XXXX..",
        "...XX..."
      ],
      "src": "bootstrap-icons:geo-alt-fill"
    },
    {
      "name": "地球",
      "theme": "日常",
      "size": 8,
      "rows": [
        "..XXXX..",
        ".XX..XX.",
        "XXXXXXXX",
        "X......X",
        "X......X",
        "XXXXXXXX",
        ".XX..XX.",
        "..XXXX.."
      ],
      "src": "bootstrap-icons:globe"
    },
    {
      "name": "医院",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "..X..X..",
        ".XXXXXX.",
        "X.X..X.X",
        "X.X..X.X",
        "X....X.X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:hospital"
    },
    {
      "name": "银行",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "XXXXXXXX",
        ".XX..XX.",
        ".XX..XX.",
        ".XX..XX.",
        ".XXXXXX.",
        ".XXXXXX."
      ],
      "src": "bootstrap-icons:bank2"
    },
    {
      "name": "闪电",
      "theme": "自然",
      "size": 8,
      "rows": [
        "..XXXX..",
        ".XXXX...",
        ".XXXX...",
        "XXXXXXXX",
        "XXXXXXX.",
        "...XX...",
        "..XX....",
        "..X....."
      ],
      "src": "bootstrap-icons:lightning-fill"
    },
    {
      "name": "邮筒",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".....X..",
        "....XX..",
        ".XXXX...",
        "XXXXX..X",
        "XXXX...X",
        "XXXX...X",
        "XXXX...X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:mailbox2-flag"
    },
    {
      "name": "月亮",
      "theme": "自然",
      "size": 8,
      "rows": [
        "..X.....",
        ".XX.....",
        "XXX.....",
        "XXX.....",
        "XXXX....",
        ".XXXX...",
        ".XXXXXXX",
        "...XXXX."
      ],
      "src": "bootstrap-icons:moon-fill"
    },
    {
      "name": "学士帽",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XX...",
        ".XXXXXX.",
        "XXXXXXXX",
        "..XXXX.X",
        "..X..X.X",
        "..XXXX.X",
        ".......X",
        "......XX"
      ],
      "src": "bootstrap-icons:mortarboard-fill"
    },
    {
      "name": "音符",
      "theme": "符号",
      "size": 8,
      "rows": [
        "...XXXXX",
        "..XXX..X",
        "..X....X",
        "..X....X",
        "..X...XX",
        "..X..XXX",
        "XXX...X.",
        "XX......"
      ],
      "src": "bootstrap-icons:music-note-beamed"
    },
    {
      "name": "图钉",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        "..XXXX..",
        "..XXXX..",
        ".XXXXXX.",
        "XXXXXXXX",
        "........",
        "........",
        "........"
      ],
      "src": "bootstrap-icons:pin-fill"
    },
    {
      "name": "邮票",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X..XX..X",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        "X.XXXX.X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:postage"
    },
    {
      "name": "明信片",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X......X",
        "XXX..XXX",
        "XXX..XXX",
        "X....XXX",
        "X......X",
        "X......X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:postcard"
    },
    {
      "name": "拼图",
      "theme": "日常",
      "size": 8,
      "rows": [
        "..XXXX..",
        "..X.XX..",
        "..XXXX..",
        "XXXXXXXX",
        "XXXXXXXX",
        "..XXXX..",
        "..X..X..",
        "..XXXX.."
      ],
      "src": "bootstrap-icons:puzzle-fill"
    },
    {
      "name": "问号",
      "theme": "符号",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        "XX...XXX",
        "......XX",
        "....XXX.",
        "...XX...",
        "...X....",
        "...XX...",
        "...XX..."
      ],
      "src": "bootstrap-icons:question"
    },
    {
      "name": "火箭",
      "theme": "交通",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "..X..X..",
        ".XX..X..",
        ".XXXXXX.",
        "XXXXXXXX",
        "XXXXXXXX",
        "X......X"
      ],
      "src": "bootstrap-icons:rocket-fill"
    },
    {
      "name": "雪花",
      "theme": "自然",
      "size": 8,
      "rows": [
        "...XX...",
        "...XX...",
        "XXXXXXXX",
        "..XXXX..",
        "..XXXX..",
        "XXXXXXXX",
        "...XX...",
        "...XX..."
      ],
      "src": "bootstrap-icons:snow2"
    },
    {
      "name": "星星",
      "theme": "符号",
      "size": 8,
      "rows": [
        "........",
        "...XX...",
        "..XXXX..",
        "XXXXXXXX",
        ".XXXXXX.",
        "..XXXX..",
        "..XXXX..",
        ".XX..XX."
      ],
      "src": "bootstrap-icons:star-fill"
    },
    {
      "name": "红绿灯",
      "theme": "交通",
      "size": 8,
      "rows": [
        "..XXXX..",
        "XXX..XXX",
        ".XXXXXX.",
        ".XX..XX.",
        ".XX..XX.",
        "XXX..XX.",
        ".XX..XX.",
        "..XXXX.."
      ],
      "src": "bootstrap-icons:stoplights-fill"
    },
    {
      "name": "梅花",
      "theme": "符号",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "..XXXX..",
        "XXXXXXXX",
        "XXXXXXXX",
        "XXXXXXXX",
        "...XX...",
        "...XX..."
      ],
      "src": "bootstrap-icons:suit-club-fill"
    },
    {
      "name": "黑桃",
      "theme": "符号",
      "size": 8,
      "rows": [
        "........",
        "...XX...",
        "..XXXX..",
        ".XXXXXX.",
        "XXXXXXXX",
        "XXXXXXXX",
        ".XXXXXX.",
        "...XX..."
      ],
      "src": "bootstrap-icons:suit-spade-fill"
    },
    {
      "name": "垃圾桶",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XX...",
        "XXXXXXXX",
        ".XXXXXX.",
        ".X.XX.X.",
        ".X.XX.X.",
        ".X.XX.X.",
        ".X.XX.X.",
        ".XXXXXX."
      ],
      "src": "bootstrap-icons:trash3-fill"
    },
    {
      "name": "小树",
      "theme": "自然",
      "size": 8,
      "rows": [
        "...XX...",
        "..XXXX..",
        "..XXXX..",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        "XXXXXXXX",
        "...XX..."
      ],
      "src": "bootstrap-icons:tree-fill"
    },
    {
      "name": "奖杯",
      "theme": "日常",
      "size": 8,
      "rows": [
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        "..XXXX..",
        "...XX...",
        "...XX...",
        ".XXXXXX."
      ],
      "src": "bootstrap-icons:trophy-fill"
    },
    {
      "name": "卡车",
      "theme": "交通",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X......X",
        "X......X",
        "X......X",
        "XXXXXXXX",
        "X.X..X.X",
        "XXXXXXXX",
        ".X....X."
      ],
      "src": "bootstrap-icons:truck-front-fill"
    },
    {
      "name": "肺",
      "theme": "日常",
      "size": 8,
      "rows": [
        "........",
        "..X..X..",
        ".XXXXXX.",
        "XXXXXXXX",
        "XX....XX",
        "XXX..XXX",
        "XXX..XXX",
        "XX....XX"
      ],
      "src": "bootstrap-icons:lungs-fill"
    },
    {
      "name": "内存卡",
      "theme": "日常",
      "size": 8,
      "rows": [
        "...XXXXX",
        "X......X",
        "X.XXXXXX",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:sd-card"
    },
    {
      "name": "便利贴",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXX..",
        "XXXXXXXX",
        "XX.....X",
        "XX.....X",
        "XX....XX",
        "XX......",
        ".X......",
        ".XXXX..."
      ],
      "src": "bootstrap-icons:stickies"
    },
    {
      "name": "钱包",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        "X......X",
        ".......X",
        "..XXXXXX"
      ],
      "src": "bootstrap-icons:wallet"
    },
    {
      "name": "手机",
      "theme": "日常",
      "size": 8,
      "rows": [
        "XXXXXXXX",
        "X......X",
        "X......X",
        "X.....XX",
        "X.....XX",
        "X......X",
        "X......X",
        "XXXXXXXX"
      ],
      "src": "bootstrap-icons:phone-landscape"
    },
    {
      "name": "病毒",
      "theme": "自然",
      "size": 8,
      "rows": [
        "........",
        "..XXXX..",
        ".XXX.XX.",
        ".X.XXXX.",
        ".XXXXXX.",
        ".XXXXXX.",
        "..XXXX..",
        "........"
      ],
      "src": "bootstrap-icons:virus"
    },
    {
      "name": "路牌",
      "theme": "交通",
      "size": 8,
      "rows": [
        "........",
        "...XXXXX",
        "...XXXXX",
        ".XXXX...",
        "XXXXX...",
        ".XXXX...",
        "...XX...",
        "...XX..."
      ],
      "src": "bootstrap-icons:signpost-split-fill"
    },
    {
      "name": "飞机",
      "theme": "交通",
      "size": 10,
      "rows": [
        "....XX....",
        "....XX....",
        "....XX....",
        "....XX....",
        "...XXXX...",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "XX..XX..XX",
        "....XX....",
        "...XXXX..."
      ],
      "src": "bootstrap-icons:airplane-fill"
    },
    {
      "name": "手提包",
      "theme": "日常",
      "size": 10,
      "rows": [
        "...XXXX...",
        "...X..X...",
        "XXXXXXXXXX",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:bag"
    },
    {
      "name": "爱心气球",
      "theme": "日常",
      "size": 10,
      "rows": [
        ".XXXXXXXX.",
        "X.XXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "..XXXXXX..",
        "....XX....",
        "..........",
        "..........",
        ".........."
      ],
      "src": "bootstrap-icons:balloon-heart-fill"
    },
    {
      "name": "创可贴",
      "theme": "日常",
      "size": 10,
      "rows": [
        "......XXX.",
        ".....XXXXX",
        "....XX.XXX",
        "...XXXX.XX",
        "..XXXXXXX.",
        ".XXXXXXX..",
        "XX.XXXX...",
        "XXX.XX....",
        "XXXXX.....",
        ".XXX......"
      ],
      "src": "bootstrap-icons:bandaid-fill"
    },
    {
      "name": "书架",
      "theme": "日常",
      "size": 10,
      "rows": [
        "X........X",
        "XXXXXXXXXX",
        "X........X",
        "X........X",
        "XXXXXXXXXX",
        "X........X",
        "XXXXXXXXXX",
        "X........X",
        "X........X",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:bookshelf"
    },
    {
      "name": "公交车",
      "theme": "交通",
      "size": 10,
      "rows": [
        ".XXXXXXXX.",
        ".X......X.",
        "XXXXXXXXXX",
        "XX......XX",
        "XX......XX",
        ".XX....XX.",
        ".X.X..X.X.",
        ".XXXXXXXX.",
        ".XXXXXXXX.",
        ".XX....XX."
      ],
      "src": "bootstrap-icons:bus-front-fill"
    },
    {
      "name": "蛋糕",
      "theme": "日常",
      "size": 10,
      "rows": [
        "..........",
        "..........",
        "...XXXX...",
        "..XXXXXX..",
        "..XXXXXX..",
        "..XXXXXX..",
        "XXXXXXXXXX",
        "XX.X..X.XX",
        "XXXXXXXXXX",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:cake-fill"
    },
    {
      "name": "云雾",
      "theme": "自然",
      "size": 10,
      "rows": [
        "....XXX...",
        "...XXXXX..",
        "...XXXXX..",
        ".XXXXXXX..",
        "XXXXXXXXX.",
        ".....XXXXX",
        "XXXXXXXXXX",
        "......XXXX",
        "XXXXXXXXXX",
        ".......XX."
      ],
      "src": "bootstrap-icons:cloud-fog2-fill"
    },
    {
      "name": "开门",
      "theme": "日常",
      "size": 10,
      "rows": [
        "...XXXX...",
        ".X....XX..",
        ".X....X.X.",
        ".X....X.X.",
        ".X....X.X.",
        ".X...XX.X.",
        ".X....X.X.",
        ".X....X.X.",
        ".X....X.X.",
        ".XXXXXXXX."
      ],
      "src": "bootstrap-icons:door-open"
    },
    {
      "name": "旗帜",
      "theme": "符号",
      "size": 10,
      "rows": [
        "XXXXXX.XXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XX...XXXX.",
        "X.........",
        "X.........",
        "X.........",
        "X........."
      ],
      "src": "bootstrap-icons:flag-fill"
    },
    {
      "name": "漏斗",
      "theme": "日常",
      "size": 10,
      "rows": [
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "..XXXXXX..",
        "..XXXXX...",
        "...XXXX...",
        "...XXXX...",
        "...XXXX...",
        "...XXXX...",
        "...XXX...."
      ],
      "src": "bootstrap-icons:funnel-fill"
    },
    {
      "name": "齿轮",
      "theme": "日常",
      "size": 10,
      "rows": [
        "....XX....",
        "..XXXXXX..",
        ".XXXXXXXX.",
        ".XXX..XXX.",
        "XXX....XXX",
        "XXX....XXX",
        ".XXX..XXX.",
        ".XXXXXXXX.",
        ".XXXXXXXX.",
        "....XX...."
      ],
      "src": "bootstrap-icons:gear-fill"
    },
    {
      "name": "礼物盒",
      "theme": "日常",
      "size": 10,
      "rows": [
        "..XX..XX..",
        "..X.XX.X..",
        "XXXXXXXXXX",
        "X...XX...X",
        "XXXXXXXXXX",
        "....XX....",
        "....XX....",
        "....XX....",
        "....XX....",
        ".XXXXXXXX."
      ],
      "src": "bootstrap-icons:gift"
    },
    {
      "name": "闪电",
      "theme": "自然",
      "size": 10,
      "rows": [
        "..XXXXX...",
        "..XXXXX...",
        ".XXXXX....",
        ".XXXXX....",
        ".XXXXXXXXX",
        "XXXXXXXX..",
        "....XXX...",
        "...XXX....",
        "...XX.....",
        "..XX......"
      ],
      "src": "bootstrap-icons:lightning-fill"
    },
    {
      "name": "内存条",
      "theme": "日常",
      "size": 10,
      "rows": [
        "XXXXXXXXXX",
        "X..X..X..X",
        "X..X..X..X",
        "X..X..X..X",
        "X..X..X..X",
        "X..X..X..X",
        "XXXXXXXXXX",
        "XX..X...XX",
        "XX..X...XX",
        "XXXX.XXXXX"
      ],
      "src": "bootstrap-icons:memory"
    },
    {
      "name": "月亮",
      "theme": "自然",
      "size": 10,
      "rows": [
        "..XX......",
        ".XXX......",
        ".XX.......",
        "XXXX......",
        "XXXX......",
        "XXXX......",
        "XXXXXX....",
        ".XXXXXXXXX",
        "..XXXXXXX.",
        "...XXXXX.."
      ],
      "src": "bootstrap-icons:moon-fill"
    },
    {
      "name": "音符",
      "theme": "符号",
      "size": 10,
      "rows": [
        ".....XXXXX",
        "...XXXXXXX",
        "...X.....X",
        "...X.....X",
        "...X.....X",
        "...X.....X",
        "...X...XXX",
        ".XXX...XXX",
        "XXXX....X.",
        ".XX......."
      ],
      "src": "bootstrap-icons:music-note-beamed"
    },
    {
      "name": "调色盘",
      "theme": "日常",
      "size": 10,
      "rows": [
        "...XXXX...",
        "..XXXXXX..",
        ".XXX..XXX.",
        "XX.XXXX.XX",
        "X..XXXX..X",
        "XXXXXXXXXX",
        "XXX.XX....",
        ".XX.XX....",
        "..XXXX....",
        "...XXX...."
      ],
      "src": "bootstrap-icons:palette-fill"
    },
    {
      "name": "图钉",
      "theme": "日常",
      "size": 10,
      "rows": [
        ".XXXXXXXX.",
        "..XXXXXX..",
        "..XXXXXX..",
        "..XXXXXX..",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "....XX....",
        "....XX....",
        "....XX....",
        ".........."
      ],
      "src": "bootstrap-icons:pin-fill"
    },
    {
      "name": "起飞的火箭",
      "theme": "交通",
      "size": 10,
      "rows": [
        ".......XXX",
        ".....XXXXX",
        "...XXX..XX",
        ".XXXXX..X.",
        "XXXXXXXXX.",
        "...XXXXX..",
        "..XXXXXX..",
        ".XXX.XX...",
        ".....XX...",
        ".....X...."
      ],
      "src": "bootstrap-icons:rocket-takeoff-fill"
    },
    {
      "name": "电话",
      "theme": "日常",
      "size": 10,
      "rows": [
        ".XX.......",
        "XXXX......",
        "XXXX......",
        "XXXX......",
        ".XXX......",
        "..XXX.....",
        "..XXXXXXX.",
        "...XXXXXXX",
        "....XXXXXX",
        "......XXX."
      ],
      "src": "bootstrap-icons:telephone-fill"
    },
    {
      "name": "门票",
      "theme": "日常",
      "size": 10,
      "rows": [
        "XXXXXXXXXX",
        "X........X",
        "X........X",
        "XX......XX",
        ".X......X.",
        ".X......X.",
        "XX......XX",
        "X........X",
        "X........X",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:ticket-perforated"
    },
    {
      "name": "吊牌",
      "theme": "日常",
      "size": 10,
      "rows": [
        "XXXXX.....",
        "XXXXXX....",
        "XX..XXX...",
        "XX.XXXXX..",
        "XXXXXXXXX.",
        ".XXXXXXXXX",
        "..XXXXXXX.",
        "...XXXXX..",
        "....XXXX..",
        ".....XX..."
      ],
      "src": "bootstrap-icons:tag-fill"
    },
    {
      "name": "小树",
      "theme": "自然",
      "size": 10,
      "rows": [
        "....XX....",
        "....XX....",
        "...XXXX...",
        "..XXXXXX..",
        "..XXXXXX..",
        ".XXXXXXXX.",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "....XX...."
      ],
      "src": "bootstrap-icons:tree-fill"
    },
    {
      "name": "三角",
      "theme": "符号",
      "size": 10,
      "rows": [
        "....XX....",
        "....XX....",
        "...XXXX...",
        "...XXXX...",
        "..XXXXXX..",
        "..XXXXXX..",
        ".XXXXXXXX.",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:triangle-fill"
    },
    {
      "name": "卡车",
      "theme": "交通",
      "size": 10,
      "rows": [
        ".XXXXXXXX.",
        "XX......XX",
        "X........X",
        "X........X",
        "XX......XX",
        "XXXXXXXXXX",
        "XXXX..XXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        ".XX....XX."
      ],
      "src": "bootstrap-icons:truck-front-fill"
    },
    {
      "name": "警告牌",
      "theme": "符号",
      "size": 10,
      "rows": [
        "....XX....",
        "....XX....",
        "...XXXX...",
        "...X..X...",
        "..XXXXXX..",
        "..XXXXXX..",
        ".XXXXXXXX.",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "XXXXXXXXXX"
      ],
      "src": "bootstrap-icons:exclamation-triangle-fill"
    },
    {
      "name": "问号牌",
      "theme": "符号",
      "size": 10,
      "rows": [
        "....XX....",
        "...XXXX...",
        "..XX..XX..",
        ".XXXXX.XX.",
        "XXXXX.XXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "..XXXXXX..",
        "...XXXX...",
        "....XX...."
      ],
      "src": "bootstrap-icons:question-diamond-fill"
    },
    {
      "name": "钻石",
      "theme": "符号",
      "size": 10,
      "rows": [
        "....XX....",
        "...XXXX...",
        "..XXXXXX..",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "..XXXXXX..",
        "...XXXX...",
        "....XX...."
      ],
      "src": "bootstrap-icons:diamond-fill"
    },
    {
      "name": "左箭头",
      "theme": "符号",
      "size": 10,
      "rows": [
        "........XX",
        "......XXXX",
        "....XXXXXX",
        "..XXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "..XXXXXXXX",
        "....XXXXXX",
        "......XXXX",
        "........XX"
      ],
      "src": "bootstrap-icons:caret-left-fill"
    },
    {
      "name": "右箭头",
      "theme": "符号",
      "size": 10,
      "rows": [
        "XX........",
        "XXXX......",
        "XXXXXX....",
        "XXXXXXXX..",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXX..",
        "XXXXXX....",
        "XXXX......",
        "XX........"
      ],
      "src": "bootstrap-icons:caret-right-fill"
    },
    {
      "name": "显示器",
      "theme": "日常",
      "size": 10,
      "rows": [
        "XXXXXXXXXX",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "X........X",
        "XXXXXXXXXX",
        "....XX....",
        "...XXXX..."
      ],
      "src": "bootstrap-icons:display"
    },
    {
      "name": "星星",
      "theme": "符号",
      "size": 10,
      "rows": [
        "..........",
        "....XX....",
        "....XX....",
        ".XXXXXXXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "..XXXXXX..",
        "..XXXXXX..",
        "..XXXXXX..",
        "..X....X.."
      ],
      "src": "bootstrap-icons:star-fill"
    },
    {
      "name": "黑桃",
      "theme": "符号",
      "size": 10,
      "rows": [
        "..........",
        "....XX....",
        "...XXXX...",
        "..XXXXXX..",
        ".XXXXXXXX.",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        ".XXXXXXXX.",
        "....XX....",
        "...XXXX..."
      ],
      "src": "bootstrap-icons:suit-spade-fill"
    },
    {
      "name": "交通锥",
      "theme": "交通",
      "size": 10,
      "rows": [
        "....XX....",
        "....XX....",
        "....XX....",
        "....XX....",
        "...XXXX...",
        "...XXXX...",
        "...XXXX...",
        "..XXXXXX..",
        "XXXXXXXXXX",
        "...XXXX..."
      ],
      "src": "bootstrap-icons:cone-striped"
    },
    {
      "name": "飞机",
      "theme": "交通",
      "size": 12,
      "rows": [
        ".....XX.....",
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "....XXXX....",
        "..XXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".....XX.....",
        ".....XX.....",
        "....XXXX...."
      ],
      "src": "bootstrap-icons:airplane-fill"
    },
    {
      "name": "气球",
      "theme": "日常",
      "size": 12,
      "rows": [
        "...XXXXXX...",
        ".XX..XXXXXX.",
        "XX.XXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "...XXXXXX...",
        ".....XX.....",
        "......X.....",
        "......X.....",
        "............"
      ],
      "src": "bootstrap-icons:balloon-fill"
    },
    {
      "name": "书架",
      "theme": "日常",
      "size": 12,
      "rows": [
        "X..........X",
        "XXXXXXXXXXXX",
        "X..........X",
        "X..........X",
        "XXXXXXXXXXXX",
        "X..........X",
        "X..........X",
        "XXXXXXXXXXXX",
        "X..........X",
        "X..........X",
        "XXXXXXXXXXXX",
        "X..........X"
      ],
      "src": "bootstrap-icons:bookshelf"
    },
    {
      "name": "公交车",
      "theme": "交通",
      "size": 12,
      "rows": [
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XX........XX",
        "XX........XX",
        "XX........XX",
        ".XXX....XXX.",
        ".XXXXXXXXXX.",
        ".X..X..X..X.",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "..XX....XX.."
      ],
      "src": "bootstrap-icons:bus-front-fill"
    },
    {
      "name": "蛋糕",
      "theme": "日常",
      "size": 12,
      "rows": [
        "............",
        "............",
        "............",
        "...XXXXXX...",
        "..XX.XX.XX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "X..........X",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:cake-fill"
    },
    {
      "name": "下箭头",
      "theme": "符号",
      "size": 12,
      "rows": [
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XX........XX",
        ".X........X.",
        ".XX......XX.",
        "..X......X..",
        "..XX....XX..",
        "...X....X...",
        "...XX..X....",
        "....XXXX....",
        ".....XX.....",
        ".....XX....."
      ],
      "src": "bootstrap-icons:caret-down"
    },
    {
      "name": "右箭头",
      "theme": "符号",
      "size": 12,
      "rows": [
        "XXX.........",
        "XXXXX.......",
        "XXXXXX......",
        "XXXXXXXX....",
        "XXXXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXX..",
        "XXXXXXXX....",
        "XXXXXX......",
        "XXXX........",
        ".XX........."
      ],
      "src": "bootstrap-icons:caret-right-fill"
    },
    {
      "name": "甜筒",
      "theme": "日常",
      "size": 12,
      "rows": [
        ".....XX.....",
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...XXXXXX...",
        "...XXXXXX...",
        "...XXXXXX...",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:cone"
    },
    {
      "name": "钻石",
      "theme": "符号",
      "size": 12,
      "rows": [
        ".....XX.....",
        "....XXXX....",
        "...XXXXXX...",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        ".....XX....."
      ],
      "src": "bootstrap-icons:diamond-fill"
    },
    {
      "name": "游戏键",
      "theme": "符号",
      "size": 12,
      "rows": [
        "....XXXX....",
        "....XXXX....",
        "....X..X....",
        "....XXXX....",
        "XXXXXXXXXXXX",
        "XX.XXXXXX.XX",
        "XX.XXXXXX.XX",
        "XXXXXXXXXXXX",
        "...XXXXXX...",
        "....X..X....",
        "....XXXX....",
        "....XXXX...."
      ],
      "src": "bootstrap-icons:dpad-fill"
    },
    {
      "name": "眼睛",
      "theme": "符号",
      "size": 12,
      "rows": [
        "....XXXX....",
        "...XXXXXX...",
        "..XXX..XXX..",
        ".XXX....XXX.",
        ".XXXXXXXXXX.",
        "XXX.XXXX.XXX",
        "XXX.XXXX.XXX",
        ".XXXXXXXXXX.",
        ".XXX....XXX.",
        "..XXX..XXX..",
        "...XXXXXX...",
        "....XXXX...."
      ],
      "src": "bootstrap-icons:eye-fill"
    },
    {
      "name": "胶片",
      "theme": "日常",
      "size": 12,
      "rows": [
        "XXXXXXXXXXXX",
        "X.X......X.X",
        "XXX......XXX",
        "X.X......X.X",
        "XXX......XXX",
        "X.XXXXXXXX.X",
        "X.XXXXXXXX.X",
        "XXX......XXX",
        "X.X......X.X",
        "XXX......XXX",
        "X.X......X.X",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:film"
    },
    {
      "name": "火苗",
      "theme": "自然",
      "size": 12,
      "rows": [
        "....XX......",
        "....XXX.....",
        "....XXXX....",
        "...XXXXX....",
        "..XXXXXX.X..",
        ".XXXXX.XXXX.",
        "XXXXX..XXXXX",
        "XXXX....XXXX",
        "XXX......XXX",
        "XXX......XXX",
        ".XXX....XXX.",
        "...XXXXXX..."
      ],
      "src": "bootstrap-icons:fire"
    },
    {
      "name": "旗帜",
      "theme": "符号",
      "size": 12,
      "rows": [
        "XXXXXX....XX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXX.",
        "X...........",
        "X...........",
        "X...........",
        "X...........",
        "X..........."
      ],
      "src": "bootstrap-icons:flag-fill"
    },
    {
      "name": "烧瓶",
      "theme": "日常",
      "size": 12,
      "rows": [
        "...XXXXXX...",
        "....XXXX....",
        "....XXXX....",
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...XXXX.X...",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXX.X.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:flask-fill"
    },
    {
      "name": "加油机",
      "theme": "交通",
      "size": 12,
      "rows": [
        ".XXXXXXX....",
        ".XXXXXXX..XX",
        ".X.....X...X",
        ".X.....X..XX",
        ".X.....X..XX",
        ".X.....X..XX",
        ".XXXXXXX..X.",
        ".XXXXXXXX.X.",
        ".XXXXXXXXXX.",
        ".XXXXXXX.XX.",
        ".XXXXXXX....",
        "XXXXXXXXX..."
      ],
      "src": "bootstrap-icons:fuel-pump-fill"
    },
    {
      "name": "齿轮",
      "theme": "日常",
      "size": 12,
      "rows": [
        ".....XX.....",
        "..X..XX..X..",
        ".XXXXXXXXX..",
        "..XXXXXXXX..",
        ".XXX....XX..",
        "XXXX....XXXX",
        "XXXX....XXXX",
        ".XXX....XX..",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        "..X..XX.....",
        ".....XX....."
      ],
      "src": "bootstrap-icons:gear-fill"
    },
    {
      "name": "定位标",
      "theme": "符号",
      "size": 12,
      "rows": [
        "...XXXXXX...",
        "..XXXXXXXX..",
        ".XXXX..XXXX.",
        "XXX......XXX",
        "XXX......XXX",
        "XXX......XXX",
        ".XXXX..XXXX.",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        ".....XX....."
      ],
      "src": "bootstrap-icons:geo-alt-fill"
    },
    {
      "name": "井号",
      "theme": "符号",
      "size": 12,
      "rows": [
        "....X....X..",
        "....X...XX..",
        "....X...XX..",
        ".XXXXXXXXXX.",
        "..XXXXXXXXX.",
        "...X...XX...",
        "...X...XX...",
        "XXXXXXXXXX..",
        "..XX..XX....",
        "..X...XX....",
        "..X...XX....",
        "..X...X....."
      ],
      "src": "bootstrap-icons:hash"
    },
    {
      "name": "笔记本电脑",
      "theme": "日常",
      "size": 12,
      "rows": [
        ".XXXXXXXXXX.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".X........X.",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:laptop"
    },
    {
      "name": "树叶",
      "theme": "自然",
      "size": 12,
      "rows": [
        "............",
        "XX..........",
        "XXXXXXXXX...",
        "XXXXXXXXXX..",
        "XXXXXXXXXXX.",
        "XXXXX....XX.",
        ".XXXXXXXX...",
        ".XXXXXXXXX..",
        "..XXXXXXXXX.",
        "...XXXXXXXX.",
        "......X...XX",
        "...........X"
      ],
      "src": "bootstrap-icons:leaf-fill"
    },
    {
      "name": "月亮",
      "theme": "自然",
      "size": 12,
      "rows": [
        "...XX.......",
        "..XXX.......",
        ".XXX........",
        ".XXX........",
        "XXXX........",
        "XXXXX.......",
        "XXXXX.......",
        "XXXXXX......",
        ".XXXXXXX....",
        ".XXXXXXXXXXX",
        "..XXXXXXXXX.",
        "....XXXXX..."
      ],
      "src": "bootstrap-icons:moon-fill"
    },
    {
      "name": "音符",
      "theme": "符号",
      "size": 12,
      "rows": [
        "......XXXXXX",
        "...XXXXXXXXX",
        "...XX......X",
        "...X.......X",
        "...X.......X",
        "...X.......X",
        "...X.......X",
        "...X....XXXX",
        "...X....XXXX",
        "XXXX....XXXX",
        "XXXX........",
        ".XXX........"
      ],
      "src": "bootstrap-icons:music-note-beamed"
    },
    {
      "name": "调色盘",
      "theme": "日常",
      "size": 12,
      "rows": [
        "....XXXX....",
        "..XXXXXXXX..",
        ".XXXX..XXXX.",
        ".XXXX..XXXX.",
        "XX..XXXX..XX",
        "XX.XXXXXX.XX",
        "XXXXXXXXXXXX",
        "XXXXXXXX.XX.",
        ".XX..XX.....",
        ".XXX.XX.....",
        "..XXXXX.....",
        "....XXX....."
      ],
      "src": "bootstrap-icons:palette-fill"
    },
    {
      "name": "播放键",
      "theme": "符号",
      "size": 12,
      "rows": [
        "XX..........",
        "XXXX........",
        "XXXXXX......",
        "XXXXXXXX....",
        "XXXXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXX..",
        "XXXXXXXX....",
        "XXXXXX......",
        "XXXX........",
        "XX.........."
      ],
      "src": "bootstrap-icons:play-fill"
    },
    {
      "name": "起飞的火箭",
      "theme": "交通",
      "size": 12,
      "rows": [
        ".........XXX",
        ".......XXXXX",
        ".....XXX.XXX",
        "..XXXXX...XX",
        ".XXXXXX..XX.",
        "XXXXXXXXXX..",
        "...XXXXXXX..",
        "..X.XXXXX...",
        "..XXXXXXX...",
        "..XX..XXX...",
        "......XX....",
        "......X....."
      ],
      "src": "bootstrap-icons:rocket-takeoff-fill"
    },
    {
      "name": "爱心放大镜",
      "theme": "日常",
      "size": 12,
      "rows": [
        "...XXXX.....",
        "..XXXXXX....",
        ".XXXXXXXX...",
        "XXX....XX...",
        "XXX....XXX..",
        "XXX....XXX..",
        "XXXX..XXX...",
        ".XXXXXXXX...",
        "..XXXXXXXX..",
        "....XX..XXX.",
        ".........XXX",
        "..........XX"
      ],
      "src": "bootstrap-icons:search-heart-fill"
    },
    {
      "name": "星星",
      "theme": "符号",
      "size": 12,
      "rows": [
        "............",
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "..XXXXXXX...",
        "...XXXXXX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "..XX....XX.."
      ],
      "src": "bootstrap-icons:star-fill"
    },
    {
      "name": "便利贴",
      "theme": "日常",
      "size": 12,
      "rows": [
        "XXXXXXXXXXXX",
        "X..........X",
        "X..........X",
        "X..........X",
        "X..........X",
        "X..........X",
        "X.....XXXXXX",
        "X.....X...XX",
        "X.....X..XX.",
        "X.....X.XX..",
        "X.....XX....",
        "XXXXXXX....."
      ],
      "src": "bootstrap-icons:sticky"
    },
    {
      "name": "行李箱",
      "theme": "交通",
      "size": 12,
      "rows": [
        "....XXXX....",
        "....X..X....",
        "XXXXXXXXXXXX",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        "X.X......X.X",
        ".XXXXXXXXXX."
      ],
      "src": "bootstrap-icons:suitcase-lg"
    },
    {
      "name": "小树",
      "theme": "自然",
      "size": 12,
      "rows": [
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...XXXXXX...",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        ".....XX.....",
        ".....XX....."
      ],
      "src": "bootstrap-icons:tree-fill"
    },
    {
      "name": "三角",
      "theme": "符号",
      "size": 12,
      "rows": [
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...XXXXXX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:triangle-fill"
    },
    {
      "name": "九宫格",
      "theme": "符号",
      "size": 12,
      "rows": [
        "XXXXXXXXXXXX",
        "X...X..X...X",
        "X...X..X...X",
        "X...X..X...X",
        "XXXXXXXXXXXX",
        "X...X..X...X",
        "X...X..X...X",
        "XXXXXXXXXXXX",
        "X...X..X...X",
        "X...X..X...X",
        "X...X..X...X",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:grid-3x3"
    },
    {
      "name": "警告牌",
      "theme": "符号",
      "size": 12,
      "rows": [
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "...XX..XX...",
        "...XX..XX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXX..XXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX"
      ],
      "src": "bootstrap-icons:exclamation-triangle-fill"
    },
    {
      "name": "邮票",
      "theme": "日常",
      "size": 12,
      "rows": [
        "XX.X.XX.X.XX",
        ".XXXXXXXXXX.",
        "XX.XXXXXX.XX",
        ".X........X.",
        "XX........XX",
        "XX........XX",
        "XX........XX",
        "XX........XX",
        ".X........X.",
        "XX.XXXXXX.XX",
        ".XXXXXXXXXX.",
        "XX.X.XX.X.XX"
      ],
      "src": "bootstrap-icons:postage"
    },
    {
      "name": "黑桃",
      "theme": "符号",
      "size": 12,
      "rows": [
        "............",
        ".....XX.....",
        "....XXXX....",
        "...XXXXXX...",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "....XXXX....",
        "....XXXX...."
      ],
      "src": "bootstrap-icons:suit-spade-fill"
    },
    {
      "name": "太阳",
      "theme": "自然",
      "size": 12,
      "rows": [
        "............",
        "............",
        "....XXXX....",
        "...XXXXXX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        "............",
        "............"
      ],
      "src": "bootstrap-icons:brightness-low-fill"
    }
  ]

  root.SumSum = root.SumSum || {}
  root.SumSum.zhizhiArt = { ARTS: ARTS }
})(typeof window !== 'undefined' ? window : globalThis)
