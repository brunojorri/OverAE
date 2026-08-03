# Instalação no Windows

## Requisitos da versão beta

- Figma Desktop.
- Adobe After Effects 2026 (26.x).
- Node.js 18 ou mais recente.

## Instalação automática

No PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/brunojorri/OverAE/main/install/windows/bootstrap.ps1 | iex"
```

O comando baixa o pacote diretamente do GitHub, sem exigir Git ou GitHub Desktop. Em seguida, instala o painel do After Effects no perfil do usuário, copia a ponte local e configura sua inicialização automática.

## Registrar o plugin no Figma

O instalador exibe o caminho final do manifesto. No Figma Desktop:

1. Abra **Plugins > Development > Import plugin from manifest**.
2. Selecione o arquivo `manifest.json` indicado pelo instalador.
3. Execute o OverAE em um documento.

Essa confirmação única é exigida pelo Figma para plugins locais de desenvolvimento.

## Instalação manual

1. Copie `ae-cep-panel` para `%APPDATA%\Adobe\CEP\extensions\overae`.
2. Copie `local-bridge` para `%LOCALAPPDATA%\OverAE\bridge`.
3. Copie `figma-plugin` para `%LOCALAPPDATA%\OverAE\figma-plugin`.
4. Execute `node server.js` dentro da pasta da ponte.
5. Importe `%LOCALAPPDATA%\OverAE\figma-plugin\manifest.json` pelo Figma Desktop.
6. Reinicie o After Effects e abra **Window > Extensions > OverAE**.

## Desinstalação

Execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1
```
