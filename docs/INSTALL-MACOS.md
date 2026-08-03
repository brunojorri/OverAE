# Instalação no macOS

> A versão macOS ainda deve ser validada em uma máquina real antes da distribuição para equipes.

## Requisitos da versão beta

- Figma Desktop.
- Adobe After Effects 2026 (26.x).
- Node.js 18 ou mais recente.
- Git.

## Instalação automática

No Terminal:

```bash
git clone https://github.com/brunojorri/OverAE.git
cd OverAE
bash ./install/macos/install.sh
```

## Registrar o plugin no Figma

1. Abra **Plugins > Development > Import plugin from manifest**.
2. Selecione `~/Library/Application Support/OverAE/figma-plugin/manifest.json`.
3. Execute o OverAE em um documento.

## Caminhos utilizados

- After Effects: `~/Library/Application Support/Adobe/CEP/extensions/overae`
- Ponte: `~/Library/Application Support/OverAE/bridge`
- Figma: `~/Library/Application Support/OverAE/figma-plugin`
- Inicialização: `~/Library/LaunchAgents/com.brunojorri.overae.bridge.plist`

## Desinstalação

```bash
bash ./install/macos/uninstall.sh
```
