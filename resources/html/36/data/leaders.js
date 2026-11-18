/* HITMAN Freelancer 首领表（72 位）—— 数据取自 trashcan.fr/freelancer/assets/scripts/constants.js
 *
 * 文件名格式：{发色}-{特征代码}-{人名}
 *   发色：BALD 光头 / BLACK 黑 / GREY 灰 / RED 红 / BLONDE 金 / BROWN 棕
 *   特征代码：E 耳环 / G 眼镜 / H 帽子 / N 项链 / T 纹身
 *
 * 注意：有些首领带 4 个特征（EGHT、EGNT），所以一次「3 特征 + 发色」的查询
 *       可能命中 2 张或 4 张图 —— 这是原站 app.js 的 includes 子集匹配逻辑。
 *
 * 图片放在 images/leaders/{文件名}.jpg（或 .png）
 */
window.LEADERS = [
  // ---- 光头 BALD ----
  'BALD-EGHT-Angel', 'BALD-EGHT-Gonzales',
  'BALD-EGN-Hugo', 'BALD-EGN-Yvonne',
  'BALD-EGNT-Morales', 'BALD-EGNT-Stephanie',
  'BALD-EHN-Mitchell', 'BALD-EHN-Sloan',
  'BALD-GHT-Kirsten', 'BALD-GHT-Melvin',
  'BALD-HNT-Murray', 'BALD-HNT-Siabhan',

  // ---- 黑发 BLACK ----
  'BLACK-EGHT-Achieng', 'BLACK-EGHT-Rajat',
  'BLACK-EGN-Bradley', 'BLACK-EGN-Patricia',
  'BLACK-EGNT-Navaeh', 'BLACK-EGNT-Sidney',
  'BLACK-EHN-Helen', 'BLACK-EHN-Paul',
  'BLACK-GHT-Fiona', 'BLACK-GHT-Steven',
  'BLACK-HNT-Ibrahim', 'BLACK-HNT-Lilly',

  // ---- 灰发 GREY ----
  'GREY-EGHT-Lisa', 'GREY-EGHT-Malcolm',
  'GREY-EGN-Deri', 'GREY-EGN-Riko',
  'GREY-EGNT-Manny', 'GREY-EGNT-Petunia',
  'GREY-EHN-Arun', 'GREY-EHN-Tomoko',
  'GREY-GHT-Gary', 'GREY-GHT-Joyce',
  'GREY-HNT-Mariam', 'GREY-HNT-Vincent',

  // ---- 红发 RED ----
  'RED-EGHT-Gabrielle', 'RED-EGHT-Nathaniel',
  'RED-EGN-Gloria', 'RED-EGN-Ronnie',
  'RED-EGNT-Eoin', 'RED-EGNT-Ruby',
  'RED-EHN-Charles', 'RED-EHN-Rochelle',
  'RED-GHT-Chester', 'RED-GHT-Willow',
  'RED-HNT-Alexandra', 'RED-HNT-Mack',

  // ---- 金发 BLONDE ----
  'BLONDE-EGHT-Antoinette', 'BLONDE-EGHT-Howard',
  'BLONDE-EGN-Anders', 'BLONDE-EGN-Cathy',
  'BLONDE-EGNT-Netta', 'BLONDE-EGNT-Wendell',
  'BLONDE-EHN-Roland', 'BLONDE-EHN-Tuesday',
  'BLONDE-GHT-Curtis', 'BLONDE-GHT-Sophie',
  'BLONDE-HNT-Jefferson', 'BLONDE-HNT-Mimi',

  // ---- 棕发 BROWN ----
  'BROWN-EGHT-Dara', 'BROWN-EGHT-Rodrigo',
  'BROWN-EGN-Bianca', 'BROWN-EGN-Keenan',
  'BROWN-EGNT-Alfred', 'BROWN-EGNT-Kyra',
  'BROWN-EHN-Cora', 'BROWN-EHN-Hiram',
  'BROWN-GHT-Antonio', 'BROWN-GHT-Felicity',
  'BROWN-HNT-Tasha', 'BROWN-HNT-Zhao',
];
