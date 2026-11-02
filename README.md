# App Renova-me

Projeto inicial em HTML, CSS e JavaScript puro, preparado para abrir no Visual Studio Code.

## Como executar
1. Extraia a pasta `App Renova-me`.
2. Abra essa pasta no Visual Studio Code.
3. Instale a extensão **Live Server** (se ainda não tiver).
4. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.

Não abra `index.html` diretamente com `file://`: o navegador bloqueia algumas leituras `fetch()` dos arquivos JSON.

## Organização
- `index.html`: estrutura da tela inicial.
- `css/style.css`: identidade visual e responsividade.
- `js/app.js`: navegação inicial e carregamento de dados JSON.
- `DadosBase/`: documentos originais.
- `Dados_JSON/`: bases JSON organizadas por área.

## Estado desta primeira versão
A tela inicial e a navegação entre áreas estão preparadas. A leitura completa de cada formato de JSON, a navegação por livros/capítulos da Bíblia, busca, favoritos e progresso de leitura serão implementados em etapas, após validarmos a estrutura interna de cada coleção.

## Observação
Os arquivos originais e as bases de dados recebidas foram preservados. Os arquivos iniciais do aplicativo foram adicionados sem sobrescrever os dados.
