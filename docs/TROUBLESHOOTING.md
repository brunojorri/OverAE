# Solução de problemas

## O painel não aparece no After Effects

- Reinicie o After Effects depois da instalação.
- Procure por **OverAE** em **Window > Extensions** ou **Extensions (Legacy)**.
- Confirme que o After Effects é a versão 26.x.

## Ponte desconectada

- Confirme que o Node.js 18 ou superior está instalado: `node --version`.
- Inicie manualmente `node server.js` dentro da pasta `local-bridge`.
- Confirme que nenhum outro programa está usando a porta `47831`.

## O Figma não aceita o manifesto

- Use o Figma Desktop, não apenas o navegador.
- Selecione exatamente o arquivo `figma-plugin/manifest.json`.
- Remova uma versão de desenvolvimento antiga do OverAE e importe novamente.

## Rede corporativa

OverAE utiliza somente a interface local `127.0.0.1`. Políticas corporativas podem bloquear scripts, extensões CEP não assinadas ou processos iniciados automaticamente. Nesses casos, solicite a liberação ao suporte de TI ou use a instalação manual.
