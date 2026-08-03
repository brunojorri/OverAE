# OverAE

OverAE envia frames e layers selecionadas no Figma diretamente para o Adobe After Effects, preservando o máximo possível da estrutura visual em uma composição plana e editável.

> Estado atual: MVP/Beta. A versão para Windows foi validada com After Effects 2026 (26.3). O instalador para macOS ainda precisa ser validado em uma máquina Mac antes de ser considerado estável.

## Recursos atuais

- Envio de frames completos ou layers individuais com um clique.
- Composições planas, sem pré-composições automáticas.
- Text layers editáveis com família, estilo, peso, tamanho óptico, tracking, entrelinha e alinhamento.
- Retângulos, elipses e vetores como shape layers editáveis.
- Imagens originais, sem destruição do enquadramento.
- Máscaras do Figma convertidas em track mattes.
- Fills, strokes, opacidade herdada, blend modes, blur e gradiente linear.
- Auto Layout e frames aninhados reinterpretados como layers planas.
- Assets organizados automaticamente na pasta `_OverAE`.
- Limpeza de footages não utilizadas pelo painel do After Effects.

## Instalação rápida para beta

Durante o beta, é necessário ter [Node.js 18 ou mais recente](https://nodejs.org/) instalado. Git e GitHub Desktop não são necessários. A versão final terá instaladores que incluem a ponte e dispensam também o Node.js.

### Windows

Abra o PowerShell e execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; irm https://raw.githubusercontent.com/brunojorri/OverAE/main/install/windows/bootstrap.ps1 | iex
```

### macOS

Abra o Terminal e execute:

```bash
curl -fsSL https://raw.githubusercontent.com/brunojorri/OverAE/main/install/macos/bootstrap.sh | bash
```

Depois da instalação, siga a etapa única mostrada pelo instalador para importar o `manifest.json` no Figma Desktop. O Figma não oferece uma API oficial para instalar silenciosamente plugins locais de desenvolvimento.

## Instalação manual

Consulte:

- [Windows](docs/INSTALL-WINDOWS.md)
- [macOS](docs/INSTALL-MACOS.md)
- [Problemas conhecidos](docs/TROUBLESHOOTING.md)

## Como usar

1. Abra o painel em **Window > Extensions > OverAE** no After Effects.
2. Abra o plugin OverAE no Figma.
3. Selecione um frame e use **Enviar frame**, ou selecione uma layer e use **Enviar layer**.
4. O After Effects recebe o conteúdo automaticamente.

Não é necessário copiar token. Toda comunicação ocorre localmente em `127.0.0.1:47831`; o conteúdo do documento não é enviado para servidores externos.

## Desenvolvimento

```powershell
cd figma-plugin
npm install
npm run build
```

Para iniciar a ponte:

```powershell
cd local-bridge
npm start
```

O contrato de dados fica em [`shared/scene.schema.json`](shared/scene.schema.json).

## Autor

Criado por [Bruno Jorri](https://www.instagram.com/brunojorri_work/).

## Aviso

OverAE é um projeto original e independente. Adobe, After Effects e Figma são marcas de seus respectivos proprietários. Nenhum código proprietário de outras extensões deve ser incluído neste repositório.
