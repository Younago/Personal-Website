// ---------------------------------------------------------------------------
// The games log, transcribed from the source document (简历 · 游戏经历).
// Kept out of content.js and loaded only by games.html: it is ~85 rows in two
// languages, it is a record rather than site copy, and editor.html would
// otherwise have to round-trip all of it on every save.
//
// `tags` are the taxonomy the page is organised around — the tag cloud at the
// top is built from these counts and every section below is one tag. A title
// carries as many tags as apply, so it appears in several sections; that
// overlap is the point, not a duplication bug.
//
// `rank` is a single hand-ordered list across both platforms, by how
// well-known and how relevant the title is — NOT by playtime. It decides the
// order inside every tag section. 1 is the top of the list, and the miHoYo
// titles hold the top of it deliberately.
//
// `hours` (console) and `months` (mobile) are kept as the machine-readable
// duration behind the displayed `time` string, which is separate because the
// long-running titles are measured in seasons or years. A blank `note` means
// the source document records hours but no completion state for that title —
// the card simply omits the line.
// ---------------------------------------------------------------------------
window.SITE_GAME_TAGS = [
  {
    "key": "erciyuan",
    "zh": "二次元",
    "en": "Anime"
  },
  {
    "key": "duanyou",
    "zh": "端游",
    "en": "PC / Console"
  },
  {
    "key": "shouyou",
    "zh": "手游",
    "en": "Mobile"
  },
  {
    "key": "changxian",
    "zh": "长线运营",
    "en": "Live Service"
  },
  {
    "key": "choka",
    "zh": "抽卡",
    "en": "Gacha"
  },
  {
    "key": "dongzuo",
    "zh": "动作",
    "en": "Action"
  },
  {
    "key": "rpg",
    "zh": "角色扮演",
    "en": "RPG"
  },
  {
    "key": "huihe",
    "zh": "回合制",
    "en": "Turn-Based"
  },
  {
    "key": "daishijie",
    "zh": "大世界",
    "en": "Open World"
  },
  {
    "key": "xushi",
    "zh": "叙事",
    "en": "Narrative"
  },
  {
    "key": "hezuo",
    "zh": "合作",
    "en": "Co-op"
  },
  {
    "key": "jingji",
    "zh": "竞技",
    "en": "Competitive"
  },
  {
    "key": "kapai",
    "zh": "卡牌",
    "en": "Card"
  },
  {
    "key": "rougu",
    "zh": "肉鸽",
    "en": "Roguelike"
  },
  {
    "key": "celue",
    "zh": "策略",
    "en": "Strategy"
  },
  {
    "key": "shooter",
    "zh": "射击",
    "en": "Shooter"
  },
  {
    "key": "jiemi",
    "zh": "解密",
    "en": "Puzzle"
  },
  {
    "key": "moni",
    "zh": "模拟经营",
    "en": "Simulation"
  },
  {
    "key": "pingtai",
    "zh": "平台跳跃",
    "en": "Platformer"
  },
  {
    "key": "paidui",
    "zh": "派对",
    "en": "Party"
  },
  {
    "key": "duli",
    "zh": "独立游戏",
    "en": "Indie"
  },
  {
    "key": "jingsu",
    "zh": "竞速",
    "en": "Racing"
  },
  {
    "key": "gedou",
    "zh": "格斗",
    "en": "Fighting"
  },
  {
    "key": "zizouqi",
    "zh": "自走棋",
    "en": "Auto Battler"
  },
  {
    "key": "jiezou",
    "zh": "节奏",
    "en": "Rhythm"
  }
];

window.SITE_GAMES = {
  "console": [
    {
      "zh": {
        "name": "塞尔达传说：旷野之息",
        "time": "182h",
        "note": "主线 + DLC 通关，全神庙、全克洛格（呀哈哈）收集"
      },
      "en": {
        "name": "The Legend of Zelda: Breath of the Wild",
        "time": "182h",
        "note": "Main story + DLC, all shrines and every Korok seed"
      },
      "kind": "console",
      "hours": 182,
      "rank": 7,
      "tags": [
        "duanyou",
        "daishijie",
        "dongzuo",
        "jiemi"
      ]
    },
    {
      "zh": {
        "name": "塞尔达传说：王国之泪",
        "time": "124h",
        "note": "地图全开，Boss 全收集"
      },
      "en": {
        "name": "The Legend of Zelda: Tears of the Kingdom",
        "time": "124h",
        "note": "Map fully revealed, every boss cleared"
      },
      "kind": "console",
      "hours": 124,
      "rank": 11,
      "tags": [
        "duanyou",
        "daishijie",
        "dongzuo",
        "jiemi"
      ]
    },
    {
      "zh": {
        "name": "黑神话：悟空",
        "time": "66h",
        "note": "二周目通关"
      },
      "en": {
        "name": "Black Myth: Wukong",
        "time": "66h",
        "note": "New Game+ completed"
      },
      "kind": "console",
      "hours": 66,
      "rank": 13,
      "tags": [
        "duanyou",
        "dongzuo",
        "rpg"
      ]
    },
    {
      "zh": {
        "name": "尼尔：机械纪元",
        "time": "46h",
        "note": "二周目通关"
      },
      "en": {
        "name": "NieR: Automata",
        "time": "46h",
        "note": "New Game+ completed"
      },
      "kind": "console",
      "hours": 46,
      "rank": 23,
      "tags": [
        "duanyou",
        "dongzuo",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "地下城与勇士",
        "time": "4 年+",
        "note": "付费 3k+，多职业 100 级"
      },
      "en": {
        "name": "Dungeon & Fighter",
        "time": "4+ yrs",
        "note": "4+ years, ¥3k+ spent, several classes at level 100"
      },
      "kind": "console",
      "rank": 55,
      "tags": [
        "duanyou",
        "dongzuo",
        "rpg",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "博德之门 3",
        "time": "165h",
        "note": "多线路（自创 + 邪念）通关"
      },
      "en": {
        "name": "Baldur's Gate 3",
        "time": "165h",
        "note": "Multiple routes completed, including a Dark Urge run"
      },
      "kind": "console",
      "hours": 165,
      "rank": 15,
      "tags": [
        "duanyou",
        "rpg",
        "huihe",
        "xushi",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "女神异闻录 5R",
        "time": "127h",
        "note": "二周目加 DLC 通关"
      },
      "en": {
        "name": "Persona 5 Royal",
        "time": "127h",
        "note": "New Game+ and DLC completed"
      },
      "kind": "console",
      "hours": 127,
      "rank": 16,
      "tags": [
        "duanyou",
        "erciyuan",
        "huihe",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "暗喻幻想",
        "time": "72h",
        "note": "一周目通关"
      },
      "en": {
        "name": "Metaphor: ReFantazio",
        "time": "72h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 72,
      "rank": 50,
      "tags": [
        "duanyou",
        "erciyuan",
        "huihe",
        "rpg"
      ]
    },
    {
      "zh": {
        "name": "女神异闻录 3R",
        "time": "65h",
        "note": "一周目通关"
      },
      "en": {
        "name": "Persona 3 Reload",
        "time": "65h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 65,
      "rank": 49,
      "tags": [
        "duanyou",
        "erciyuan",
        "huihe",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "最终幻想 7 重制版",
        "time": "52h",
        "note": "一周目通关"
      },
      "en": {
        "name": "Final Fantasy VII Remake",
        "time": "52h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 52,
      "rank": 29,
      "tags": [
        "duanyou",
        "erciyuan",
        "dongzuo",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "精灵宝可梦 朱/紫",
        "time": "95h",
        "note": "主线 + 全 DLC 通关"
      },
      "en": {
        "name": "Pokémon Scarlet / Violet",
        "time": "95h",
        "note": "Main story and all DLC completed"
      },
      "kind": "console",
      "hours": 95,
      "rank": 19,
      "tags": [
        "duanyou",
        "huihe",
        "rpg",
        "daishijie"
      ]
    },
    {
      "zh": {
        "name": "口袋妖怪系列（宝石 — 日月）",
        "time": "200h+",
        "note": "主要作品通关"
      },
      "en": {
        "name": "Pokémon series (Ruby — Sun/Moon)",
        "time": "200h+",
        "note": "Cleared the main entries"
      },
      "kind": "console",
      "hours": 200,
      "rank": 18,
      "tags": [
        "duanyou",
        "huihe",
        "rpg"
      ]
    },
    {
      "zh": {
        "name": "Balatro 小丑牌",
        "time": "45h",
        "note": "全卡牌收集，Steam 成就 28"
      },
      "en": {
        "name": "Balatro",
        "time": "45h",
        "note": "All cards collected, 28 Steam achievements"
      },
      "kind": "console",
      "hours": 45,
      "rank": 43,
      "tags": [
        "duanyou",
        "kapai",
        "rougu",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "杀戮尖塔",
        "time": "54h",
        "note": "全职业玩法通关"
      },
      "en": {
        "name": "Slay the Spire",
        "time": "54h",
        "note": "Cleared with every character"
      },
      "kind": "console",
      "hours": 54,
      "rank": 41,
      "tags": [
        "duanyou",
        "kapai",
        "rougu",
        "huihe",
        "celue",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "炉石传说",
        "time": "8 月",
        "note": "付费 1k+，赛季传说"
      },
      "en": {
        "name": "Hearthstone",
        "time": "8 mo",
        "note": "8 months, ¥1k+ spent, Legend rank"
      },
      "kind": "console",
      "rank": 27,
      "tags": [
        "duanyou",
        "kapai",
        "huihe",
        "celue",
        "changxian",
        "jingji"
      ]
    },
    {
      "zh": {
        "name": "三国杀",
        "time": "5 年+",
        "note": "付费 2k+，十周年服务器 170 级"
      },
      "en": {
        "name": "Sanguosha",
        "time": "5+ yrs",
        "note": "5+ years, ¥2k+ spent, level 170 on the 10th-anniversary server"
      },
      "kind": "console",
      "rank": 56,
      "tags": [
        "duanyou",
        "kapai",
        "huihe",
        "celue",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "云顶之弈",
        "time": "S1 至今",
        "note": "多赛季电一（艾欧尼亚）大师"
      },
      "en": {
        "name": "Teamfight Tactics",
        "time": "since S1",
        "note": "Since Season 1 — Master rank across several seasons"
      },
      "kind": "console",
      "rank": 28,
      "tags": [
        "duanyou",
        "zizouqi",
        "celue",
        "jingji",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "冰汽时代",
        "time": "35h",
        "note": "主线 + 全 DLC 通关"
      },
      "en": {
        "name": "Frostpunk",
        "time": "35h",
        "note": "Main campaign and all DLC completed"
      },
      "kind": "console",
      "hours": 35,
      "rank": 57,
      "tags": [
        "duanyou",
        "moni",
        "celue",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "监狱建筑师",
        "time": "15h",
        "note": "主线完成，Steam 成就 12/18"
      },
      "en": {
        "name": "Prison Architect",
        "time": "15h",
        "note": "Campaign completed, 12/18 Steam achievements"
      },
      "kind": "console",
      "hours": 15,
      "rank": 67,
      "tags": [
        "duanyou",
        "moni",
        "celue"
      ]
    },
    {
      "zh": {
        "name": "瘟疫公司",
        "time": "14h",
        "note": "多线路通关"
      },
      "en": {
        "name": "Plague Inc.",
        "time": "14h",
        "note": "Cleared on multiple routes"
      },
      "kind": "console",
      "hours": 14,
      "rank": 68,
      "tags": [
        "duanyou",
        "moni",
        "celue"
      ]
    },
    {
      "zh": {
        "name": "城市天际线",
        "time": "35h",
        "note": "完成大型城市建设"
      },
      "en": {
        "name": "Cities: Skylines",
        "time": "35h",
        "note": "Built out a large city"
      },
      "kind": "console",
      "hours": 35,
      "rank": 44,
      "tags": [
        "duanyou",
        "moni"
      ]
    },
    {
      "zh": {
        "name": "超级马里奥惊奇",
        "time": "28h",
        "note": "全关卡满星"
      },
      "en": {
        "name": "Super Mario Bros. Wonder",
        "time": "28h",
        "note": "Every level fully starred"
      },
      "kind": "console",
      "hours": 28,
      "rank": 39,
      "tags": [
        "duanyou",
        "pingtai",
        "hezuo",
        "paidui"
      ]
    },
    {
      "zh": {
        "name": "空洞骑士",
        "time": "63h",
        "note": "全区域解锁，主线通关"
      },
      "en": {
        "name": "Hollow Knight",
        "time": "63h",
        "note": "All areas unlocked, main story completed"
      },
      "kind": "console",
      "hours": 63,
      "rank": 24,
      "tags": [
        "duanyou",
        "pingtai",
        "dongzuo",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "超级马里奥奥德赛",
        "time": "22h",
        "note": "主线通关，收集度 90%"
      },
      "en": {
        "name": "Super Mario Odyssey",
        "time": "22h",
        "note": "Main story completed, 90% collection"
      },
      "kind": "console",
      "hours": 22,
      "rank": 20,
      "tags": [
        "duanyou",
        "pingtai",
        "daishijie"
      ]
    },
    {
      "zh": {
        "name": "死亡搁浅",
        "time": "112h",
        "note": "一周目主线加支线 DLC 通关"
      },
      "en": {
        "name": "Death Stranding",
        "time": "112h",
        "note": "Main story, side content and DLC completed"
      },
      "kind": "console",
      "hours": 112,
      "rank": 22,
      "tags": [
        "duanyou",
        "daishijie",
        "xushi",
        "dongzuo"
      ]
    },
    {
      "zh": {
        "name": "Hi-Fi Rush",
        "time": "45h",
        "note": "一周目主线通关"
      },
      "en": {
        "name": "Hi-Fi Rush",
        "time": "45h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 45,
      "rank": 73,
      "tags": [
        "duanyou",
        "dongzuo",
        "jiezou"
      ]
    },
    {
      "zh": {
        "name": "只狼",
        "time": "48h",
        "note": "一周目主线通关"
      },
      "en": {
        "name": "Sekiro: Shadows Die Twice",
        "time": "48h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 48,
      "rank": 17,
      "tags": [
        "duanyou",
        "dongzuo"
      ]
    },
    {
      "zh": {
        "name": "师父",
        "time": "38h",
        "note": "主线通关"
      },
      "en": {
        "name": "Sifu",
        "time": "38h",
        "note": "Main story completed"
      },
      "kind": "console",
      "hours": 38,
      "rank": 74,
      "tags": [
        "duanyou",
        "dongzuo"
      ]
    },
    {
      "zh": {
        "name": "鬼泣 5",
        "time": "45h",
        "note": "一周目通关"
      },
      "en": {
        "name": "Devil May Cry 5",
        "time": "45h",
        "note": "First playthrough completed"
      },
      "kind": "console",
      "hours": 45,
      "rank": 38,
      "tags": [
        "duanyou",
        "dongzuo"
      ]
    },
    {
      "zh": {
        "name": "双人成行",
        "time": "32h",
        "note": "多次通关"
      },
      "en": {
        "name": "It Takes Two",
        "time": "32h",
        "note": "Completed several times"
      },
      "kind": "console",
      "hours": 32,
      "rank": 33,
      "tags": [
        "duanyou",
        "hezuo",
        "pingtai",
        "jiemi"
      ]
    },
    {
      "zh": {
        "name": "双影奇境",
        "time": "14h",
        "note": "单角色通关"
      },
      "en": {
        "name": "Split Fiction",
        "time": "14h",
        "note": "Completed on one side"
      },
      "kind": "console",
      "hours": 14,
      "rank": 72,
      "tags": [
        "duanyou",
        "hezuo",
        "dongzuo",
        "pingtai"
      ]
    },
    {
      "zh": {
        "name": "逃出生天",
        "time": "14h",
        "note": "单角色通关"
      },
      "en": {
        "name": "A Way Out",
        "time": "14h",
        "note": "Completed on one side"
      },
      "kind": "console",
      "hours": 14,
      "rank": 71,
      "tags": [
        "duanyou",
        "hezuo",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "Hades",
        "time": "104h",
        "note": "32 热通关"
      },
      "en": {
        "name": "Hades",
        "time": "104h",
        "note": "Cleared at 32 heat"
      },
      "kind": "console",
      "hours": 104,
      "rank": 25,
      "tags": [
        "duanyou",
        "rougu",
        "dongzuo",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "Hades II",
        "time": "54h",
        "note": "16 热通关"
      },
      "en": {
        "name": "Hades II",
        "time": "54h",
        "note": "Cleared at 16 heat"
      },
      "kind": "console",
      "hours": 54,
      "rank": 66,
      "tags": [
        "duanyou",
        "rougu",
        "dongzuo",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "土豆兄弟",
        "time": "30h",
        "note": "多职业通关"
      },
      "en": {
        "name": "Brotato",
        "time": "30h",
        "note": "Cleared with several characters"
      },
      "kind": "console",
      "hours": 30,
      "rank": 76,
      "tags": [
        "duanyou",
        "rougu",
        "shooter",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "死亡细胞",
        "time": "46h",
        "note": "通关全支线路线，Steam 成就 68"
      },
      "en": {
        "name": "Dead Cells",
        "time": "46h",
        "note": "All branch routes cleared, 68 Steam achievements"
      },
      "kind": "console",
      "hours": 46,
      "rank": 46,
      "tags": [
        "duanyou",
        "rougu",
        "dongzuo",
        "pingtai",
        "duli"
      ]
    },
    {
      "zh": {
        "name": "雨中冒险 2",
        "time": "25h",
        "note": "多关卡通关，Steam 成就 57"
      },
      "en": {
        "name": "Risk of Rain 2",
        "time": "25h",
        "note": "Cleared on multiple stages, 57 Steam achievements"
      },
      "kind": "console",
      "hours": 25,
      "rank": 64,
      "tags": [
        "duanyou",
        "rougu",
        "shooter",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "极品飞车：不羁",
        "time": "21h",
        "note": "第三尾声"
      },
      "en": {
        "name": "Need for Speed Unbound",
        "time": "21h",
        "note": "Reached the third finale"
      },
      "kind": "console",
      "hours": 21,
      "rank": 65,
      "tags": [
        "duanyou",
        "jingsu"
      ]
    },
    {
      "zh": {
        "name": "极限国度",
        "time": "33h",
        "note": "解锁全部区域赛事，声望等级 25"
      },
      "en": {
        "name": "Riders Republic",
        "time": "33h",
        "note": "All regional events unlocked, reputation level 25"
      },
      "kind": "console",
      "hours": 33,
      "rank": 81,
      "tags": [
        "duanyou",
        "jingsu",
        "daishijie"
      ]
    },
    {
      "zh": {
        "name": "健身环大冒险",
        "time": "18h",
        "note": "主线通关"
      },
      "en": {
        "name": "Ring Fit Adventure",
        "time": "18h",
        "note": "Main adventure completed"
      },
      "kind": "console",
      "hours": 18,
      "rank": 69,
      "tags": [
        "duanyou",
        "jiezou"
      ]
    },
    {
      "zh": {
        "name": "Just Dance",
        "time": "28h",
        "note": "解锁曲目 80+，成就完成率 43%"
      },
      "en": {
        "name": "Just Dance",
        "time": "28h",
        "note": "80+ songs unlocked, 43% of achievements"
      },
      "kind": "console",
      "hours": 28,
      "rank": 70,
      "tags": [
        "duanyou",
        "jiezou",
        "paidui"
      ]
    },
    {
      "zh": {
        "name": "英雄联盟",
        "time": "S2 起",
        "note": "付费 10k+，皮肤 400+，铂金分段"
      },
      "en": {
        "name": "League of Legends",
        "time": "since S2",
        "note": "Since Season 2 — ¥10k+ spent, 400+ skins, Platinum"
      },
      "kind": "console",
      "rank": 8,
      "tags": [
        "duanyou",
        "jingji",
        "changxian",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "街霸 6",
        "time": "53h",
        "note": "大世界主线通关，黄金分段桑吉尔夫"
      },
      "en": {
        "name": "Street Fighter 6",
        "time": "53h",
        "note": "World Tour completed, Gold rank on Zangief"
      },
      "kind": "console",
      "hours": 53,
      "rank": 37,
      "tags": [
        "duanyou",
        "gedou",
        "jingji"
      ]
    },
    {
      "zh": {
        "name": "胡闹厨房 2",
        "time": "12h",
        "note": "主线关卡完成度 70%+"
      },
      "en": {
        "name": "Overcooked 2",
        "time": "12h",
        "note": "70%+ of the campaign completed"
      },
      "kind": "console",
      "hours": 12,
      "rank": 60,
      "tags": [
        "duanyou",
        "hezuo",
        "paidui"
      ]
    },
    {
      "zh": {
        "name": "人类一败涂地",
        "time": "14h",
        "note": "多地图通关"
      },
      "en": {
        "name": "Human: Fall Flat",
        "time": "14h",
        "note": "Cleared on multiple maps"
      },
      "kind": "console",
      "hours": 14,
      "rank": 59,
      "tags": [
        "duanyou",
        "hezuo",
        "paidui",
        "jiemi"
      ]
    },
    {
      "zh": {
        "name": "糖豆人",
        "time": "18h",
        "note": "主线关卡通关"
      },
      "en": {
        "name": "Fall Guys",
        "time": "18h",
        "note": "Campaign levels cleared"
      },
      "kind": "console",
      "hours": 18,
      "rank": 45,
      "tags": [
        "duanyou",
        "paidui",
        "jingji"
      ]
    },
    {
      "zh": {
        "name": "Unrailed",
        "time": "18h",
        "note": "主线关卡通关"
      },
      "en": {
        "name": "Unrailed!",
        "time": "18h",
        "note": "Campaign completed"
      },
      "kind": "console",
      "hours": 18,
      "rank": 80,
      "tags": [
        "duanyou",
        "hezuo",
        "paidui"
      ]
    },
    {
      "zh": {
        "name": "全面战争模拟器",
        "time": "14h",
        "note": "解锁全部关卡"
      },
      "en": {
        "name": "Totally Accurate Battle Simulator",
        "time": "14h",
        "note": "All levels unlocked"
      },
      "kind": "console",
      "hours": 14,
      "rank": 79,
      "tags": [
        "duanyou",
        "moni",
        "paidui"
      ]
    },
    {
      "zh": {
        "name": "鹅鸭杀",
        "time": "17h",
        "note": "成就解锁率 50%"
      },
      "en": {
        "name": "Goose Goose Duck",
        "time": "17h",
        "note": "50% of achievements unlocked"
      },
      "kind": "console",
      "hours": 17,
      "rank": 77,
      "tags": [
        "duanyou",
        "paidui",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "极乐迪斯科",
        "time": "48h",
        "note": "一周目主线通关，支线完成度 80%+"
      },
      "en": {
        "name": "Disco Elysium",
        "time": "48h",
        "note": "Main story completed, 80%+ of side content"
      },
      "kind": "console",
      "hours": 48,
      "rank": 40,
      "tags": [
        "duanyou",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "Portal 传送门 1 & 2",
        "time": "52h",
        "note": "主线多周目通关"
      },
      "en": {
        "name": "Portal 1 & 2",
        "time": "52h",
        "note": "Both campaigns cleared on multiple playthroughs"
      },
      "kind": "console",
      "hours": 52,
      "rank": 34,
      "tags": [
        "duanyou",
        "jiemi",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "Doom",
        "time": "21h",
        "note": "主线任务通关"
      },
      "en": {
        "name": "Doom",
        "time": "21h",
        "note": "Campaign completed"
      },
      "kind": "console",
      "hours": 21,
      "rank": 36,
      "tags": [
        "duanyou",
        "shooter",
        "dongzuo"
      ]
    },
    {
      "zh": {
        "name": "Half-Life 2",
        "time": "33h",
        "note": "主线 + DLC 困难难度通关"
      },
      "en": {
        "name": "Half-Life 2",
        "time": "33h",
        "note": "Main game and DLC cleared on Hard"
      },
      "kind": "console",
      "hours": 33,
      "rank": 35,
      "tags": [
        "duanyou",
        "shooter",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "巫师 3",
        "time": "112h",
        "note": "主线 + 支线 + DLC 一周目通关"
      },
      "en": {
        "name": "The Witcher 3",
        "time": "112h",
        "note": "Main story, side quests and DLC completed"
      },
      "kind": "console",
      "hours": 112,
      "rank": 10,
      "tags": [
        "duanyou",
        "daishijie",
        "rpg",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "赛博朋克 2077",
        "time": "92h",
        "note": "主线 + 往日之影 DLC 通关"
      },
      "en": {
        "name": "Cyberpunk 2077",
        "time": "92h",
        "note": "Main story and Phantom Liberty completed"
      },
      "kind": "console",
      "hours": 92,
      "rank": 9,
      "tags": [
        "duanyou",
        "daishijie",
        "rpg",
        "shooter",
        "xushi"
      ]
    },
    {
      "zh": {
        "name": "雀魂",
        "time": "230h",
        "note": "付费 1k+，雀豪"
      },
      "en": {
        "name": "Mahjong Soul",
        "time": "230h",
        "note": "¥1k+ spent, Saint rank"
      },
      "kind": "console",
      "hours": 230,
      "rank": 78,
      "tags": [
        "duanyou",
        "huihe",
        "jingji",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "星之低语",
        "time": "5h",
        "note": ""
      },
      "en": {
        "name": "Whispers from the Star",
        "time": "5h",
        "note": ""
      },
      "kind": "console",
      "hours": 5,
      "tags": [
        "duanyou",
        "shouyou",
        "erciyuan",
        "xushi"
      ],
      "rank": 5
    },
    {
      "zh": {
        "name": "B-side: Olivia Lin",
        "time": "33h",
        "note": ""
      },
      "en": {
        "name": "B-side: Olivia Lin",
        "time": "33h",
        "note": ""
      },
      "kind": "console",
      "hours": 33,
      "tags": [
        "duanyou",
        "erciyuan",
        "xushi"
      ],
      "rank": 6
    },
    {
      "zh": {
        "name": "光与影：33 号远征队",
        "time": "13h",
        "note": ""
      },
      "en": {
        "name": "Clair Obscur: Expedition 33",
        "time": "13h",
        "note": ""
      },
      "kind": "console",
      "hours": 13,
      "tags": [
        "duanyou",
        "huihe",
        "rpg",
        "xushi"
      ],
      "rank": 14
    },
    {
      "zh": {
        "name": "茶杯头",
        "time": "17h",
        "note": ""
      },
      "en": {
        "name": "Cuphead",
        "time": "17h",
        "note": ""
      },
      "kind": "console",
      "hours": 17,
      "tags": [
        "duanyou",
        "dongzuo",
        "shooter",
        "hezuo",
        "duli"
      ],
      "rank": 21
    },
    {
      "zh": {
        "name": "火山的女儿",
        "time": "10h",
        "note": ""
      },
      "en": {
        "name": "Volcano Princess",
        "time": "10h",
        "note": ""
      },
      "kind": "console",
      "hours": 10,
      "tags": [
        "duanyou",
        "erciyuan",
        "moni",
        "xushi"
      ],
      "rank": 82
    },
    {
      "zh": {
        "name": "苏丹的游戏",
        "time": "15h",
        "note": ""
      },
      "en": {
        "name": "Sultan's Game",
        "time": "15h",
        "note": ""
      },
      "kind": "console",
      "hours": 15,
      "tags": [
        "duanyou",
        "kapai",
        "xushi",
        "celue",
        "duli"
      ],
      "rank": 58
    },
    {
      "zh": {
        "name": "逆转裁判 & 检察官系列",
        "time": "100h",
        "note": ""
      },
      "en": {
        "name": "Ace Attorney & Investigations series",
        "time": "100h",
        "note": ""
      },
      "kind": "console",
      "hours": 100,
      "tags": [
        "duanyou",
        "jiemi",
        "xushi"
      ],
      "rank": 26
    },
    {
      "zh": {
        "name": "杀戮尖塔 2",
        "time": "150h",
        "note": "全职业 a10 通关"
      },
      "en": {
        "name": "Slay the Spire 2",
        "time": "150h",
        "note": "Cleared A10 with every character"
      },
      "kind": "console",
      "hours": 150,
      "tags": [
        "duanyou",
        "kapai",
        "rougu",
        "huihe",
        "celue",
        "duli"
      ],
      "rank": 42
    }
  ],
  "mobile": [
    {
      "zh": {
        "name": "崩坏：星穹铁道",
        "time": "3 年+",
        "note": "付费 10k+，全勤 60 级，两次美术集，曾参与封闭测试"
      },
      "en": {
        "name": "Honkai: Star Rail",
        "time": "3+ yrs",
        "note": "3+ years — ¥10k+ spent, daily-active at level 60, two art books, took part in closed beta"
      },
      "kind": "mobile",
      "months": 36,
      "rank": 1,
      "tags": [
        "shouyou",
        "erciyuan",
        "huihe",
        "rpg",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "绝区零",
        "time": "1 年+",
        "note": "付费 3k，59 级，绝境 1 星"
      },
      "en": {
        "name": "Zenless Zone Zero",
        "time": "1+ yr",
        "note": "1+ year — ¥3k spent, level 59, Hollow Zero tier 1"
      },
      "kind": "mobile",
      "months": 12,
      "rank": 3,
      "tags": [
        "shouyou",
        "erciyuan",
        "dongzuo",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "原神",
        "time": "4 年+",
        "note": "付费 10k，60 级，成就 1100+，纳塔前地图探索度 96%"
      },
      "en": {
        "name": "Genshin Impact",
        "time": "4+ yrs",
        "note": "4+ years — ¥10k spent, AR 60, 1100+ achievements, 96% map exploration up to Natlan"
      },
      "kind": "mobile",
      "months": 48,
      "rank": 2,
      "tags": [
        "shouyou",
        "erciyuan",
        "daishijie",
        "dongzuo",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "崩坏 3",
        "time": "1 年+",
        "note": "付费 5k，82 级，主线全通"
      },
      "en": {
        "name": "Honkai Impact 3rd",
        "time": "1+ yr",
        "note": "1+ year — ¥5k spent, level 82, full main story"
      },
      "kind": "mobile",
      "months": 12,
      "rank": 4,
      "tags": [
        "shouyou",
        "erciyuan",
        "dongzuo",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "P5X",
        "time": "1 年",
        "note": "付费 2k，超我等级 42 级，七等星"
      },
      "en": {
        "name": "Persona 5: The Phantom X",
        "time": "1 yr",
        "note": "1 year — ¥2k spent, ego level 42, seven-star"
      },
      "kind": "mobile",
      "months": 12,
      "rank": 63,
      "tags": [
        "shouyou",
        "erciyuan",
        "huihe",
        "rpg",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "鸣潮",
        "time": "1 月",
        "note": "付费 500"
      },
      "en": {
        "name": "Wuthering Waves",
        "time": "1 mo",
        "note": "1 month — ¥500 spent"
      },
      "kind": "mobile",
      "months": 1,
      "rank": 47,
      "tags": [
        "shouyou",
        "erciyuan",
        "daishijie",
        "dongzuo",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "明日方舟",
        "time": "3 年+",
        "note": "付费 5k+，120 级，肉鸽 15 通关"
      },
      "en": {
        "name": "Arknights",
        "time": "3+ yrs",
        "note": "3+ years — ¥5k+ spent, level 120, Integrated Strategies 15 cleared"
      },
      "kind": "mobile",
      "months": 36,
      "rank": 30,
      "tags": [
        "shouyou",
        "erciyuan",
        "celue",
        "rougu",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "尘白禁区",
        "time": "1 年",
        "note": "付费 1.8k，100 级，全图鉴"
      },
      "en": {
        "name": "Snowbreak: Containment Zone",
        "time": "1 yr",
        "note": "1 year — ¥1.8k spent, level 100, full collection"
      },
      "kind": "mobile",
      "months": 12,
      "rank": 84,
      "tags": [
        "shouyou",
        "erciyuan",
        "shooter",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "FGO",
        "time": "8 年",
        "note": "付费 10k，150 级，主线全通"
      },
      "en": {
        "name": "Fate/Grand Order",
        "time": "8 yrs",
        "note": "8 years — ¥10k spent, level 150, full main story"
      },
      "kind": "mobile",
      "months": 96,
      "rank": 32,
      "tags": [
        "shouyou",
        "erciyuan",
        "huihe",
        "kapai",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "阴阳师",
        "time": "3 年+",
        "note": "付费 2k，60 级，全图鉴，斗技 10 星"
      },
      "en": {
        "name": "Onmyoji",
        "time": "3+ yrs",
        "note": "3+ years — ¥2k spent, level 60, full collection, 10-star arena"
      },
      "kind": "mobile",
      "months": 36,
      "rank": 51,
      "tags": [
        "shouyou",
        "erciyuan",
        "huihe",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "无期迷途",
        "time": "6 月",
        "note": "付费 2k+，主线通关，暗域毕业"
      },
      "en": {
        "name": "Path to Nowhere",
        "time": "6 mo",
        "note": "6 months — ¥2k+ spent, main story cleared, endgame built"
      },
      "kind": "mobile",
      "months": 6,
      "rank": 85,
      "tags": [
        "shouyou",
        "erciyuan",
        "celue",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "胜利女神：妮姬",
        "time": "3 月",
        "note": "付费 500，12 章主线通关，角色 200 级"
      },
      "en": {
        "name": "Goddess of Victory: Nikke",
        "time": "3 mo",
        "note": "3 months — ¥500 spent, chapter 12 cleared, characters at level 200"
      },
      "kind": "mobile",
      "months": 3,
      "rank": 62,
      "tags": [
        "shouyou",
        "erciyuan",
        "shooter",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "灵魂潮汐",
        "time": "6 月",
        "note": "付费 800，88 级，深渊 50 层"
      },
      "en": {
        "name": "Soul Tide",
        "time": "6 mo",
        "note": "6 months — ¥800 spent, level 88, abyss floor 50"
      },
      "kind": "mobile",
      "months": 6,
      "rank": 87,
      "tags": [
        "shouyou",
        "erciyuan",
        "rpg",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "少女前线：云图计划",
        "time": "3 月",
        "note": "付费 200，61 级，主线第九章通关"
      },
      "en": {
        "name": "Girls' Frontline: Neural Cloud",
        "time": "3 mo",
        "note": "3 months — ¥200 spent, level 61, chapter 9 cleared"
      },
      "kind": "mobile",
      "months": 3,
      "rank": 86,
      "tags": [
        "shouyou",
        "erciyuan",
        "rougu",
        "celue",
        "choka",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "第五人格",
        "time": "2 月",
        "note": "付费 300，41 级，三阶"
      },
      "en": {
        "name": "Identity V",
        "time": "2 mo",
        "note": "2 months — ¥300 spent, level 41, tier 3"
      },
      "kind": "mobile",
      "months": 2,
      "rank": 53,
      "tags": [
        "shouyou",
        "erciyuan",
        "jingji",
        "hezuo",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "阴阳师：百闻牌",
        "time": "3 月",
        "note": "付费 800，37 级，天梯六段"
      },
      "en": {
        "name": "Onmyoji: The Card Game",
        "time": "3 mo",
        "note": "3 months — ¥800 spent, level 37, rank 6"
      },
      "kind": "mobile",
      "months": 3,
      "rank": 89,
      "tags": [
        "shouyou",
        "erciyuan",
        "kapai",
        "choka",
        "jingji"
      ]
    },
    {
      "zh": {
        "name": "剑与远征：启程",
        "time": "3 月",
        "note": "付费 300，450 级，战力 4kw"
      },
      "en": {
        "name": "AFK Journey",
        "time": "3 mo",
        "note": "3 months — ¥300 spent, level 450, 40M power"
      },
      "kind": "mobile",
      "months": 3,
      "rank": 83,
      "tags": [
        "shouyou",
        "choka",
        "changxian",
        "celue",
        "daishijie"
      ]
    },
    {
      "zh": {
        "name": "金铲铲之战",
        "time": "1 年+",
        "note": "付费 1k+，大师段位"
      },
      "en": {
        "name": "TFT Mobile (金铲铲之战)",
        "time": "1+ yr",
        "note": "1+ year — ¥1k+ spent, Master rank"
      },
      "kind": "mobile",
      "months": 12,
      "rank": 54,
      "tags": [
        "shouyou",
        "zizouqi",
        "jingji",
        "celue",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "王者荣耀",
        "time": "3 年+",
        "note": "付费 5k，排位星耀"
      },
      "en": {
        "name": "Honor of Kings",
        "time": "3+ yrs",
        "note": "3+ years — ¥5k spent, Glory rank"
      },
      "kind": "mobile",
      "months": 36,
      "rank": 12,
      "tags": [
        "shouyou",
        "jingji",
        "changxian",
        "hezuo"
      ]
    },
    {
      "zh": {
        "name": "哈利波特：魔法觉醒",
        "time": "3 月",
        "note": "付费 1k+，58 级，第三学年任务通关，史诗决斗家"
      },
      "en": {
        "name": "Harry Potter: Magic Awakened",
        "time": "3 mo",
        "note": "3 months — ¥1k+ spent, level 58, year 3 cleared, Epic Duellist"
      },
      "kind": "mobile",
      "months": 3,
      "rank": 61,
      "tags": [
        "shouyou",
        "kapai",
        "choka",
        "jingji",
        "changxian"
      ]
    },
    {
      "zh": {
        "name": "异环",
        "time": "2 月",
        "note": "付费 300，50 级"
      },
      "en": {
        "name": "Neverness to Everness",
        "time": "2 mo",
        "note": "2 months — ¥300 spent, level 50"
      },
      "kind": "mobile",
      "months": 2,
      "tags": [
        "shouyou",
        "erciyuan",
        "daishijie",
        "dongzuo",
        "choka",
        "changxian"
      ],
      "rank": 48
    },
    {
      "zh": {
        "name": "重返未来：1999",
        "time": "1 月",
        "note": "付费 100"
      },
      "en": {
        "name": "Reverse: 1999",
        "time": "1 mo",
        "note": "1 month — ¥100 spent"
      },
      "kind": "mobile",
      "months": 1,
      "tags": [
        "shouyou",
        "erciyuan",
        "huihe",
        "kapai",
        "choka",
        "changxian",
        "celue"
      ],
      "rank": 52
    },
    {
      "zh": {
        "name": "洛克王国世界",
        "time": "2 月",
        "note": "付费 500，PvP S1 / S2 大师"
      },
      "en": {
        "name": "Roco Kingdom: World",
        "time": "2 mo",
        "note": "2 months — ¥500 spent, PvP Master in S1 and S2"
      },
      "kind": "mobile",
      "months": 2,
      "tags": [
        "shouyou",
        "huihe",
        "daishijie",
        "jingji",
        "changxian"
      ],
      "rank": 75
    },
    {
      "zh": {
        "name": "卡厄思梦境",
        "time": "2 月",
        "note": "付费 300，53 级，满命海德玛丽"
      },
      "en": {
        "name": "Chaos Dreamscape (卡厄思梦境)",
        "time": "2 mo",
        "note": "2 months — ¥300 spent, level 53, Hedvig at max constellation"
      },
      "kind": "mobile",
      "months": 2,
      "tags": [
        "shouyou",
        "erciyuan",
        "choka",
        "changxian"
      ],
      "rank": 88
    },
    {
      "zh": {
        "name": "明日方舟：终末地",
        "time": "2 月",
        "note": "付费 1k+"
      },
      "en": {
        "name": "Arknights: Endfield",
        "time": "2 mo",
        "note": "2 months — ¥1k+ spent"
      },
      "kind": "mobile",
      "months": 2,
      "tags": [
        "shouyou",
        "duanyou",
        "erciyuan",
        "daishijie",
        "dongzuo",
        "moni",
        "choka",
        "changxian"
      ],
      "rank": 31
    }
  ]
};
