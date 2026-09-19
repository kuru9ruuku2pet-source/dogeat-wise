const basicNutrients = ["粗たんぱく質", "粗脂肪", "粗繊維", "粗灰分"];
const optionalNutrients = ["カルシウム", "リン", "ナトリウム"];
const foodList = document.querySelector("#food-list");
const foodTemplate = document.querySelector("#food-template");
const nutrientTemplate = document.querySelector("#nutrient-template");
const customNutrientTemplate = document.querySelector("#custom-nutrient-template");
const addFoodButton = document.querySelector("#add-food");
const compareButton = document.querySelector("#compare-foods");
const comparison = document.querySelector("#comparison");
const comparisonTable = document.querySelector("#comparison-table");
let foodSequence = 0;

function addNutrient(container, name) {
  const item = nutrientTemplate.content.cloneNode(true);
  item.querySelector(".nutrient-label").textContent = name;
  const input = item.querySelector("input");
  input.dataset.nutrient = name;
  input.setAttribute("aria-label", `${name}（%）`);
  container.append(item);
}

function createFood() {
  const fragment = foodTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".food-card");
  const id = ++foodSequence;
  card.querySelectorAll('.energy-unit').forEach(input => input.name = `energy-unit-${id}`);
  for (const key of ['moisture', 'energy']) {
    card.querySelector(`.${key}-error`).id = `${key}-error-${id}`;
    card.querySelector(`.${key}`).setAttribute('aria-describedby', `${key}-error-${id}`);
  }
  card.querySelector('.standard-select').addEventListener('change', () => updateFood(card));
  basicNutrients.forEach((name) => addNutrient(fragment.querySelector(".basic-nutrients"), name));
  card.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => updateFood(card)));
  card.querySelectorAll("input[type=radio]").forEach((input) => input.addEventListener("change", () => updateFood(card)));
  card.querySelector(".food-name").addEventListener("input", () => { updateTitle(card); renderComparisonIfOpen(); });
  card.querySelector(".optional-select").addEventListener("change", (event) => {
    const name = event.target.value;
    if (!name || card.querySelector(`[data-nutrient="${name}"]`)) return;
    addNutrient(card.querySelector(".optional-nutrients"), name);
    card.querySelector(".optional-wrap").hidden = false;
    const added = card.querySelector(`[data-nutrient="${name}"]`);
    added.addEventListener("input", () => updateFood(card));
    event.target.value = "";
  });
  card.querySelector(".add-custom").addEventListener("click", () => addCustomNutrient(card));
  card.querySelector(".remove-food").addEventListener("click", () => { card.remove(); refreshFoodCards(); });
  foodList.append(fragment);
  refreshFoodCards();
  updateFood(card);
}

function addCustomNutrient(card) {
  const item = customNutrientTemplate.content.cloneNode(true);
  const custom = item.querySelector(".custom-field");
  custom.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => updateFood(card)));
  custom.querySelector(".remove-custom").addEventListener("click", () => { custom.remove(); updateFood(card); });
  card.querySelector(".custom-nutrients").append(item);
  card.querySelector(".custom-name").focus();
}

function refreshFoodCards() {
  const cards = [...foodList.querySelectorAll(".food-card")];
  cards.forEach((card, index) => {
    card.querySelector(".food-number").textContent = `FOOD ${String(index + 1).padStart(2, "0")}`;
    card.querySelector(".remove-food").hidden = cards.length === 1;
    updateTitle(card);
  });
  compareButton.hidden = cards.length < 2;
  if (cards.length < 2) comparison.hidden = true;
  renderComparisonIfOpen();
}

function updateTitle(card) {
  const name = card.querySelector(".food-name").value.trim();
  card.querySelector(".food-title").textContent = name || "フードを入力";
}

function getNumber(input) { const value = Number.parseFloat(input.value); return Number.isFinite(value) ? value : null; }
function validate(card) {
  const moisture = getNumber(card.querySelector(".moisture"));
  const energy = getNumber(card.querySelector(".energy"));
  const moistureError = card.querySelector(".moisture-error");
  const energyError = card.querySelector(".energy-error");
  moistureError.textContent = moisture === null ? "" : (moisture < 0 || moisture >= 100 ? "水分は0以上100未満で入力してください。" : "");
  energyError.textContent = energy === null ? "" : (energy <= 0 ? "MEは0より大きい値で入力してください。" : "");
  const valid = moisture !== null && moisture >= 0 && moisture < 100 && energy !== null && energy > 0;
  return { moisture, energy, valid };
}

function nutrientValues(card) {
  const values = [];
  card.querySelectorAll("[data-nutrient]").forEach((input) => {
    const value = getNumber(input);
    input.setAttribute('aria-invalid', input.value !== '' && (value === null || value < 0 || value > 100) ? 'true' : 'false');
    if (value !== null && value >= 0 && value <= 100) values.push({ name: input.dataset.nutrient, value, builtIn: true });
  });
  card.querySelectorAll(".custom-field").forEach((row) => {
    const name = row.querySelector(".custom-name").value.trim();
    const value = getNumber(row.querySelector(".custom-value"));
    if (name && value !== null && value >= 0 && value <= 100) values.push({ name, value });
  });
  return values;
}

function format(value, digits = 1) { return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits }); }
function formatPerKcal(value) { return value < 1 ? `${format(value * 1000, 0)} mg` : `${format(value)} g`; }

function calculation(card) {
  const { moisture, energy, valid } = validate(card);
  if (!valid) return null;
  const unit = card.querySelector(".energy-unit:checked").value;
  return nutrientValues(card).map(({ name, value, builtIn }) => ({
    name, value, builtIn,
    dm: value / (100 - moisture) * 100,
    perKcal: unit === "100g" ? value * 1000 / energy : value * 10000 / energy
  }));
}

function updateFood(card) {
  const output = card.querySelector(".result-cards");
  const status = card.querySelector(".result-status");
  const values = calculation(card);
  const key = card.querySelector('.standard-select').value;
  card.querySelector('.standard-note').textContent = '健康な成犬の最低推奨濃度との参考比較です。最適量や上限ではなく、不足・過剰・適合は判定しません。FEDIAFの95・110条件の説明は「基準値の読み方」をご確認ください。';
  if (!values) { status.textContent = "水分・MEを正しく入力してください"; output.innerHTML = '<p class="empty-results">成分値を入力すると、ここに換算結果が表示されます。</p>'; renderComparisonIfOpen(); return; }
  if (!values.length) { status.textContent = "成分値を入力してください"; output.innerHTML = '<p class="empty-results">保証成分値を入力すると、換算結果が表示されます。</p>'; renderComparisonIfOpen(); return; }
  status.textContent = `${values.length} 成分を換算済み`;
  output.innerHTML = values.map((item) => `<article class="result-card"><h4 class="result-name">${escapeHtml(item.name)}</h4><div class="result-values"><div><span>表示値</span><strong>${format(item.value, 2)}%</strong></div><div><span>乾物換算</span><strong class="highlight">${format(item.dm, 2)}% DM</strong></div><div><span>1,000kcalあたり</span><strong>${formatPerKcal(item.perKcal)}</strong></div></div>${renderStandard(item, key)}</article>`).join("");
  renderComparisonIfOpen();
}

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }
function renderComparisonIfOpen() { if (!comparison.hidden) renderComparison(); }
function renderComparison() {
  const foods = [...foodList.querySelectorAll(".food-card")].map((card, index) => ({ name: card.querySelector(".food-name").value.trim() || `フード ${index + 1}`, values: calculation(card) || [] }));
  const nutrientNames = [...new Set(foods.flatMap((food) => food.values.map((value) => value.name)))];
  if (!nutrientNames.length) { comparisonTable.innerHTML = '<tbody><tr><td>比較するには、各フードに水分・ME・成分値を入力してください。</td></tr></tbody>'; return; }
  const headings = foods.map((food) => `<th scope="col">${escapeHtml(food.name)}</th>`).join("");
  const rows = nutrientNames.map((name) => {
    const cells = foods.map((food) => { const v = food.values.find((item) => item.name === name); return v ? `<td><strong>${format(v.dm)}% DM</strong><br><span class="metric">${formatPerKcal(v.perKcal)} / 1,000kcal</span></td>` : '<td class="dash">—</td>'; }).join("");
    return `<tr><th scope="row">${escapeHtml(name)}</th>${cells}</tr>`;
  }).join("");
  comparisonTable.innerHTML = `<thead><tr><th scope="col">栄養素</th>${headings}</tr></thead><tbody>${rows}</tbody>`;
}

addFoodButton.addEventListener("click", () => { createFood(); const newest = foodList.lastElementChild; newest.scrollIntoView({ behavior: "smooth", block: "start" }); newest.querySelector(".food-name").focus(); });
compareButton.addEventListener("click", () => { comparison.hidden = false; renderComparison(); comparison.scrollIntoView({ behavior: "smooth", block: "start" }); });
document.querySelector("#close-comparison").addEventListener("click", () => comparison.hidden = true);
createFood();
