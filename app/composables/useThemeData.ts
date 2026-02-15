/**
 * 主題分類數據和工具函數
 * 用於詞條的三級分類系統
 */

export interface Level1Theme {
  id: number
  name: string
  chineseNum: string // 一、二、三...
}

export interface Level2Theme {
  id: number // 計算得出：500 + L1_ID * 10 + letterIndex (A=1, B=2, ...)
  letter: string
  name: string // 描述性名稱，如 "人稱、指代"
  level1Id: number
}

export interface Level3Theme {
  id: number
  name: string
  code: string // 如 "A1", "B2"
  level1Id: number
  level2Id: number
  level1Name: string
  level2Name: string
}

export interface ThemeWithPath {
  id: number
  name: string
  level: 1 | 2 | 3
  path: string // 完整路徑，如 "人物 > 人稱、指代 > 人稱、指代"
  level1Name: string
  level2Name: string
  level3Name: string
  level1Id: number
  level2Id: number
  level3Id: number
}

// 中文數字映射
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11
}

// 字母到數字的映射（用於生成 L2 ID）
const LETTER_TO_NUMBER: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
  'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
  'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15,
  'P': 16, 'Q': 17, 'R': 18, 'S': 19, 'T': 20,
  'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26
}

// 生成 L2 ID：500 + L1_ID * 10 + letterIndex
// 例如：L1=1 (人物), letter=A → 500 + 1*10 + 1 = 511
function generateLevel2Id(level1Id: number, letter: string): number {
  const letterIndex = LETTER_TO_NUMBER[letter] || 1
  return 500 + level1Id * 10 + letterIndex
}

// 一級主題列表
const LEVEL1_THEMES: Level1Theme[] = [
  { id: 1, name: '人物', chineseNum: '一' },
  { id: 2, name: '自然界及場地', chineseNum: '二' },
  { id: 3, name: '物品用具', chineseNum: '三' },
  { id: 4, name: '時間空間', chineseNum: '四' },
  { id: 5, name: '心理活動', chineseNum: '五' },
  { id: 6, name: '動作行為', chineseNum: '六' },
  { id: 7, name: '社會活動', chineseNum: '七' },
  { id: 8, name: '抽象事物', chineseNum: '八' },
  { id: 9, name: '形容描述', chineseNum: '九' },
  { id: 10, name: '數量詞語', chineseNum: '十' },
  { id: 11, name: '語氣助詞', chineseNum: '十一' }
]

// ID 範圍到一級主題的映射
const ID_RANGE_TO_LEVEL1: Array<{ start: number; end: number; level1Id: number; level1Name: string }> = [
  { start: 60, end: 100, level1Id: 1, level1Name: '人物' },
  { start: 101, end: 148, level1Id: 2, level1Name: '自然界及場地' },
  { start: 149, end: 204, level1Id: 3, level1Name: '物品用具' },
  { start: 205, end: 223, level1Id: 4, level1Name: '時間空間' },
  { start: 224, end: 260, level1Id: 5, level1Name: '心理活動' },
  { start: 261, end: 285, level1Id: 6, level1Name: '動作行為' },
  { start: 286, end: 367, level1Id: 7, level1Name: '社會活動' },
  { start: 368, end: 385, level1Id: 8, level1Name: '抽象事物' },
  { start: 386, end: 471, level1Id: 9, level1Name: '形容描述' },
  { start: 472, end: 489, level1Id: 10, level1Name: '數量詞語' },
  { start: 490, end: 498, level1Id: 11, level1Name: '語氣助詞' }
]

// 根據 ID 獲取一級主題信息
function getLevel1ById(id: number): { level1Id: number; level1Name: string } | null {
  for (const range of ID_RANGE_TO_LEVEL1) {
    if (id >= range.start && id <= range.end) {
      return { level1Id: range.level1Id, level1Name: range.level1Name }
    }
  }
  return null
}

// 解析主題字符串，提取 ID 和名稱
function parseThemeEntry(entry: string): { id: number; name: string } | null {
  const match = entry.match(/^(\d+):\s*(.+)$/)
  if (match) {
    return { id: parseInt(match[1], 10), name: match[2].trim() }
  }
  return null
}

// 從名稱中提取中文數字（一級分類）
function extractChineseNumber(name: string): string {
  const match = name.match(/^([一二三四五六七八九十]+)/)
  return match ? match[1] : ''
}

// 從名稱中提取二級分類字母
function extractLevel2Letter(name: string): string {
  const match = name.match(/^[一二三四五六七八九十]+([A-Z])/)
  return match ? match[1] : ''
}

// 從名稱中提取二級分類完整代碼（如 "A1"）
function extractLevel2Code(name: string): string {
  const match = name.match(/^[一二三四五六七八九十]+([A-Z]\d+)/)
  return match ? match[1] : ''
}

// 從名稱中提取三級分類描述（去掉前綴）
function extractLevel3Description(name: string): string {
  const match = name.match(/^[一二三四五六七八九十]+[A-Z]\d+(.+)$/)
  return match ? match[1].trim() : name
}

// 主題列表字符串
const THEME_LIST_RAW = `
60: 一A1人稱、指代, 61: 一A2一般指稱、尊稱, 62: 一A3詈稱、貶稱
63: 一B1孩子、男孩子、青少年, 64: 一B2女孩子、女青年, 65: 一B3成年人、成年男性, 66: 一B4成年女性
67: 一C1父母輩, 68: 一C2祖輩、曾祖輩, 69: 一C3同輩, 70: 一C4後輩, 71: 一C5家人合稱, 72: 一C6其他
73: 一D1各種體形的人, 74: 一D2各種外貌的人, 75: 一D3各種身體狀況的人, 76: 一D4各種精神狀態的人, 77: 一D5其他
78: 一E1東家、僱工、顧客, 79: 一E2朋友、合作者、鄰裏、情人、婚嫁人物, 80: 一E3能人、內行人、有權勢者
81: 一E4不幸者、尷尬者、生手, 82: 一E5鰥寡孤獨, 83: 一E6外地人、海外華人, 84: 一E7外國人, 85: 一E8其他
86: 一F1工人、機械人員, 87: 一F2農民, 88: 一F3軍人、員警兵士, 89: 一F4教育、文藝、體育界人員
90: 一F5商人、服務人員, 91: 一F6無正當職業者, 92: 一F7其他
93: 一G1好人, 94: 一G2聰明人、老成人, 95: 一G3各種性格的人, 96: 一G4愚笨的人、糊塗的人
97: 一G5蠻橫的人、難調教的人, 98: 一G6有各種不良習氣的人, 99: 一G7壞人、品質差的人, 100: 一G8其他
101: 二A1日、月、星、雲, 102: 二A2地貌、水文、泥土、石頭, 103: 二A3氣象、氣候
104: 二A4灰塵、污跡、霧氣、氣味, 105: 二A5水、水泡、火、火灰, 106: 二A6其他
107: 二B1頭頸部, 108: 二B2五官、口腔、咽喉部, 109: 二B3軀體, 110: 二B4四肢
111: 二B5排泄物、分泌物, 112: 二B6其他
113: 二C1生與死, 114: 二C2年少、年老, 115: 二C3性交、懷孕、生育, 116: 二C4餓、飽、渴、饞
117: 二C5睏、睡、醉、醒, 118: 二C6呼吸, 119: 二C7感覺, 120: 二C8排泄
121: 二C9健康、力大、體弱、患病、痊癒, 122: 二C10症狀, 123: 二C11損傷、疤痕
124: 二C12體表疾患, 125: 二C13體內疾患, 126: 二C14精神病, 127: 二C15殘疾、生理缺陷, 128: 二C16其他
129: 二D1與動物有關的名物, 130: 二D2動物的動作和生理現象, 131: 二D3家畜、家禽、狗、貓
132: 二D4獸類、鼠類、野生食草動物, 133: 二D5鳥類, 134: 二D6蟲類, 135: 二D7爬行類
136: 二D8兩棲類, 137: 二D9淡水魚類, 138: 二D10海水魚類, 139: 二D11蝦、蟹
140: 二D12軟體動物、腔腸動物
141: 二E1與植物有關的名物和現象, 142: 二E2穀物, 143: 二E3水果、乾果, 144: 二E4莖葉類蔬菜
145: 二E5瓜類、豆類、茄果類食用植物, 146: 二E6塊莖類食用植物, 147: 二E7花、草、竹、樹, 148: 二E8其他
149: 三A1衣、褲、裙, 150: 三A2其他衣物、鞋、帽, 151: 三A3衣物各部位及有關名稱, 152: 三A4牀上用品
153: 三A5飾物、化妝品, 154: 三A6鐘錶、眼鏡、照相器材, 155: 三A7紙類
156: 三A8自行車及其零部件、有關用具, 157: 三A9衞生和清潔用品、用具
158: 三A10一般器皿、盛器、盛具, 159: 三A11廚具、食具、茶具, 160: 三A12燃具、燃料
161: 三A13傢俱及有關器物, 162: 三A14家用電器、音響設備, 163: 三A15用電設施、水暖設施
164: 三A16文具、書報, 165: 三A17通郵、電訊用品, 166: 三A18其他日用品, 167: 三A19娛樂品、玩具
168: 三A20喜慶用品, 169: 三A21喪葬品、祭奠品、喪葬場所, 170: 三A22煙、毒品
171: 三A23證明文件等, 172: 三A24貨幣, 173: 三A25住宅, 174: 三A26廢棄物
175: 三B1畜肉, 176: 三B2禽肉、水產品肉類, 177: 三B3米、素食的半製成品
178: 三B4葷食的半製成品, 179: 三B5飯食, 180: 三B6菜餚, 181: 三B7中式點心
182: 三B8西式點心, 183: 三B9調味品、食品添加劑, 184: 三B10飲料, 185: 三B11零食、小吃
186: 三C1一般工具, 187: 三C2金屬、塑膠、橡膠、石油製品, 188: 三C3機器及零件等, 189: 三C4其他
190: 三D1農副業、水利設施及用品, 191: 三D2車輛及其部件, 192: 三D3船隻及其部件、飛機
193: 三D4交通設施, 194: 三D5建築用具、材料及場所, 195: 三D6建築物及其構件
196: 三D7布料、製衣用具, 197: 三D8傢俱製造用料, 198: 三D9體育用品、樂器
199: 三D10醫療設施、藥物、場所, 200: 三D11商店、交易場所、商業用品
201: 三D12飲食、服務、娛樂場所及用品, 202: 三D13軍警裝備及設施、民用槍械
203: 三D14其他生產用品與產品, 204: 三D15其他器物及場所
205: 四A1以前、現在、以後, 206: 四A2最初、剛才、後來, 207: 四A3白天、晚上
208: 四A4昨天、今天、明天, 209: 四A5去年、今年、明年, 210: 四A6時節、時令
211: 四A7時刻、時段, 212: 四A8這時、那時、早些時, 213: 四A9其他
214: 四B1地方、處所、位置、方位, 215: 四B2上下、底面, 216: 四B3前後左右、旁邊、中間、附近
217: 四B4內外, 218: 四B5排列位置, 219: 四B6到處, 220: 四B7邊角孔縫
221: 四B8地段, 222: 四B9地區, 223: 四B10其他
224: 五A1高興、興奮、安心, 225: 五A2憂愁、憋氣、頭痛、操心, 226: 五A3生氣、煩躁
227: 五A4害怕、害羞, 228: 五A5鎮定、緊張、著急, 229: 五A6掛念、擔心、放心, 230: 五A7其他
231: 五B1思考、回憶, 232: 五B2猜想、估計, 233: 五B3低估、輕視、誤會、想不到
234: 五B4專心、留意、小心, 235: 五B5分心、不留意、無心, 236: 五B6喜歡、心疼、憎惡、忌諱
237: 五B7願意、盼望、羨慕、妒忌、打算、故意, 238: 五B8有耐心、下決心、沒耐心、猶豫
239: 五B9服氣、不服氣、後悔、無悔, 240: 五B10知道、明白、懂得、領悟
241: 五B11不知道、糊塗、閉塞, 242: 五B12膽大、膽小, 243: 五B13其他
244: 五C1和善、爽朗, 245: 五C2軟弱、小氣、慢性子, 246: 五C3脾氣壞、倔強、固執、淘氣
247: 五C4愛多事、嘮叨、挑剔, 248: 五C5文靜、內向, 249: 五C6其他
250: 五D1善良、忠厚、講信用、高貴, 251: 五D2勤奮、懂事、老成, 252: 五D3不懂事、健忘、粗心
253: 五D4高傲、輕浮, 254: 五D5自私、吝嗇、貪心、懶惰, 255: 五D6奸詐、缺德、負義、下賤、淫蕩
256: 五D7蠻橫、粗野, 257: 五E1有文化、聰明、能幹、狡猾、滑頭, 258: 五E2愚笨、無能、見識少
259: 五E3會説不會做, 260: 五E4其他
261: 六A1泛指的運動, 262: 六A2趨向運動, 263: 六A3液體的運動, 264: 六A4搖擺、晃動、抖動
265: 六A5轉動、滾動, 266: 六A6掉下、滑下、塌下, 267: 六A7其他
268: 六B1軀幹部位動作, 269: 六B2全身動作, 270: 六B3頭部動作, 271: 六B4被動性動作、發抖
272: 六C1眼部動作, 273: 六C2嘴部動作、鼻部動作
274: 六D1拿、抓、提等, 275: 六D2推、拉、按、託、捏等, 276: 六D3扔、搖、翻開、抖開等
277: 六D4捶、敲、抽打等, 278: 六D5放、壘、墊、塞等, 279: 六D6揭、摺、撕、揉、挖等
280: 六D7裝、蓋、綁、聯結等, 281: 六D8砍、削、戳、碾等, 282: 六D9洗、舀、倒、拌等
283: 六D10其他手部動作, 284: 六D11腿部動作, 285: 六D12其他
286: 七A1過日子, 287: 七A2做事、擺弄、料理、安排, 288: 七A3領頭、主管、負責
289: 七A4完成、收尾, 290: 七A5成功、走運、碰運氣, 291: 七A6得益、漁利
292: 七A7失敗、出錯、失機、觸黴頭, 293: 七A8白費勁、自找麻煩、沒辦法
294: 七A9退縮、轉向、躲懶、過關, 295: 七A10給予、取要、挑選、使用、處置
296: 七A11收存、收拾、遺失、尋找, 297: 七A12阻礙、佔據、分隔
298: 七A13湊聚、併合、摻和, 299: 七A14排隊、插隊、圍攏、躲藏
300: 七A15走動、離開、跟隨, 301: 七A16節約、浪費、時興、過時
302: 七A17稱、量、計算, 303: 七A18寫、塗, 304: 七A19笑、開玩笑、哭、歎息, 305: 七A20其他
306: 七B1起卧、洗漱、穿著、脱衣, 307: 七B2烹調、購買食品, 308: 七B3飲食
309: 七B4帶孩子、刷洗縫補、室內事務, 310: 七B5生火、烤、燻、淬火
311: 七B6上街、迷路、遷徙、旅行, 312: 七B7錢款進出, 313: 七B8遊戲、娛樂
314: 七B9下棋、打牌, 315: 七B10戀愛、戀愛失敗, 316: 七B11婚嫁、其他喜事
317: 七B12喪俗、舊俗、迷信活動、尋死, 318: 七B13其他
319: 七C1説話、談話, 320: 七C2告訴、留話、吩咐、聽説, 321: 七C3不説話、支吾、私語
322: 七C4能説會道、誇口、學舌, 323: 七C5稱讚、貶損、挖苦、戲弄
324: 七C6斥責、爭吵、爭論、費口舌, 325: 七C7嘮叨、多嘴, 326: 七C8發牢騷、吵鬧、叫喊
327: 七C9説粗話, 328: 七C10説謊、捏造, 329: 七C11其他
330: 七D1工作、掙錢、辭退, 331: 七D2工業、建築、木工, 332: 七D3農副業
333: 七D4交通、電訊, 334: 七D5商業, 335: 七D6服務行業, 336: 七D7與商業、服務等行業有關的現象
337: 七D8醫療, 338: 七D9教育、文化、新聞, 339: 七D10體育, 340: 七D11治安、執法, 341: 七D12其他
342: 七E1相處、交好, 343: 七E2商量、邀約, 344: 七E3合作、拉線、散夥
345: 七E4幫忙、施惠, 346: 七E5請求、督促、逼迫、支使, 347: 七E6守護、監視、査驗
348: 七E7過問、聽任、容許、同意, 349: 七E8寵愛、遷就、撫慰
350: 七E9討好、得罪、走門路, 351: 七E10炫耀、擺架子、謙遜、拜下風
352: 七E11揭露、通消息, 353: 七E12責怪、激怒、翻臉, 354: 七E13做錯事、受責、丟臉
355: 七E14爭鬥、較量, 356: 七E15打擊、揭短、嚇唬、驅趕, 357: 七E16欺負、霸道
358: 七E17為難、捉弄、薄待, 359: 七E18出賣、使上當、陷害
360: 七E19瞞騙、假裝、藉口, 361: 七E20拖累、妨害、胡鬧、搬弄是非
362: 七E21蒙冤、上當、受氣、被迫, 363: 七E22發脾氣、撒野、撒嬌、耍賴
364: 七E23打架、打人、勸架, 365: 七E24不良行為、犯罪活動
366: 七E25禮貌用語、客套用語、祝願用語, 367: 七E26其他
368: 八A1事情、案件、關係、原因, 369: 八A2形勢、境況、資訊, 370: 八A3嫌隙、冤仇、把柄
371: 八A4命運、運氣、利益、福禍, 372: 八A5款式、條紋、形狀, 373: 八A6姿勢、舉動、相貌
374: 八A7力量, 375: 八A8附：一般事物、這、那、甚麼, 376: 八A9其他
377: 八B1想法、脾氣、態度、品行, 378: 八B2本領、能力、技藝、素質
379: 八B3計策、辦法、把握, 380: 八C1工作、行當、規矩、事務
381: 八C2收入、費用、財產、錢款, 382: 八C3文化、娛樂、衞生
383: 八C4情面、門路, 384: 八C5語言、文字, 385: 八C6其他
386: 九A1大、小、粗、細, 387: 九A2長、短、高、矮、厚、薄, 388: 九A3寬、窄
389: 九A4直、曲, 390: 九A5豎、斜、陡、正、歪, 391: 九A6尖利、禿鈍
392: 九A7齊平、光滑、粗糙、凹凸、皺, 393: 九A8胖、壯、臃腫、瘦, 394: 九A9其他形狀
395: 九A10亮、清晰、暗、模糊, 396: 九A11顏色, 397: 九A12鮮艷、奪目、樸素、暗淡
398: 九A13美、精緻、難看, 399: 九A14新、舊, 400: 九A15表情、臉色、相貌
401: 九B1冷、涼、暖、熱、燙, 402: 九B2乾燥、潮濕、多水, 403: 九B3稠、濃、黏、稀
404: 九B4硬、結實、軟、韌、脆, 405: 九B5空、通、漏、堵塞、封閉
406: 九B6密、滿、擠、緊、疏、鬆, 407: 九B7整齊、均勻、吻合、亂、不相配
408: 九B8穩定、不穩、顛簸, 409: 九B9零碎、潦草、骯髒, 410: 九B10破損、破爛、脱落
411: 九B11腐爛、發黴、褪色, 412: 九B12壓、硌、絆、卡、礙、累贅
413: 九B13顛倒、反扣, 414: 九B14相連、糾結、吊、垂, 415: 九B15裸露、遮蓋
416: 九B16淹、沉、浮、洇、凝, 417: 九B17遠、近, 418: 九B18多、少
419: 九B19重、輕, 420: 九B20氣味, 421: 九B21味道, 422: 九B22可口、難吃、味濃、味淡, 423: 九B23其他
424: 九C1妥當、順利、得志、吉利、好運, 425: 九C2不利、失敗、嚴峻、緊急
426: 九C3倒楣、糟糕、運氣差, 427: 九C4狼狽、有麻煩、淒慘、可憐
428: 九C5舒服、富有、辛苦、貧窮, 429: 九C6洋氣、派頭、土氣、寒磣
430: 九C7繁忙、空閒, 431: 九C8手快、匆忙、緊張、手慢、悠遊
432: 九C9熟悉、生疏、坦率、露骨, 433: 九C10和睦、合得來、不和、合不來
434: 九C11合算、不合算, 435: 九C12有條理、沒條理、馬虎、隨便、離譜
436: 九C13兇狠、可厭, 437: 九C14其他
438: 九D1好、水準高、比得上, 439: 九D2不好、水準低、中等、差得遠
440: 九D3真實、虛假、正確、謬誤, 441: 九D4頂用、好用、無用、禁得起、禁不起
442: 九D5變化、不變、有關、無關, 443: 九D6增加、減少、沒有、不充足、欠缺
444: 九D7能夠、不行、有望、無望、有收益、無收益, 445: 九D8到時、過點、來得及、來不及
446: 九D9困難、危險、可怕、容易、淺顯, 447: 九D10奇怪、無端、難怪
448: 九D11有趣、滑稽、枯燥, 449: 九D12嘈雜、聲音大、靜、聲音小
450: 九D13熱鬧、排場、冷清、偏僻, 451: 九D14早、遲、久、暫、快、慢
452: 九D15厲害、很、過分、最、更、甚至, 453: 九D16稍微、有點、差不多、幾乎
454: 九D17經常、不斷、總是、長期、一向、動輒, 455: 九D18不時、間或、偶然、又、再、重新
456: 九D19極度、勉強、儘量、直接, 457: 九D20肯定、也還、應該、千萬
458: 九D21全部、一同、也都、獨自、雙方, 459: 九D22正在、起來、下去、已經、曾經
460: 九D23剛剛、待會兒、將要、立刻、突然、碰巧, 461: 九D24終於、預先、臨時、暫且、再説、幸好
462: 九D25和、或者、要麼、不然、衹好, 463: 九D26然後、接著、才、於是、至於
464: 九D27不但、而且、且不説, 465: 九D28因為、所以、既然、反正、為了、免得
466: 九D29如果、無論、那麼、除了, 467: 九D30固然、但是、不過、反而、還
468: 九D31是、像、可能、原本、實際上、在, 469: 九D32不、不是、不要、不必、不曾
470: 九D33這樣、那樣、怎樣、為甚麼、難道, 471: 九D34其他
472: 十A1數目, 473: 十A2概數、成數
474: 十B1人的計量單位, 475: 十B2動植物的計量單位, 476: 十B3人體部位等的計量單位
477: 十C1不同組成的物體的量, 478: 十C2不同形狀的物體的量, 479: 十C3不同排列的物體的量
480: 十C4分類的物品的量, 481: 十C5食物的量, 482: 十C6某些特定用品、物品的量, 483: 十C7其他
484: 十D1貨幣單位, 485: 十D2度量衡單位
486: 十E1時間的量, 487: 十E2空間、長度的量
488: 十F1抽象事物的量, 489: 十F2動作的量
490: 十一A1用在句末表示敍述、肯定等的語氣詞, 491: 十一A2用在句末表示問話的語氣詞
492: 十一A3單獨使用的表語氣詞語, 493: 十一B1自然界的聲音, 494: 十一B2人發出的聲音
495: 十一B3人造成的聲音, 496: 十一C1口頭禪、慣用語, 497: 十一C2歇後語, 498: 十一C3諺語
`

interface ParsedData {
  level1Themes: Level1Theme[]
  level2Themes: Level2Theme[]
  level3Themes: Level3Theme[]
  themeMap: Map<number, ThemeWithPath>
}

// 解析所有主題並構建完整數據結構
function parseAllThemes(): ParsedData {
  const level2Map = new Map<number, Level2Theme>() // key: level2Id (number)
  const level3List: Level3Theme[] = []
  const themeMap = new Map<number, ThemeWithPath>()

  const entries = THEME_LIST_RAW.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .flatMap(line => line.split(',').map(e => e.trim()))
    .filter(e => e.match(/^\d+:/))

  // 第一遍：收集所有 L2 分組和 L3 主題
  for (const entry of entries) {
    const parsed = parseThemeEntry(entry)
    if (!parsed) continue

    const level1Info = getLevel1ById(parsed.id)
    if (!level1Info) continue

    const letter = extractLevel2Letter(parsed.name)
    const code = extractLevel2Code(parsed.name)
    const description = extractLevel3Description(parsed.name)
    const level2Id = generateLevel2Id(level1Info.level1Id, letter)

    // 收集 L2 分組（使用第一個條目的描述作為名稱）
    if (!level2Map.has(level2Id)) {
      level2Map.set(level2Id, {
        id: level2Id,
        letter: letter,
        name: description, // 使用該分組第一個條目的描述作為 L2 名稱
        level1Id: level1Info.level1Id
      })
    }

    // 收集 L3 主題
    const l3Theme: Level3Theme = {
      id: parsed.id,
      name: description,
      code: code,
      level1Id: level1Info.level1Id,
      level2Id: level2Id,
      level1Name: level1Info.level1Name,
      level2Name: level2Map.get(level2Id)!.name
    }
    level3List.push(l3Theme)

    // 構建完整的 ThemeWithPath
    themeMap.set(parsed.id, {
      id: parsed.id,
      name: description,
      level: 3,
      path: `${level1Info.level1Name} > ${level2Map.get(level2Id)!.name} > ${description}`,
      level1Name: level1Info.level1Name,
      level2Name: level2Map.get(level2Id)!.name,
      level3Name: description,
      level1Id: level1Info.level1Id,
      level2Id: level2Id,
      level3Id: parsed.id
    })
  }

  return {
    level1Themes: LEVEL1_THEMES,
    level2Themes: Array.from(level2Map.values()),
    level3Themes: level3List,
    themeMap: themeMap
  }
}

// 全局緩存
let parsedDataCache: ParsedData | null = null

function getParsedData(): ParsedData {
  if (!parsedDataCache) {
    parsedDataCache = parseAllThemes()
  }
  return parsedDataCache
}

/**
 * 獲取所有一級主題
 */
export function getLevel1Themes(): Level1Theme[] {
  return getParsedData().level1Themes
}

/**
 * 根據一級主題 ID 獲取二級主題列表
 */
export function getLevel2ThemesByLevel1(level1Id: number): Level2Theme[] {
  const data = getParsedData()
  return data.level2Themes
    .filter(l2 => l2.level1Id === level1Id)
    .sort((a, b) => a.letter.localeCompare(b.letter))
}

/**
 * 根據二級主題 ID 獲取三級主題列表
 */
export function getLevel3ThemesByLevel2(level2Id: number): Level3Theme[] {
  const data = getParsedData()
  return data.level3Themes
    .filter(l3 => l3.level2Id === level2Id)
    .sort((a, b) => a.id - b.id)
}

/**
 * 獲取所有主題數據（Map 格式）
 */
export function getAllThemes(): Map<number, ThemeWithPath> {
  return getParsedData().themeMap
}

/**
 * 根據 ID 獲取主題信息（包含完整路徑）
 */
export function getThemeById(id: number): ThemeWithPath | undefined {
  return getAllThemes().get(id)
}

/**
 * 根據 ID 獲取主題的簡短名稱（L3 名稱）
 */
export function getThemeNameById(id: number): string {
  const theme = getThemeById(id)
  return theme?.level3Name || ''
}

/**
 * 根據 ID 獲取主題的完整路徑
 */
export function getThemePathById(id: number): string {
  const theme = getThemeById(id)
  return theme?.path || ''
}

/**
 * 獲取指定一級主題下的所有三級主題（向後兼容舊 API）
 */
export function getThemesByLevel1(level1Id: number): ThemeWithPath[] {
  const data = getParsedData()
  const range = ID_RANGE_TO_LEVEL1.find(r => r.level1Id === level1Id)

  if (!range) return []

  return data.level3Themes
    .filter(l3 => l3.level1Id === level1Id)
    .map(l3 => data.themeMap.get(l3.id)!)
    .sort((a, b) => a.id - b.id)
}

/**
 * 搜索主題（根據名稱或路徑）
 */
export function searchThemes(query: string): ThemeWithPath[] {
  if (!query.trim()) {
    return []
  }

  const themes = getAllThemes()
  const lowerQuery = query.toLowerCase()
  const result: ThemeWithPath[] = []

  themes.forEach((theme) => {
    if (
      theme.name.toLowerCase().includes(lowerQuery) ||
      theme.path.toLowerCase().includes(lowerQuery) ||
      theme.level1Name.toLowerCase().includes(lowerQuery)
    ) {
      result.push(theme)
    }
  })

  return result.slice(0, 50) // 限制返回數量
}

/**
 * 獲取所有主題的扁平列表（用於下拉選擇）
 */
export function getFlatThemeList(): ThemeWithPath[] {
  const themes = getAllThemes()
  return Array.from(themes.values()).sort((a, b) => a.id - b.id)
}

/**
 * 根據主題 ID 獲取顏色類名
 */
export function getThemeColorById(themeId: number | undefined): string {
  if (!themeId) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'

  const theme = getThemeById(themeId)
  if (!theme) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'

  const colors: Record<number, string> = {
    1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    3: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    4: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    5: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    6: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    7: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    8: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    9: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    10: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    11: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
  }
  return colors[theme.level1Id] || colors[1]
}
