import { describe, it, expect } from 'vitest'
import { simplifyDefinitionForMatrix } from '../faanjyutFormat'

describe('simplifyDefinitionForMatrix（矩陣行頭釋義列）', () => {
  it('去 {n} 義項編號並保留多義項（無例詞時）', () => {
    expect(simplifyDefinitionForMatrix('{1}廣東省的簡稱。{2}姓氏。')).toBe('廣東省的簡稱。姓氏。')
  })

  it('去『』例句，殘留「：；」收斂為「；」', () => {
    expect(simplifyDefinitionForMatrix('食品油脂過多，喫起來膩：『肥豬肉極～』；喫的次數過多感到厭膩：『喫開半隻月雞蛋，…』'))
      .toBe('食品油脂過多，喫起來膩；喫的次數過多感到厭膩')
  })

  it('去「：/；」後含 ～ 的例詞段', () => {
    expect(simplifyDefinitionForMatrix('排行第一：老～｜阿～$')).toBe('排行第一')
    expect(simplifyDefinitionForMatrix('{1}數字五，量詞（不能用手抓的）：一～；{2}排行第五（不能用手抓的）：～妹｜阿～｜玉林山歌王夏～$'))
      .toBe('數字五，量詞（不能用手抓的）；排行第五（不能用手抓的）')
  })

  it('去〔〕/[ ] 構詞標記', () => {
    expect(simplifyDefinitionForMatrix('〔日～〕日子$')).toBe('日子')
    expect(simplifyDefinitionForMatrix('時候：[鬱]時～｜[蒙]個～')).toBe('時候')
  })

  it('無例詞例句的原文原樣（僅收縮空白）', () => {
    expect(simplifyDefinitionForMatrix('  不言自明  ')).toBe('不言自明')
    expect(simplifyDefinitionForMatrix('皮膚滑膩的蛙類動物：爛～｜蛤～｜～仔')).toBe('皮膚滑膩的蛙類動物')
  })

  it('去「：/；」後純｜串的空例詞佔位', () => {
    expect(simplifyDefinitionForMatrix('表示能够繼續下去：｜｜')).toBe('表示能够繼續下去')
    expect(simplifyDefinitionForMatrix('表示總括，都，皆：｜；已經：｜｜；差點就，幾乎就：｜；勉强說得上，還算：｜；甚至：｜｜｜；表示只要滿足最低限度'))
      .toBe('表示總括，都，皆；已經；差點就，幾乎就；勉强說得上，還算；甚至；表示只要滿足最低限度')
  })

  it('去「：/；」後的括號例詞/例句段（如 (…)｜(…)），保留冒號前的括注釋義', () => {
    expect(simplifyDefinitionForMatrix('潮溼的狀貌詞：（露水很重）｜（這件衣服很溼）；返潮；衣服潮溼生黴味'))
      .toBe('潮溼的狀貌詞；返潮；衣服潮溼生黴味')
    expect(simplifyDefinitionForMatrix('水濱，特指水邊平坦廣闊的水田：石貝浦(塘角的一個地名)｜浦心(石排鎮的一個地名)'))
      .toBe('水濱，特指水邊平坦廣闊的水田')
    expect(simplifyDefinitionForMatrix('繃得緊；極盡；(牛皮吹上天)｜(被他緊緊催逼)；速度大、轉速快'))
      .toBe('繃得緊；極盡；速度大、轉速快')
    // 冒號前的括注是釋義本身，保留
    expect(simplifyDefinitionForMatrix('{1}數字五，量詞（不能用手抓的）：一～')).toBe('數字五，量詞（不能用手抓的）')
    // 帶空格的空例詞佔位
    expect(simplifyDefinitionForMatrix('所在，專指死物，前面必須接動詞： ｜')).toBe('所在，專指死物，前面必須接動詞')
  })

  it('空值返回空串（調用方顯示 —）', () => {
    expect(simplifyDefinitionForMatrix('')).toBe('')
    expect(simplifyDefinitionForMatrix(null)).toBe('')
    expect(simplifyDefinitionForMatrix(undefined)).toBe('')
  })
})
