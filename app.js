const data = window.MINHANG_ADMISSION_DATA;

const state = {
  view: "parallel",
  query: "",
  minScore: "",
  district: "",
  quick: "all",
};

const els = {
  search: document.querySelector("#searchInput"),
  score: document.querySelector("#scoreInput"),
  district: document.querySelector("#districtSelect"),
  reset: document.querySelector("#resetButton"),
  parallelList: document.querySelector("#parallelList"),
  opportunityList: document.querySelector("#opportunityList"),
  compareList: document.querySelector("#compareList"),
  parallelResultCount: document.querySelector("#parallelResultCount"),
  opportunityResultCount: document.querySelector("#opportunityResultCount"),
  compareResultCount: document.querySelector("#compareResultCount"),
};

const parallelGroups = [
  { key: "affiliated", title: "委属高中", test: (item) => item.type === "委属高中" },
  { key: "mhCity", title: "闵行市重点", test: (item) => item.district === "闵行区" && item.type === "市重点" },
  { key: "mhDistrict", title: "闵行区重点", test: (item) => item.district === "闵行区" && item.type === "区重点" },
  { key: "mhRegular", title: "闵行普通高中", test: (item) => item.district === "闵行区" && item.type === "普通高中" },
  { key: "private", title: "民办高中", test: (item) => item.type === "民办高中" },
  { key: "international", title: "国际/双语高中", test: (item) => item.type === "国际/双语高中" },
  {
    key: "other",
    title: "外区高中",
    test: (item) => item.district !== "闵行区" && !["委属高中", "民办高中", "国际/双语高中"].includes(item.type),
  },
];

const fmt = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return Number.isInteger(value) ? String(value) : String(value);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const matchesQuery = (item) => {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return String(item.school || "").toLowerCase().includes(q);
};

const meetsScore = (score) => {
  if (!state.minScore) return true;
  return score !== null && score !== undefined && score >= Number(state.minScore);
};

const districtMatches = (district) => !state.district || district === state.district;

function setup() {
  document.querySelector("#parallelCount").textContent = data.summary.parallelCount;
  document.querySelector("#minhangCount").textContent = data.summary.minhangParallelCount;
  document.querySelector("#opportunityCount").textContent = data.summary.opportunityCount;

  const districts = Array.from(
    new Set([...data.parallel.map((item) => item.district), ...data.compare.map((item) => item.district)])
  )
    .filter(Boolean)
    .sort((a, b) => {
      if (a === "闵行区") return -1;
      if (b === "闵行区") return 1;
      return a.localeCompare(b, "zh-Hans-CN");
    });

  if (els.district) {
    for (const district of districts) {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      els.district.appendChild(option);
    }
  }

  els.search?.addEventListener("input", () => {
    state.query = els.search.value;
    render();
  });
  els.score?.addEventListener("input", () => {
    state.minScore = els.score.value;
    render();
  });
  els.district?.addEventListener("change", () => {
    state.district = els.district.value;
    render();
  });
  els.reset?.addEventListener("click", resetFilters);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      document.querySelector(`#${state.view}View`).classList.add("is-active");
      render();
    });
  });

  document.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.quick = button.dataset.filter;
      document.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
      render();
    });
  });

  render();
}

function resetFilters() {
  state.query = "";
  state.minScore = "";
  state.district = "";
  state.quick = "all";
  if (els.search) els.search.value = "";
  if (els.score) els.score.value = "";
  if (els.district) els.district.value = "";
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.filter === "all"));
  render();
}

function applyQuickParallel(item) {
  if (state.quick === "minhang") return item.district === "闵行区";
  if (state.quick === "cityKey") return item.score >= 670;
  return true;
}

function applyQuickCompare(item) {
  if (state.quick === "minhang") return item.district === "闵行区";
  if (state.quick === "cityKey") return item.years["2025"].parallel >= 670;
  return true;
}

function render() {
  renderParallel();
  renderOpportunities();
  renderCompare();
}

function filteredParallel() {
  return data.parallel.filter((item) => {
    return matchesQuery(item) && meetsScore(item.score) && districtMatches(item.district) && applyQuickParallel(item);
  });
}

function renderParallel() {
  const rows = filteredParallel();
  els.parallelResultCount.textContent = `${rows.length} 所`;
  els.parallelList.innerHTML = rows.length ? parallelGroups.map((group) => parallelGroup(group, rows)).join("") : emptyHtml();
}

function parallelGroup(group, rows) {
  const groupedRows = rows.filter(group.test);
  if (!groupedRows.length) return "";
  return `
    <section class="table-section">
      <div class="group-title">
        <h3>${group.title}</h3>
        <span>${groupedRows.length} 所</span>
      </div>
      <div class="table-wrap parallel-wrap">
        <table class="school-table parallel-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>学校</th>
              <th>区/类型</th>
              <th>2025分</th>
              <th>语数外</th>
              <th>语文</th>
              <th>数学</th>
              <th>英语</th>
              <th>综测</th>
            </tr>
          </thead>
          <tbody>${groupedRows.map(parallelRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function parallelRow(item) {
  return `
    <tr class="${item.isMinhang ? "is-minhang-row" : ""}">
      <td>${fmt(item.rank)}</td>
      <td class="school-cell">${escapeHtml(item.school)}</td>
      <td><span>${escapeHtml(item.district)}</span><small>${escapeHtml(item.type || "")}</small></td>
      <td class="num">${fmt(item.score)}</td>
      <td class="num">${fmt(item.core)}</td>
      <td class="num">${fmt(item.chinese)}</td>
      <td class="num">${fmt(item.math)}</td>
      <td class="num">${fmt(item.english)}</td>
      <td class="num">${fmt(item.comprehensive)}</td>
    </tr>
  `;
}

function renderOpportunities() {
  const rows = data.opportunities.filter((item) => {
    return matchesQuery(item) && meetsScore(item.score) && districtMatches(item.district);
  });
  els.opportunityResultCount.textContent = `${rows.length} 所`;
  els.opportunityList.innerHTML = rows.length ? rows.map(opportunityCard).join("") : emptyHtml();
}

function opportunityCard(item) {
  const judgement = opportunityJudgement(item);
  const schoolType = item.type || "市重点";
  return `
    <article class="school-card opportunity-card">
      <div class="card-top">
        <div>
          <div class="school-name">${escapeHtml(item.school)}</div>
          <div class="meta">
            <span class="pill">${escapeHtml(item.district)}</span>
            <span class="pill blue">${escapeHtml(schoolType)}</span>
            ${item.rank ? `<span class="pill">平行排名 ${item.rank}</span>` : ""}
            <span class="pill green">${item.lowerCount} 年低于平行</span>
          </div>
        </div>
        <div class="score">
          <strong>${fmt(item.latestGap)}</strong>
          <span>最近差值</span>
        </div>
      </div>
      <div class="mini-chart">${item.lowerYears.map(gapBar).join("")}</div>
      <div class="detail-grid">
        <div class="detail"><span>平行参考</span><strong>${fmt(item.score)}</strong></div>
        <div class="detail"><span>最近到区</span><strong>${fmt(item.latestQuota)}</strong></div>
        <div class="detail"><span>最近平行</span><strong>${fmt(item.latestParallel)}</strong></div>
      </div>
      <div class="judgement ${judgement.level}">
        <strong>${judgement.title}</strong>
        <p>${judgement.text}</p>
      </div>
    </article>
  `;
}

function gapBar(row) {
  const width = Math.max(8, Math.min(100, row.gap * 4));
  return `
    <div class="gap-row">
      <span>${row.year}</span>
      <div class="gap-track"><i style="width:${width}%"></i></div>
      <b>${fmt(row.quota)} / ${fmt(row.parallel)}，低 ${fmt(row.gap)}</b>
    </div>
  `;
}

function opportunityJudgement(item) {
  const has2025 = item.lowerYears.some((row) => row.year === "2025");
  const strongGap = item.latestGap >= 15 || item.lowerCount >= 2;
  const highScore = item.score >= 680;
  if (has2025 && strongGap && item.notRemote) {
    return {
      level: "good",
      title: "值得优先研究",
      text: "近年出现过明显的名额到区折价，且不属于特别郊远方向。适合放进名额到区清单，但仍要结合通勤、住宿和孩子接受度。",
    };
  }
  if (has2025 && highScore) {
    return {
      level: "watch",
      title: "可以作为冲一冲",
      text: "学校平行志愿分数不低，说明学校层级有吸引力；名额到区曾低于平行，适合在保底明确后作为机会项。",
    };
  }
  if (item.lowerCount >= 2) {
    return {
      level: "watch",
      title: "有反复折价迹象",
      text: "不止一年低于平行志愿，说明热度或竞争池可能存在波动。可以关注，但要看最新一年是否仍有优势。",
    };
  }
  return {
    level: "care",
    title: "谨慎纳入备选",
    text: "只在个别年份低于平行志愿，稳定性一般。除非学校位置、特色或通勤很合适，否则不宜只因一次低分就高估机会。",
  };
}

function renderCompare() {
  const rows = data.compare.filter((item) => {
    return matchesQuery(item) && meetsScore(item.years["2025"].parallel) && districtMatches(item.district) && applyQuickCompare(item);
  });
  els.compareResultCount.textContent = `${rows.length} 所`;
  els.compareList.innerHTML = rows.length ? rows.map(compareCard).join("") : emptyHtml();
}

function compareCard(item) {
  return `
    <article class="school-card compare-card ${item.district === "闵行区" ? "is-minhang" : ""}">
      <div class="compare-layout">
        <div class="compare-info">
          <div class="school-name">${escapeHtml(item.school)}</div>
          <div class="meta">
            <span class="pill ${item.district === "闵行区" ? "green" : ""}">${escapeHtml(item.district)}</span>
            ${item.years["2025"].quotaLower ? '<span class="pill lower">2025 到区低于平行</span>' : ""}
          </div>
          <div class="compare-highlight ${item.years["2025"].delta !== null && item.years["2025"].delta < 0 ? "negative-score" : ""}">
            <strong>${fmt(item.years["2025"].delta)}</strong>
            <span>2025 到区-平行</span>
          </div>
        </div>
        ${compareMiniTable(item)}
      </div>
    </article>
  `;
}

function compareMiniTable(item) {
  return `
    <div class="compare-mini-wrap">
      <table class="compare-mini-table">
        <thead>
          <tr>
            <th>年份</th>
            <th>到区</th>
            <th>到校</th>
            <th>平行</th>
            <th>差值</th>
          </tr>
        </thead>
        <tbody>${["2025", "2024", "2023"].map((year) => compareMiniRow(year, item.years[year])).join("")}</tbody>
      </table>
    </div>
  `;
}

function compareMiniRow(year, values) {
  return `
    <tr>
      <td class="year-cell">${year}</td>
      <td class="num ${values.quotaLower ? "lower-cell" : ""}">${fmt(values.quota)}</td>
      <td class="num">${fmt(values.schoolQuota)}</td>
      <td class="num">${fmt(values.parallel)}</td>
      <td class="num ${values.delta !== null && values.delta < 0 ? "lower-cell" : ""}">${fmt(values.delta)}</td>
    </tr>
  `;
}

function compareTable(rows) {
  return `
    <section class="table-section">
      <div class="group-title">
        <h3>2023-2025 录取路径分析对比</h3>
        <span>${rows.length} 所</span>
      </div>
      <div class="table-wrap">
        <table class="school-table compare-table">
          <thead>
            <tr>
              <th>区</th>
              <th>学校</th>
              <th>年份</th>
              <th>名额到区</th>
              <th>骏博到校</th>
              <th>平行志愿</th>
              <th>差值</th>
            </tr>
          </thead>
          <tbody>${rows.map(compareLongRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function compareLongRow(item) {
  return ["2025", "2024", "2023"]
    .map((year, index) => {
      const values = item.years[year];
      return `
        <tr class="compare-school-row ${index === 0 ? "school-start" : ""} ${item.district === "闵行区" ? "is-minhang-row" : ""}">
          ${
            index === 0
              ? `<td class="district-cell" rowspan="3">${escapeHtml(item.district)}</td>
                 <td class="school-cell" rowspan="3">${escapeHtml(item.school)}</td>`
              : ""
          }
          <td class="year-cell">${year}</td>
          <td class="num ${values.quotaLower ? "lower-cell" : ""}">${fmt(values.quota)}</td>
          <td class="num">${fmt(values.schoolQuota)}</td>
          <td class="num">${fmt(values.parallel)}</td>
          <td class="num ${values.delta !== null && values.delta < 0 ? "lower-cell" : ""}">${fmt(values.delta)}</td>
        </tr>
      `;
    })
    .join("");
}

function emptyHtml() {
  return '<div class="empty">没有符合当前筛选的学校</div>';
}

setup();
