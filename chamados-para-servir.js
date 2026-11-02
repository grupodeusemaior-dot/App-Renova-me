/* Chamados para Servir — integração independente ao Renova-me Deus Meu.
   Requer os três JSONs e a imagem de capa na mesma pasta indicada abaixo. */
(() => {
  "use strict";

  const ARQUIVOS = {
    profissional: "dados/O-profissional-que-Deus-Aprova.json",
    cristo: "dados/como_deus_ensinou.json",
    liderar: "dados/liderar_sem_perder_a_alma.json"
  };

  const SITE = "https://sites.google.com/view/grupo-deus-e-maior/p%C3%A1gina-inicial?authuser=0";
  const CREDITOS = "Elaborado por Rosilene Maria da Silva Oliveira e Ricardo Augusto de Oliveira, criadores da Renova-me Deus Meu, com uso de ferramentas como ChatGPT, Visual Studio, e GitHub, 02/11/2026";

  const livros = [
    { id: "profissional", titulo: "O profissional que Deus Aprova", descricao: "Fé, caráter e propósito no trabalho." },
    { id: "cristo", titulo: "Como Deus Ensinou", descricao: "Aprendendo com Cristo a trabalhar e servir." },
    { id: "liderar", titulo: "Liderar Sem Perder a Alma", descricao: "Liderança com sabedoria, caráter e humanidade." }
  ];

  let dadosCarregados = {};
  let telaAnterior = null;

  const el = (tag, classe, texto) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  };

  function obterOuCriarArea() {
    let area = document.getElementById("rm-chamados-area");
    if (!area) {
      area = el("section", "rm-cs tela");
      area.id = "rm-chamados-area";
      area.hidden = true;
      area.setAttribute("aria-label", "Chamados para Servir");
      document.body.appendChild(area);
    }
    return area;
  }

  const area = obterOuCriarArea();

  function esconderTelasDoApp() {
    const telas = document.querySelectorAll(".tela");
    telas.forEach(t => {
      if (!t.hidden && t.id !== "rm-chamados-area") {
        telaAnterior = t;
        t.hidden = true;
      }
    });
  }

  function abrirArea() {
    esconderTelasDoApp();
    area.hidden = false;
    mostrarMenuLivros();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarApp() {
    area.hidden = true;
    if (telaAnterior) telaAnterior.hidden = false;
    else {
      const inicial = document.querySelector("#tela-inicial");
      if (inicial) inicial.hidden = false;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cabecalho(titulo, subtitulo) {
    const header = el("header", "rm-cs-header");
    const h = el("h1", "", titulo);
    const p = el("p", "", subtitulo);
    header.append(h, p);
    return header;
  }

  function mostrarMenuLivros() {
    area.replaceChildren();
    const topo = cabecalho("Chamados para Servir", "O trabalho como serviço a Deus");
    const capa = el("img", "rm-cs-capa");
    capa.src = "imagens/Chamados-para-Servir.jpg";
    capa.alt = "Chamados para Servir — O trabalho como serviço a Deus";
    capa.onerror = () => { capa.hidden = true; };
    const lista = el("div", "rm-cs-lista");

    livros.forEach(livro => {
      const card = el("button", "rm-cs-livro");
      card.type = "button";
      const nome = el("strong", "", livro.titulo);
      const desc = el("span", "", livro.descricao);
      card.append(nome, desc);
      card.addEventListener("click", () => abrirLivro(livro));
      lista.appendChild(card);
    });

    const voltar = el("button", "rm-cs-voltar", "Voltar ao aplicativo");
    voltar.addEventListener("click", voltarApp);
    area.append(topo, capa, lista, voltar);
  }

  async function carregarLivro(id) {
    if (dadosCarregados[id]) return dadosCarregados[id];
    const resposta = await fetch(ARQUIVOS[id], { cache: "no-store" });
    if (!resposta.ok) throw new Error(`Não foi possível abrir ${ARQUIVOS[id]} (${resposta.status}).`);
    const dados = await resposta.json();
    if (!Array.isArray(dados.textos)) throw new Error("O JSON não contém a lista 'textos'.");
    dadosCarregados[id] = dados;
    return dados;
  }

  async function abrirLivro(livro) {
    area.replaceChildren();
    area.appendChild(cabecalho(livro.titulo, "O trabalho como serviço a Deus"));
    const aviso = el("p", "rm-cs-status", "Carregando conteúdo…");
    area.appendChild(aviso);
    try {
      const dados = await carregarLivro(livro.id);
      aviso.remove();
      const lista = el("div", "rm-cs-capitulos");
      dados.textos.forEach((registro, index) => {
        const item = el("article", "rm-cs-texto");
        const titulo = registro.titulo || `Texto ${index + 1}`;
        const h = el("h2", "", titulo);
        item.appendChild(h);

        if (registro.subtitulo) item.appendChild(el("p", "rm-cs-subtitulo", registro.subtitulo));
        if (registro.versiculo || registro.versiculo_chave || registro.leitura) {
          const v = registro.versiculo || registro.versiculo_chave || registro.leitura;
          item.appendChild(el("blockquote", "rm-cs-versiculo", v));
        }

        const camposIgnorados = new Set([
          "identificador", "numero", "titulo", "subtitulo",
          "versiculo", "versiculo_chave", "leitura", "tipo"
        ]);
        Object.entries(registro).forEach(([chave, valor]) => {
          if (camposIgnorados.has(chave) || valor === null || valor === undefined || valor === "") return;
          const rotulo = chave.replaceAll("_", " ").replace(/^\w/, c => c.toUpperCase());
          if (Array.isArray(valor)) {
            valor.forEach(paragrafo => {
              if (typeof paragrafo === "string") item.appendChild(el("p", "rm-cs-paragrafo", paragrafo));
            });
          } else if (typeof valor === "string") {
            item.appendChild(el("h3", "rm-cs-rotulo", rotulo));
            item.appendChild(el("p", "rm-cs-paragrafo", valor));
          }
        });
        lista.appendChild(item);
      });
      area.appendChild(lista);
      const voltar = el("button", "rm-cs-voltar", "Voltar aos três livros");
      voltar.addEventListener("click", mostrarMenuLivros);
      area.appendChild(voltar);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (erro) {
      aviso.textContent = `${erro.message} Confira se os três arquivos JSON estão na pasta dados/.`;
      aviso.classList.add("rm-cs-erro");
      const voltar = el("button", "rm-cs-voltar", "Voltar aos três livros");
      voltar.addEventListener("click", mostrarMenuLivros);
      area.appendChild(voltar);
    }
  }

  function abrirCreditos() {
    let modal = document.getElementById("rm-creditos-modal");
    if (!modal) {
      modal = el("div", "rm-cs-modal");
      modal.id = "rm-creditos-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      const caixa = el("div", "rm-cs-modal-caixa");
      caixa.append(el("h2", "", "Créditos"), el("p", "", CREDITOS));
      const fechar = el("button", "rm-cs-voltar", "Fechar");
      fechar.addEventListener("click", () => modal.remove());
      caixa.appendChild(fechar);
      modal.appendChild(caixa);
      document.body.appendChild(modal);
      modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    }
  }

  function conectarBotoes() {
    const btnModulo = document.getElementById("btn-chamados-servir");
    if (btnModulo) btnModulo.addEventListener("click", abrirArea);

    const btnCreditos = document.getElementById("btn-creditos-rdm");
    if (btnCreditos) btnCreditos.addEventListener("click", abrirCreditos);

    const btnSite = document.getElementById("btn-nosso-site");
    if (btnSite) {
      btnSite.addEventListener("click", () => window.open(SITE, "_blank", "noopener,noreferrer"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", conectarBotoes);
  } else {
    conectarBotoes();
  }

  // Disponibiliza abertura para menus existentes que prefiram chamar via código.
  window.RenovaChamadosParaServir = { abrir: abrirArea, creditos: abrirCreditos };
})();
