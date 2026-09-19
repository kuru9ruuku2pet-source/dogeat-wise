// g / 1,000 kcal ME. Only the five verified, built-in nutrients are compared.
// FEDIAF September 2025 table III-3b. AAFCO pending verification of current official edition.
const nutrientStandards = {
  fediaf95: { "粗たんぱく質": 52.1, "粗脂肪": 13.75, "カルシウム": 1.45, "リン": 1.16, "ナトリウム": 0.29 },
  fediaf110: { "粗たんぱく質": 45, "粗脂肪": 13.75, "カルシウム": 1.25, "リン": 1, "ナトリウム": 0.25 }
};

function renderStandard(item, key) {
  if (key === "none") return "";
  const minimum = item.builtIn ? nutrientStandards[key]?.[item.name] : undefined;
  if (minimum === undefined) return '<p class="standard-result">この項目は基準比較の対象外です。</p>';
  const reference = "最低推奨量";
  return `<div class="standard-result"><span>${reference}</span><strong>${minimum.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} g / 1,000kcal</strong><span>入力値の換算：${item.perKcal === null ? "ME未入力・無効のため計算できません" : item.perKcal.toLocaleString("ja-JP", { maximumFractionDigits: 3 }) + " g / 1,000kcal"}</span></div>`;
}
