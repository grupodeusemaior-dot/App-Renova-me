// Resolve os dados a partir da localização real deste app.js, e não da URL
// atual do navegador. Isso evita erros quando o Live Server abre uma subpasta.
const APP_ROOT = new URL("../", document.currentScript.src);
const DATA_ROOT = new URL("Dados_JSON/", APP_ROOT);
const ROOT = DATA_ROOT.href.replace(/\/$/, "");

const collections = [
  { key:"ver-a-jesus", title:"Ver a Jesus", subtitle:"Contemplando a beleza e a suficiência de Cristo.", image:"Ver a Jesus.png", file:`${ROOT}/Caixa da promessa JSON/ver_a_jesus.json`, theme:"jesus", count:121 },
  { key:"caminhar-com-cristo", title:"Caminhar com Cristo", subtitle:"Uma jornada diária de fé, obediência e comunhão.", image:"Caminhar com Cristo.png", file:`${ROOT}/Caixa da promessa JSON/caminhar_com_cristo.json`, theme:"caminhar", count:365 },
  { key:"preciosa", title:"Preciosa", subtitle:"Uma coleção de cuidado, dignidade e identidade diante de Deus.", image:"Preciosa.png", file:`${ROOT}/Caixa da promessa JSON/preciosa.json`, theme:"preciosa", count:180 },
  { key:"preciosa-e-segura", title:"Preciosa e Segura", subtitle:"Descansando no cuidado e na fidelidade do Senhor.", image:"Preciosa e Segura.png", file:`${ROOT}/Caixa da promessa JSON/preciosa_e_segura.json`, theme:"segura", count:70 }
];

const ranges = (prefix, count, folder, suffix="") => Array.from({length:count}, (_, i) => {
  const start = String(i * 20 + 1).padStart(3, "0");
  const end = String(Math.min((i + 1) * 20, prefix === "devocionais_" ? 560 : 115)).padStart(3, "0");
  return `${ROOT}/${folder}/${prefix}${start}_a_${end}${suffix}.json`;
});
const datasets = {
  devocionais: ranges("devocionais_", 28, "DevocionaisJSON"),
  sermoes: [
    `${ROOT}/SermõesJSON/sermoes_001_a_020_Renova-me_corrigido.json`,
    ...["021_a_040", "041_a_060", "061_a_080", "081_a_100", "101_a_115"].map(r => `${ROOT}/SermõesJSON/sermoes_${r}_Renova-me.json`)
  ],
  liturgias: ["001_a_020", "021_a_040", "041_a_060", "061_a_080", "081_a_100", "101_a_115"].map(r => `${ROOT}/LiturgiasJSON/liturgias_${r}.json`)
};

const state = { items: [], index: 0, book: null, bibleData: null, testament: null, dailyTimer: null, currentDailyType: null, currentCollection: null, speechText: null };
const grid = document.getElementById("categoryGrid");
const panel = document.getElementById("viewPanel");
const title = document.getElementById("viewTitle");
const desc = document.getElementById("viewDescription");
const content = document.getElementById("viewContent");
const eyebrow = document.getElementById("viewEyebrow");

const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// A sequência começa no primeiro registro em 02/11/2026 e avança uma posição
// a cada dia local. O cálculo é estável entre dispositivos e não depende de cliques.
const DAILY_START = new Date(2026, 10, 2);
function localDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
function dailyIndex(total) {
  if (!total) return 0;
  const elapsed = Math.max(0, localDayNumber(new Date()) - localDayNumber(DAILY_START));
  return elapsed % total;
}
function formatToday() {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}
function scheduleDailyRefresh(type, heroImage = null) {
  clearTimeout(state.dailyTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  state.dailyTimer = setTimeout(() => {
    if (state.currentDailyType === type && state.items.length) {
      state.index = dailyIndex(state.items.length);
      renderItem(type, heroImage, type === 'sermoes' || type === 'liturgias');
    }
    scheduleDailyRefresh(type, heroImage);
  }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}
function resolveDataUrl(path) {
  // Aceita tanto caminhos antigos com prefixo Dados_JSON/ quanto caminhos
  // relativos ao diretório de dados. Os caminhos do catálogo bíblico também
  // passam por aqui.
  const cleanPath = String(path).replace(/^\.\//, "").replace(/^Dados_JSON\//, "");
  return new URL(cleanPath, DATA_ROOT).href;
}
async function loadJson(path) {
  const url = resolveDataUrl(path);
  let response;
  try {
    response = await fetch(url, { cache: "no-cache" });
  } catch (error) {
    const page = location.href;
    throw new Error(`Falha de rede ao acessar ${url}. Página aberta em ${page}. Confirme se o Live Server está servindo a pasta que contém index.html, js e Dados_JSON.`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} ao acessar ${url}`);
  try { return await response.json(); }
  catch { throw new Error(`O arquivo foi encontrado, mas não contém JSON válido: ${url}`); }
}
function extractRecords(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.textos)) return data.textos;
  if (data && Array.isArray(data.registros)) return data.registros;
  return [];
}
async function loadMany(paths) {
  const files = await Promise.all(paths.map(loadJson));
  return files.flatMap(extractRecords).sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
}
function showPanel(sectionTitle, sectionDesc, eyebrowText = "BIBLIOTECA", theme = "default") {
  title.textContent = sectionTitle;
  desc.textContent = sectionDesc;
  eyebrow.textContent = eyebrowText;
  content.className = `view-content theme-${theme}`;
  content.replaceChildren();
  const identity = document.createElement("div"); identity.className = "page-identity";
  const logo = document.createElement("img"); logo.src = "Logo-Renova-me.jpg"; logo.alt = "Logo Renova-me Deus Meu";
  const identityText = document.createElement("div");
  const identityTitle = document.createElement("strong"); identityTitle.textContent = "Renova-me Deus Meu";
  const identitySubtitle = document.createElement("span"); identitySubtitle.textContent = "Palavra, fé e vida";
  identityText.append(identityTitle, identitySubtitle); identity.append(logo, identityText);
  content.append(identity);
  grid.hidden = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
function message(text, kind = "info") {
  const note = document.createElement("div");
  note.className = `empty-note ${kind}`;
  note.textContent = text;
  content.append(note);
}
function makeButton(label, handler, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `data-link action-link ${className}`;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}
function addNavigation(onPrevious, onNext, previousLabel = "← Anterior", nextLabel = "Próximo →") {
  const nav = document.createElement("div");
  nav.className = "reading-nav";
  const previous = document.createElement("button");
  previous.type = "button"; previous.className = "nav-button"; previous.textContent = previousLabel;
  previous.disabled = !onPrevious; if (onPrevious) previous.addEventListener("click", onPrevious);
  const count = document.createElement("span"); count.className = "reading-count"; count.textContent = `${state.index + 1} de ${state.items.length}`;
  const next = document.createElement("button"); next.type = "button"; next.className = "nav-button primary"; next.textContent = nextLabel;
  if (onNext) next.addEventListener("click", onNext);
  nav.append(previous, count, next); content.append(nav);
}
function renderItem(type, heroImage = null, showSummary = false) {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  state.speechText = null;
  const item = state.items[state.index];
  if (!item) { message("Esta coleção ainda não possui registros para exibir.", "warning"); return; }
  content.replaceChildren();
  if (heroImage) {
    const hero = document.createElement("div"); hero.className = `collection-hero hero-${type}`;
    hero.style.backgroundImage = `linear-gradient(0deg,rgba(10,22,25,.76),rgba(10,22,25,.08)),url("${heroImage}")`;
    const label = document.createElement("span"); label.textContent = type === "promessas" ? (state.currentCollection?.title || "Caixinha das Promessas") : type; hero.append(label); content.append(hero);
  }
  if (showSummary) renderSummary(type);
  const card = document.createElement("article"); card.className = `reading-card reading-${type}`;
  const kicker = document.createElement("p"); kicker.className = "reading-kicker";
  const typeLabel = type === "devocionais" ? "DEVOCIONAL" : type === "promessas" ? "LEITURA" : type === "sermoes" ? "SERMÃO" : "LITURGIA";
  kicker.textContent = `${typeLabel} Nº ${item.numero ?? state.index + 1}`;
  card.append(kicker);
  const daily = document.createElement("p"); daily.className = "daily-stamp"; daily.textContent = `CONTEÚDO DO DIA · ${formatToday()}`; card.append(daily);
  const heading = document.createElement("h3"); heading.textContent = item.titulo || `Leitura ${state.index + 1}`; card.append(heading);
  const reference = item.referencia || item.versiculo || item.inspiracao_biblica;
  if (reference) { const ref = document.createElement("p"); ref.className = "reading-reference"; ref.textContent = reference; card.append(ref); }
  const body = document.createElement("div"); body.className = "reading-body";
  const rawText = item.conteudo || item.mensagem || item.licao || item.texto || "";
  // Leitura em voz alta usa a voz instalada no próprio navegador/sistema.
  // Disponível somente nos módulos solicitados: promessas, devocionais e sermões.
  if (["promessas", "devocionais", "sermoes"].includes(type)) {
    const speakButton = document.createElement("button");
    speakButton.type = "button";
    speakButton.className = "nav-button listen-button";
    speakButton.textContent = "🔊 Ouvir texto";
    speakButton.setAttribute("aria-label", "Ouvir texto em voz alta");
    const spokenText = [item.titulo, reference, item.secao, rawText].filter(Boolean).join(". ");
    speakButton.addEventListener("click", () => {
      const speech = window.speechSynthesis;
      if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        message("Este navegador ou dispositivo não oferece leitura em voz alta. Experimente abrir o aplicativo em outro navegador atualizado.", "warning");
        return;
      }
      if (speech.speaking || speech.paused) {
        speech.cancel();
        speakButton.textContent = "🔊 Ouvir texto";
        state.speechText = null;
        return;
      }
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "pt-BR";
      utterance.rate = 0.95;
      utterance.onend = () => { speakButton.textContent = "🔊 Ouvir texto"; state.speechText = null; };
      utterance.onerror = () => { speakButton.textContent = "🔊 Ouvir texto"; state.speechText = null; };
      state.speechText = utterance;
      speakButton.textContent = "■ Parar áudio";
      speech.speak(utterance);
    });
    card.append(speakButton);
  }
  rawText.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => { const p = document.createElement("p"); p.textContent = paragraph; body.append(p); });
  if (!rawText && item.inspiracao_biblica && !reference) { const p = document.createElement("p"); p.textContent = item.inspiracao_biblica; body.append(p); }
  if (item.secao) { const section = document.createElement("p"); section.className = "reading-section"; section.textContent = item.secao; card.append(section); }
  card.append(body); content.append(card);
  const previous = state.index > 0 ? () => { state.index--; renderItem(type, heroImage, showSummary); } : null;
  const next = () => { state.index = (state.index + 1) % state.items.length; renderItem(type, heroImage, showSummary); };
  addNavigation(previous, next, "← Anterior", state.index === state.items.length - 1 ? "Recomeçar ↻" : "Próximo →");
}
function renderSummary(type) {
  const details = document.createElement("details"); details.className = "content-summary";
  const summary = document.createElement("summary"); summary.textContent = type === "sermoes" ? "Sumário de sermões — pesquisar por título" : "Sumário de liturgias — pesquisar por título";
  details.append(summary);
  const search = document.createElement("input"); search.type = "search"; search.className = "summary-search";
  search.placeholder = type === "sermoes" ? "Buscar sermão pelo título…" : "Buscar liturgia pelo título…";
  search.setAttribute("aria-label", "Pesquisar por título"); details.append(search);
  const results = document.createElement("div"); results.className = "summary-results"; details.append(results);
  const drawResults = () => {
    const term = search.value.trim().toLocaleLowerCase("pt-BR"); results.replaceChildren();
    const matches = state.items.filter((entry, index) => `${entry.titulo || "Sem título"} ${entry.numero || index + 1}`.toLocaleLowerCase("pt-BR").includes(term));
    const count = document.createElement("p"); count.className = "summary-count"; count.textContent = `${matches.length} resultado(s)`; results.append(count);
    matches.forEach(entry => {
      const originalIndex = state.items.indexOf(entry);
      const button = document.createElement("button"); button.type = "button"; button.className = "summary-item";
      button.textContent = `${String(entry.numero ?? originalIndex + 1).padStart(3, "0")} · ${entry.titulo || "Sem título"}`;
      button.addEventListener("click", () => { state.index = originalIndex; renderItem(type, null, true); });
      results.append(button);
    });
  };
  search.addEventListener("input", drawResults); drawResults(); content.append(details);
}
async function openSequential(type) {
  const labels = {
    devocionais: ["Devocionais", "Uma leitura por dia para alimentar a fé e orientar a caminhada cristã."],
    sermoes: ["Sermões", "Uma mensagem por dia, com sumário para localizar qualquer título."],
    liturgias: ["Liturgias", "Uma liturgia por dia, com sumário para localizar qualquer título."]
  };
  const [heading, subtitle] = labels[type];
  state.currentDailyType = type; state.currentCollection = null;
  showPanel(heading, subtitle, "SUA BIBLIOTECA", type);
  message("Abrindo os textos…");
  try {
    state.items = await loadMany(datasets[type]);
    if (!state.items.length) throw new Error("Os arquivos foram encontrados, mas não contêm registros reconhecidos.");
    state.index = dailyIndex(state.items.length);
    const withSummary = type === "sermoes" || type === "liturgias";
    renderItem(type, null, withSummary);
    scheduleDailyRefresh(type);
  } catch (error) {
    content.replaceChildren();
    message(`Não foi possível abrir os conteúdos: ${error.message}. Confira se Dados_JSON está ao lado do index.html.`, "error");
  }
}
async function openPromises() {
  state.currentDailyType = null; clearTimeout(state.dailyTimer);
  showPanel("Caixinha das Promessas", "Quatro coleções para contemplar Cristo e caminhar fundamentado nas Escrituras.", "COLEÇÕES", "promessas");
  const wrap = document.createElement("div"); wrap.className = "collection-grid";
  collections.forEach(collection => {
    const button = document.createElement("button"); button.type = "button";
    button.className = `collection-card collection-${collection.theme}`;
    button.style.backgroundImage = `linear-gradient(0deg,rgba(12,25,29,.82),rgba(12,25,29,.04)),url("${collection.image}")`;
    const name = document.createElement("span"); name.textContent = collection.title;
    const subtitle = document.createElement("small"); subtitle.textContent = `${collection.subtitle} ${collection.count} leituras`;
    button.append(name, subtitle); button.addEventListener("click", () => openCollection(collection)); wrap.append(button);
  });
  content.append(wrap);
}
async function openCollection(collection) {
  state.currentDailyType = "promessas"; state.currentCollection = collection;
  showPanel(collection.title, collection.subtitle, "CAIXINHA DAS PROMESSAS", collection.theme);
  message("Abrindo a coleção…");
  try {
    const data = await loadJson(collection.file);
    state.items = extractRecords(data).sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
    if (!state.items.length) throw new Error("A coleção não contém textos reconhecidos.");
    state.index = dailyIndex(state.items.length);
    renderItem("promessas", collection.image);
    scheduleDailyRefresh("promessas", collection.image);
  } catch (error) {
    content.replaceChildren(); message(`Não foi possível abrir ${collection.title}: ${error.message}`, "error");
  }
}
function openBible() {
  state.currentDailyType = null; clearTimeout(state.dailyTimer);
  showPanel("Bíblia Sagrada", "Escolha o testamento, o livro e o capítulo para consultar as Escrituras.", "ESCRITURAS", "biblia");
  const chooser = document.createElement("div"); chooser.className = "testament-grid";
  const testaments = [
    { name: "Antigo Testamento", theme: "old", subtitle: "Criação, alianças, história de Israel, poesia e profecia.", art: "Bíblia.png" },
    { name: "Novo Testamento", theme: "new", subtitle: "Jesus Cristo, a Igreja, as cartas apostólicas e a esperança eterna.", art: "Sermões.png" }
  ];
  testaments.forEach(item => {
    const button = document.createElement("button"); button.type = "button"; button.className = `testament-card ${item.theme}`;
    button.style.backgroundImage = `linear-gradient(145deg,rgba(15,35,42,.35),rgba(12,27,34,.92)),url("${item.art}")`;
    const strong = document.createElement("strong"); strong.textContent = item.name;
    const small = document.createElement("small"); small.textContent = item.subtitle;
    button.append(strong, small); button.addEventListener("click", () => showBooks(item.name)); chooser.append(button);
  });
  content.append(chooser);
}
function showBooks(testament) {
  state.testament = testament;
  content.replaceChildren();
  const books = (window.BIBLE_BOOKS || []).filter(book => book.testament === testament);
  const heading = document.createElement("h3"); heading.className = "subheading"; heading.textContent = testament; content.append(heading);
  const list = document.createElement("div"); list.className = "book-grid";
  books.forEach(book => { const button = makeButton(book.book, () => openBook(book), "book-link"); list.append(button); });
  content.append(list); content.append(makeButton("← Escolher outro testamento", openBible, "back-inline"));
}
async function openBook(book) {
  state.book = book; content.replaceChildren(); message(`Carregando ${book.book}…`);
  try {
    const data = await loadJson(book.path); state.bibleData = data; content.replaceChildren();
    const heading = document.createElement("h3"); heading.className = "subheading"; heading.textContent = data.livro || book.book; content.append(heading);
    const note = document.createElement("p"); note.className = "bible-intro"; note.textContent = `${data.capitulos.length} capítulo(s) · Tradução ${data.traducao || "bíblica"}`; content.append(note);
    const chapters = document.createElement("div"); chapters.className = "chapter-grid";
    data.capitulos.forEach(chapter => { const button = document.createElement("button"); button.type = "button"; button.className = "chapter-button"; button.textContent = chapter.numero; button.addEventListener("click", () => renderChapter(data, chapter)); chapters.append(button); });
    content.append(chapters); content.append(makeButton("← Voltar aos livros", () => showBooks(book.testament), "back-inline"));
  } catch (error) { content.replaceChildren(); message(`Não foi possível abrir ${book.book}: ${error.message}`, "error"); }
}
function renderChapter(book, chapter) {
  content.replaceChildren();
  const heading = document.createElement("h3"); heading.className = "subheading"; heading.textContent = `${book.livro} ${chapter.numero}`; content.append(heading);
  const article = document.createElement("article"); article.className = "bible-text";
  chapter.versiculos.forEach(verse => { const p = document.createElement("p"); const sup = document.createElement("sup"); sup.textContent = verse.numero; p.append(sup, document.createTextNode(` ${verse.texto}`)); article.append(p); });
  content.append(article);
  const index = book.capitulos.findIndex(item => item.numero === chapter.numero);
  const nav = document.createElement("div"); nav.className = "reading-nav";
  const back = document.createElement("button"); back.type = "button"; back.className = "nav-button"; back.textContent = "← Capítulos"; back.addEventListener("click", () => openBook(state.book));
  const count = document.createElement("span"); count.className = "reading-count"; count.textContent = `Capítulo ${chapter.numero} de ${book.capitulos.length}`;
  const next = document.createElement("button"); next.type = "button"; next.className = "nav-button primary"; next.textContent = index === book.capitulos.length - 1 ? "Voltar aos livros" : "Próximo capítulo →";
  next.addEventListener("click", () => index === book.capitulos.length - 1 ? showBooks(state.book.testament) : renderChapter(book, book.capitulos[index + 1]));
  nav.append(back, count, next); content.append(nav);
}


// CHAMADOS PARA SERVIR — três livros com leitura diária, sumário e navegação.
const chamadosBooks = [
  {
    key: "profissional",
    title: "O profissional que Deus Aprova",
    image: "imagens/chamados-para-servir/profissional-que-deus-aprova.png",
    subtitle: "Fé, caráter e propósito no trabalho.",
    file: `${ROOT}/ChamadosParaServir/O-profissional-que-Deus-Aprova.json`
  },
  {
    key: "cristo",
    title: "Como Deus Ensinou",
    image: "imagens/chamados-para-servir/como-deus-ensinou.png",
    subtitle: "Aprendendo com Cristo a trabalhar e servir.",
    file: `${ROOT}/ChamadosParaServir/como_deus_ensinou.json`
  },
  {
    key: "liderar",
    title: "Liderar Sem Perder a Alma",
    image: "imagens/chamados-para-servir/liderar-sem-perder-a-alma.png",
    subtitle: "Liderança com sabedoria, caráter e humanidade.",
    file: `${ROOT}/ChamadosParaServir/liderar_sem_perder_a_alma.json`
  }
];
let chamadosCurrentBook = null;
let chamadosRecords = [];

function chamadosImageUrl(path) {
  return new URL(path, APP_ROOT).href;
}
function openChamados() {
  state.currentDailyType = null;
  clearTimeout(state.dailyTimer);
  chamadosCurrentBook = null;
  showPanel("Chamados para Servir", "O trabalho como serviço a Deus.", "VOCAÇÃO, FÉ E SERVIÇO", "chamados");
  const hero = document.createElement("div");
  hero.className = "chamados-hero";
  hero.style.backgroundImage = `linear-gradient(0deg,rgba(9,20,24,.72),rgba(9,20,24,.04)),url("${chamadosImageUrl("LogodoChamadosparaServir.png")}")`;
  const heroTitle = document.createElement("strong");
  heroTitle.textContent = "Chamados para Servir";
  const heroText = document.createElement("span");
  heroText.textContent = "O trabalho como serviço a Deus.";
  hero.append(heroTitle, heroText);
  content.append(hero);

  const cards = document.createElement("div");
  cards.className = "chamados-book-grid";
  chamadosBooks.forEach(book => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chamados-book-card";
    const image = document.createElement("img");
    image.className = "chamados-book-image";
    image.src = chamadosImageUrl(book.image);
    image.alt = `Capa: ${book.title}`;
    image.loading = "lazy";
    image.onerror = () => { image.classList.add("image-failed"); image.alt = "Imagem indisponível"; };
    const title = document.createElement("strong");
    title.textContent = book.title;
    const subtitle = document.createElement("small");
    subtitle.textContent = book.subtitle;
    const action = document.createElement("span");
    action.className = "chamados-book-action";
    action.textContent = "Abrir livro →";
    button.append(image, title, subtitle, action);
    button.addEventListener("click", () => openChamadosBook(book));
    cards.append(button);
  });
  content.append(cards);
}

async function openChamadosBook(book, showContents = false) {
  state.currentDailyType = "chamados";
  clearTimeout(state.dailyTimer);
  chamadosCurrentBook = book;
  showPanel(book.title, book.subtitle, "CHAMADOS PARA SERVIR", "chamados");
  message("Carregando o conteúdo…");
  try {
    const data = await loadJson(book.file);
    chamadosRecords = extractRecords(data).sort((a,b) => Number(a.numero || 0) - Number(b.numero || 0));
    if (!chamadosRecords.length) throw new Error("O livro não contém textos reconhecidos.");
    state.items = chamadosRecords;
    state.index = showContents ? 0 : dailyIndex(chamadosRecords.length);
    renderChamadosBook(book, showContents);
    scheduleChamadosRefresh();
  } catch (error) {
    content.replaceChildren();
    message(`Não foi possível abrir ${book.title}: ${error.message}`, "error");
    content.append(makeButton("← Voltar aos três livros", openChamados, "back-inline"));
  }
}

function scheduleChamadosRefresh() {
  clearTimeout(state.dailyTimer);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 1);
  state.dailyTimer = setTimeout(() => {
    if (state.currentDailyType === "chamados" && chamadosCurrentBook && chamadosRecords.length) {
      state.index = dailyIndex(chamadosRecords.length);
      renderChamadosBook(chamadosCurrentBook, false);
    }
    if (state.currentDailyType === "chamados") scheduleChamadosRefresh();
  }, Math.max(1000, midnight.getTime()-now.getTime()));
}

function renderChamadosBook(book, showContents = false) {
  content.replaceChildren();
  const tools = document.createElement("div");
  tools.className = "chamados-tools";
  tools.append(
    makeButton("← Três livros", openChamados, "back-inline"),
    makeButton("☷ Sumário", () => renderChamadosSummary(book), "back-inline")
  );
  content.append(tools);
  if (showContents) {
    renderChamadosSummary(book);
    return;
  }
  const item = chamadosRecords[state.index];
  if (!item) { message("Texto não encontrado.", "warning"); return; }

  const hero = document.createElement("div");
  hero.className = "chamados-book-banner";
  const image = document.createElement("img");
  image.src = chamadosImageUrl(book.image);
  image.alt = "";
  hero.append(image);
  content.append(hero);

  const card = document.createElement("article");
  card.className = "reading-card chamados-reading-card";
  const stamp = document.createElement("p");
  stamp.className = "daily-stamp";
  stamp.textContent = `CONTEÚDO DO DIA · ${formatToday()}`;
  const kicker = document.createElement("p");
  kicker.className = "reading-kicker";
  kicker.textContent = item.numero == null ? "EPÍLOGO" : `TEXTO ${item.numero} DE ${chamadosRecords.length}`;
  const heading = document.createElement("h3");
  heading.textContent = item.titulo || "Leitura";
  card.append(stamp, kicker, heading);

  const labels = {
    subtitulo:"Apresentação", versiculo:"Versículo", leitura:"Leitura bíblica",
    versiculo_chave:"Versículo-chave", reflexao:"Reflexão",
    reflexao_introdutoria:"Reflexão introdutória", pratica_no_trabalho:"Prática no trabalho",
    aplicacao:"Aplicação", exame_pessoal:"Exame pessoal", oracao:"Oração",
    reflexao_final:"Reflexão final", conteudo:"Conteúdo"
  };
  const excluded = new Set(["identificador","numero","titulo","tipo"]);
  Object.entries(item).forEach(([key,value]) => {
    if (excluded.has(key) || value == null || value === "") return;
    const label = document.createElement("h4");
    label.className = "chamados-field-label";
    label.textContent = labels[key] || key.replaceAll("_"," ");
    card.append(label);
    (Array.isArray(value) ? value : [value]).forEach(part => {
      if (typeof part !== "string" || !part.trim()) return;
      const paragraph = document.createElement("p");
      paragraph.className = "reading-body chamados-paragraph";
      paragraph.textContent = part;
      card.append(paragraph);
    });
  });
  // Leitura em voz alta do conteúdo completo do texto atual.
  const listen = document.createElement("button");
  listen.type = "button";
  listen.className = "nav-button listen-button chamados-listen-button";
  listen.textContent = "🔊 Ouvir leitura";
  listen.setAttribute("aria-label", "Ouvir leitura do texto atual");
  const spokenParts = [
    item.titulo,
    item.subtitulo,
    item.versiculo,
    item.versiculo_chave,
    item.leitura,
    item.reflexao,
    item.reflexao_introdutoria,
    item.pratica_no_trabalho,
    item.aplicacao,
    item.exame_pessoal,
    item.oracao,
    item.reflexao_final,
    ...(Array.isArray(item.conteudo) ? item.conteudo : [item.conteudo])
  ];
  const spokenText = spokenParts
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === "string" && value.trim())
    .join(". ");
  listen.addEventListener("click", () => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      message("Este navegador não oferece leitura em voz alta. Experimente usar Chrome ou Edge atualizado.", "warning");
      return;
    }
    const speech = window.speechSynthesis;
    if (speech.speaking || speech.paused) {
      speech.cancel();
      listen.textContent = "🔊 Ouvir leitura";
      state.speechText = null;
      return;
    }
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    utterance.onend = () => { listen.textContent = "🔊 Ouvir leitura"; state.speechText = null; };
    utterance.onerror = () => { listen.textContent = "🔊 Ouvir leitura"; state.speechText = null; };
    state.speechText = utterance;
    listen.textContent = "■ Parar áudio";
    speech.speak(utterance);
  });
  card.append(listen);
  content.append(card);

  const nav = document.createElement("div");
  nav.className = "reading-nav";
  const previous = document.createElement("button");
  previous.type = "button"; previous.className = "nav-button";
  previous.textContent = "← Anterior"; previous.disabled = state.index === 0;
  previous.addEventListener("click", () => { state.index--; renderChamadosBook(book); });
  const count = document.createElement("span");
  count.className = "reading-count"; count.textContent = `${state.index+1} de ${chamadosRecords.length}`;
  const next = document.createElement("button");
  next.type = "button"; next.className = "nav-button primary";
  next.textContent = "Próximo →"; next.disabled = state.index >= chamadosRecords.length-1;
  next.addEventListener("click", () => { state.index++; renderChamadosBook(book); });
  nav.append(previous,count,next);
  content.append(nav);
}

function renderChamadosSummary(book) {
  content.replaceChildren();
  const heading = document.createElement("h3");
  heading.className = "chamados-summary-title";
  heading.textContent = `Sumário — ${book.title}`;
  const today = document.createElement("p");
  today.className = "chamados-count";
  today.textContent = `O texto sugerido para hoje é o nº ${dailyIndex(chamadosRecords.length)+1}. Selecione qualquer título para ler.`;
  content.append(heading,today);
  const list = document.createElement("div");
  list.className = "chamados-lesson-list";
  chamadosRecords.forEach((record,index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "chamados-lesson-link";
    const name = document.createElement("span");
    name.textContent = `${record.numero == null ? "Epílogo" : record.numero+". "+(record.titulo || "Sem título")}`;
    const arrow = document.createElement("b"); arrow.textContent = "›";
    button.append(name,arrow);
    button.addEventListener("click", () => {
      state.index = index;
      renderChamadosBook(book);
    });
    list.append(button);
  });
  content.append(list);
  content.append(makeButton("← Voltar ao conteúdo do dia", () => {
    state.index = dailyIndex(chamadosRecords.length);
    renderChamadosBook(book);
  }, "back-inline"));
}


// FORMADOS PARA AMAR — módulo independente; não altera Chamados para Servir.
const formadosBooks = [
  { key:"honra", title:"Para Conquistá-la com Honra", subtitle:"Aprendendo a amar com pureza, respeito e honra.", image:"01-Para-Conquista-la-com-Honra.png", file:`${ROOT}/FormadosParaAmar/para_conquista_la_com_honra.json` },
  { key:"altar", title:"Antes do Altar", subtitle:"Preparando o coração para a aliança do casamento.", image:"02-Antes-do-Altar.png", file:`${ROOT}/FormadosParaAmar/antes_do_altar.json` },
  { key:"casamento", title:"Edifique o Seu Casamento", subtitle:"Construindo o lar sobre o amor e a Palavra de Deus.", image:"03-Edifique-o-Seu-Casamento.png", file:`${ROOT}/FormadosParaAmar/edifique_o_seu_casamento.json` }
];
let formadosCurrentBook = null;
let formadosRecords = [];
function formadosImageUrl(path) { return new URL(`imagens/formados-para-amar/${path}`, APP_ROOT).href; }
function openFormados() {
  state.currentDailyType = null; clearTimeout(state.dailyTimer); formadosCurrentBook = null;
  showPanel("Formados para Amar", "Preparando o coração para um amor segundo o coração de Deus.", "AMOR, HONRA E ALIANÇA", "formados");
  const hero = document.createElement("div"); hero.className = "chamados-hero formados-hero";
  hero.style.backgroundImage = `linear-gradient(0deg,rgba(9,20,24,.72),rgba(9,20,24,.04)),url("${formadosImageUrl("Formados-para-Amar.png")}")`;
  const ht = document.createElement("strong"); ht.textContent = "Formados para Amar";
  const hs = document.createElement("span"); hs.textContent = "Preparando o coração para um amor segundo o coração de Deus.";
  hero.append(ht,hs); content.append(hero);
  const cards = document.createElement("div"); cards.className = "chamados-book-grid";
  formadosBooks.forEach(book => {
    const button = document.createElement("button"); button.type="button"; button.className="chamados-book-card";
    const image=document.createElement("img"); image.className="chamados-book-image"; image.src=formadosImageUrl(book.image); image.alt=`Capa: ${book.title}`; image.loading="lazy";
    image.onerror=()=>{image.classList.add("image-failed"); image.alt="Imagem indisponível";};
    const t=document.createElement("strong"); t.textContent=book.title;
    const sub=document.createElement("small"); sub.textContent=book.subtitle;
    const action=document.createElement("span"); action.className="chamados-book-action"; action.textContent="Abrir livro →";
    button.append(image,t,sub,action); button.addEventListener("click",()=>openFormadosBook(book)); cards.append(button);
  });
  content.append(cards);
}
async function openFormadosBook(book, showContents=false) {
  state.currentDailyType="formados"; clearTimeout(state.dailyTimer); formadosCurrentBook=book;
  showPanel(book.title,book.subtitle,"FORMADOS PARA AMAR","formados"); message("Carregando o conteúdo…");
  try {
    const data=await loadJson(book.file);
    formadosRecords=extractRecords(data).slice().sort((a,b)=>Number(a.numero||0)-Number(b.numero||0));
    if(!formadosRecords.length) throw new Error("O livro não contém textos reconhecidos.");
    state.items=formadosRecords; state.index=showContents?0:dailyIndex(formadosRecords.length);
    renderFormadosBook(book,showContents); scheduleFormadosRefresh();
  } catch(error) {
    content.replaceChildren(); message(`Não foi possível abrir ${book.title}: ${error.message}`,"error");
    content.append(makeButton("← Voltar aos três livros",openFormados,"back-inline"));
  }
}
function scheduleFormadosRefresh() {
  clearTimeout(state.dailyTimer); const now=new Date(); const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);
  state.dailyTimer=setTimeout(()=>{if(state.currentDailyType==="formados"&&formadosCurrentBook&&formadosRecords.length){state.index=dailyIndex(formadosRecords.length);renderFormadosBook(formadosCurrentBook,false);} if(state.currentDailyType==="formados")scheduleFormadosRefresh();},Math.max(1000,midnight.getTime()-now.getTime()));
}
function renderFormadosBook(book,showContents=false) {
  content.replaceChildren(); const tools=document.createElement("div"); tools.className="chamados-tools";
  tools.append(makeButton("← Três livros",openFormados,"back-inline"),makeButton("☷ Sumário",()=>renderFormadosSummary(book),"back-inline")); content.append(tools);
  if(showContents){renderFormadosSummary(book);return;}
  const item=formadosRecords[state.index]; if(!item){message("Texto não encontrado.","warning");return;}
  const hero=document.createElement("div");hero.className="chamados-book-banner";const image=document.createElement("img");image.src=formadosImageUrl(book.image);image.alt="";hero.append(image);content.append(hero);
  const card=document.createElement("article");card.className="reading-card chamados-reading-card";
  const stamp=document.createElement("p");stamp.className="daily-stamp";stamp.textContent=`CONTEÚDO DO DIA · ${formatToday()}`;
  const kicker=document.createElement("p");kicker.className="reading-kicker";kicker.textContent=`TEXTO ${item.numero??state.index+1} DE ${formadosRecords.length}`;
  const heading=document.createElement("h3");heading.textContent=item.titulo||"Leitura";card.append(stamp,kicker,heading);
  const labels={texto_base:"Texto base",acao_pratica:"Ação prática",cuidado_com_a_carne:"Cuidado com a carne",observacao_renova_me_deus_meu:"Observação Renova-me Deus Meu",referencia:"Referência bíblica",versiculo:"Versículo",enfase_teologica:"Ênfase teológica",enfase_pastoral_masculina:"Ênfase pastoral masculina",enfase_pratica:"Ênfase prática",reflexao:"Reflexão",aplicacao_pratica:"Aplicação prática"};
  const excluded=new Set(["identificador","numero","titulo","texto_integral","texto_original"]);
  Object.entries(item).forEach(([key,value])=>{if(excluded.has(key)||value==null||value==="")return;const label=document.createElement("h4");label.className="chamados-field-label";label.textContent=labels[key]||key.replaceAll("_"," ");card.append(label);(Array.isArray(value)?value:[value]).forEach(part=>{if(typeof part!=="string"||!part.trim())return;const p=document.createElement("p");p.className="reading-body chamados-paragraph";p.textContent=part;card.append(p);});});
  const listen=document.createElement("button");listen.type="button";listen.className="nav-button listen-button chamados-listen-button";listen.textContent="🔊 Ouvir leitura";
  const spokenText=[item.titulo,...Object.entries(item).filter(([k])=>!excluded.has(k)).map(([,v])=>v)].flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>typeof v==="string"&&v.trim()).join(". ");
  listen.addEventListener("click",()=>{if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined"){message("Este navegador não oferece leitura em voz alta. Experimente usar Chrome ou Edge atualizado.","warning");return;}const speech=window.speechSynthesis;if(speech.speaking||speech.paused){speech.cancel();listen.textContent="🔊 Ouvir leitura";return;}speech.cancel();const utterance=new SpeechSynthesisUtterance(spokenText);utterance.lang="pt-BR";utterance.rate=.95;utterance.onend=()=>listen.textContent="🔊 Ouvir leitura";utterance.onerror=()=>listen.textContent="🔊 Ouvir leitura";listen.textContent="■ Parar áudio";speech.speak(utterance);});
  card.append(listen);content.append(card);
  const nav=document.createElement("div");nav.className="reading-nav";const prev=document.createElement("button");prev.type="button";prev.className="nav-button";prev.textContent="← Anterior";prev.disabled=state.index===0;prev.addEventListener("click",()=>{state.index--;renderFormadosBook(book);});
  const count=document.createElement("span");count.className="reading-count";count.textContent=`${state.index+1} de ${formadosRecords.length}`;
  const next=document.createElement("button");next.type="button";next.className="nav-button primary";next.textContent="Próximo →";next.disabled=state.index>=formadosRecords.length-1;next.addEventListener("click",()=>{state.index++;renderFormadosBook(book);});nav.append(prev,count,next);content.append(nav);
}
function renderFormadosSummary(book) {
  content.replaceChildren();const heading=document.createElement("h3");heading.className="chamados-summary-title";heading.textContent=`Sumário — ${book.title}`;
  const today=document.createElement("p");today.className="chamados-count";today.textContent=`O texto sugerido para hoje é o nº ${formadosRecords[dailyIndex(formadosRecords.length)]?.numero??dailyIndex(formadosRecords.length)+1}. Selecione qualquer título para ler.`;content.append(heading,today);
  const list=document.createElement("div");list.className="chamados-lesson-list";formadosRecords.forEach((record,index)=>{const button=document.createElement("button");button.type="button";button.className="chamados-lesson-link";const name=document.createElement("span");name.textContent=`${record.numero==null?"Texto":record.numero+"."} ${record.titulo||"Sem título"}`;const arrow=document.createElement("b");arrow.textContent="›";button.append(name,arrow);button.addEventListener("click",()=>{state.index=index;renderFormadosBook(book);});list.append(button);});content.append(list);
  content.append(makeButton("← Voltar ao conteúdo do dia",()=>{state.index=dailyIndex(formadosRecords.length);renderFormadosBook(book);},"back-inline"));
}

function openCredits() {
  showPanel("Créditos", "Conheça os responsáveis pela elaboração do aplicativo.", "RENOVA-ME DEUS MEU", "default");
  const card = document.createElement("article");
  card.className = "reading-card credits-card";
  const heading = document.createElement("h3");
  heading.textContent = "Créditos";
  const paragraph = document.createElement("p");
  paragraph.textContent = "Elaborado por Rosilene Maria da Silva Oliveira e Ricardo Augusto de Oliveira, criadores da Renova-me Deus Meu, com uso de ferramentas como ChatGPT, Visual Studio, e GitHub, 02/11/2026";
  card.append(heading, paragraph);
  content.append(card);
}

const actions = {
  biblia: openBible,
  sermoes: () => openSequential("sermoes"),
  liturgias: () => openSequential("liturgias"),
  devocionais: () => openSequential("devocionais"),
  promessas: openPromises,
  chamados: openChamados,
  formados: openFormados
};
document.querySelectorAll("[data-section]").forEach(card => card.addEventListener("click", event => {
  event.preventDefault(); const key = card.dataset.section; history.replaceState(null, "", `#${key}`); actions[key]?.();
}));
document.getElementById("backButton").addEventListener("click", () => {
  state.currentDailyType = null; clearTimeout(state.dailyTimer);
  panel.hidden = true; grid.hidden = false; history.replaceState(null, "", location.pathname); window.scrollTo({ top: 0, behavior: "smooth" });
});
document.getElementById("creditsButton").addEventListener("click", openCredits);
document.getElementById("menuButton").addEventListener("click", event => {
  const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!expanded)); event.currentTarget.textContent = expanded ? "☰" : "×";
  grid.hidden = !expanded; panel.hidden = true;
});
if (location.hash && actions[location.hash.slice(1)]) actions[location.hash.slice(1)]();
