# Disk Janitor

App macOS local para diagnosticar e limpar disco por categorias, com tiers de segurança e fluxo *preview → confirmar*. Nada é apagado direto — tudo vai pra Lixeira, restaurável enquanto ela não for esvaziada.

![Logo](resources/icon.png)

---

## Sumário

- [Visão geral](#visão-geral)
- [Categorias](#categorias)
- [Como usar](#como-usar)
- [Arquitetura](#arquitetura)
- [Modelo de segurança](#modelo-de-segurança)
- [Estender: adicionar uma categoria](#estender-adicionar-uma-categoria)
- [Stack](#stack)
- [Roadmap](#roadmap)

---

## Visão geral

O app resolve um problema recorrente: ver rapidamente **onde está indo o espaço** do SSD e limpar com confiança. Diferente de "limpadores mágicos", aqui você:

1. Escaneia por categoria (sem tocar em nada)
2. Vê item por item (path, tamanho, última modificação)
3. Seleciona o que quer
4. **Preview** antes de qualquer ação
5. Envia pra Lixeira (nunca `rm -rf`)
6. Histórico e disco atualizam sozinhos

Cada categoria carrega um **tier de segurança** que orienta a decisão:

| Tier | Cor | Significado |
|---|---|---|
| 🟢 `safe` | verde | Caches ou dados regeneráveis. Nenhum login é perdido. |
| 🟡 `caution` | amarelo | Pode invalidar sessões locais ou cache offline de apps. |
| 🔴 `review` | vermelho | Envolve arquivos pessoais. Revisar 1 a 1. |

---

## Categorias

### 🟢 Safe (4)
- **Caches de browsers e apps** — Spotify, Arc, Chrome, updaters (Figma/Beekeeper/Gather), Playwright, TypeScript, CloudKit
- **Ferramentas de dev** — pnpm store, npm cache, `~/.cache`, Gradle caches
- **Docker** — `Docker.raw` (informativo, sparse file) + estimativa de `docker system prune -a --volumes`
- **Wallpapers dinâmicos (aerials)** — vídeos `.mov` em `~/Library/Application Support/com.apple.wallpaper/aerials/videos`. **Preserva o wallpaper ativo** (detectado via `Store/Index.plist`).

### 🟡 Caution (2)
- **Caches de apps Electron** — cirúrgico por app: só as subpastas `Cache`, `Code Cache`, `GPUCache`, `DawnCache`, `Service Worker/CacheStorage`, `Service Worker/ScriptCache`. Preserva `Local Storage`, `IndexedDB`, `Cookies`, logins e dados do usuário. Apps: Claude, Cursor, VS Code, Discord, Notion, Figma, GatherV2, ChatGPT Atlas.
- **Downloads antigos** — `.dmg`, `.pkg`, `.iso`, `.zip`, `.tar.gz`, `.xz` em `~/Downloads` com `mtime > 30 dias`.

### 🔴 Review (2)
- **Apps não abertos há tempos** — `/Applications/*.app` sem uso há mais de 180 dias (via `mdls -name kMDItemLastUsedDate`).
- **Arquivos grandes** — top 30 arquivos `> 500 MB` no `$HOME` (via `mdfind`), excluindo `node_modules/`, `.git/`, `.venv/`, `venv/`, `__pycache__/`, bundles (`*.app`, `*.photoslibrary`, `*.musiclibrary`, `*.imovielibrary`, `*.framework`, `*.bundle`, `*.kext`, `*.pkg`), `Library/Containers/com.docker.docker/` e `Library/CloudStorage/`.

---

## Como usar

### Rodar via app instalado
Se já está em `/Applications/`, é só abrir pelo Launchpad / Spotlight / Finder.

### Onde ficam os dados do próprio app
```
~/Library/Application Support/disk-janitor/history.jsonl   # log de limpezas
```

---

## Fluxo de trabalho — depois de fazer alterações

Dois cenários. Escolha pela **frequência da mudança**.

### A) Iterando código (várias mudanças por minuto)
Use dev — HMR do renderer, rebuild automático de main/preload.

```bash
cd ~/disk-janitor
pnpm dev
```

- **Alterou renderer** (`.tsx`, `.css`)? A janela atualiza sozinha, sem perder estado.
- **Alterou main/preload** (`src/main/**`, `src/preload/**`, `src/shared/**`)? O electron-vite rebuilda e reinicia a janela.
- **Adicionou dependência** ou o main não pegou a mudança? Reinicie o dev:
  ```bash
  pkill -f "electron-vite.js dev" ; pkill -f "disk-janitor.*Electron"
  pnpm dev
  ```

### B) Atualizando o app instalado em `/Applications/`
Quando terminar as mudanças e quiser refletir no app que abre pelo Launchpad, empacote de novo:

```bash
cd ~/disk-janitor
pkill -f "Disk Janitor"                                              # fecha se estiver aberto
pnpm dist                                                            # build + electron-builder
codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app"   # ad-hoc sign (obrigatório em Apple Silicon)
ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app"
open "/Applications/Disk Janitor.app"                                # verifica
```

Se quiser um one-liner pra colocar no `~/.zshrc` como alias:
```bash
alias dj-update='cd ~/disk-janitor && pkill -f "Disk Janitor"; pnpm dist && codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app" && ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app" && open "/Applications/Disk Janitor.app"'
```

### C) Validando antes de empacotar
```bash
pnpm typecheck   # tsc --noEmit em main+preload e renderer
pnpm build       # electron-vite build (só gera out/, não empacota)
```

### Cheatsheet
| Situação | Comando |
|---|---|
| Instalar deps (1ª vez ou após mudar package.json) | `pnpm install` |
| Desenvolver com HMR | `pnpm dev` |
| Verificar TS sem rodar | `pnpm typecheck` |
| Build sem empacotar (out/) | `pnpm build` |
| Empacotar `.app` (dist/) | `pnpm dist` |
| Atualizar app em /Applications | ver seção B acima |
| Ver histórico de limpezas | Botão **Histórico** no header do app |
| Restaurar algo apagado | Abrir Lixeira do macOS, clicar direito → Colocar de volta |

---

## Arquitetura

**Processo principal (Node) ↔ preload (bridge) ↔ renderer (React)**, com contratos Zod compartilhados como fonte de verdade.

```
src/
├── main/                      # processo Node do Electron
│   ├── index.ts               # bootstrap + BrowserWindow + dock icon
│   ├── ipc/                   # handlers registrados via ipcMain.handle
│   │   ├── scan.handler.ts
│   │   ├── clean.handler.ts   # emite eventos de progresso via event.sender.send
│   │   └── history.handler.ts
│   ├── domain/                # 100% TS puro, sem Electron → testável
│   │   ├── categories.ts      # catálogo (meta + scan + cleanItem por categoria)
│   │   ├── scanner.ts         # orquestra scan (chama category.scan e agrega)
│   │   ├── cleaner.ts         # orquestra clean (re-scan + progress + history)
│   │   ├── safety.ts          # expandPath + assertAllowed (whitelist)
│   │   ├── trash.ts           # shell.trashItem + trashChildren
│   │   └── history.ts         # JSONL append + read
│   └── infra/                 # bordas de sistema (child_process, fs, mdls, mdfind)
│       ├── shell.ts           # execFile promisificado (nunca exec)
│       ├── df.ts              # parse `df -k`
│       ├── du.ts              # parse `du -sk` ou stat pra sparse files
│       ├── docker.ts          # docker system df/prune + parse
│       ├── wallpaper.ts       # detecta wallpaper ativo (plutil → json)
│       ├── appCaches.ts       # helper genérico Electron cache dirs
│       ├── apps.ts            # scan /Applications via mdls
│       ├── downloads.ts       # scan ~/Downloads por instaladores antigos
│       └── largeFiles.ts      # mdfind + skip list
│
├── preload/
│   └── bridge.ts              # expõe API mínima via contextBridge
│
├── shared/                    # fonte de verdade (importado por main e renderer)
│   ├── ipc-contract.ts        # schemas Zod + IpcChannel/IpcEvent enums
│   └── types.ts               # re-export de tipos
│
└── renderer/                  # UI React
    ├── App.tsx                # roteamento simples: dashboard vs categoria
    ├── main.tsx               # bootstrap createRoot
    ├── index.css              # tokens de tema + tailwind
    ├── env.d.ts               # tipa window.janitor
    ├── views/
    │   ├── Dashboard.tsx      # gauge + grid de categorias
    │   ├── CategoryView.tsx   # tabela + seleção + preview + limpeza
    │   └── HistoryDrawer.tsx  # painel lateral com histórico
    ├── components/
    │   ├── Logo.tsx           # SVG inline (aceita withBackground)
    │   ├── DiskGauge.tsx      # barra usado/livre com cor por tier
    │   ├── CategoryCard.tsx   # card do dashboard
    │   ├── SafetyBadge.tsx    # badge de tier
    │   ├── CleanupBar.tsx     # rodapé fixo com contadores + ações
    │   ├── PreviewDialog.tsx  # modal de confirmação
    │   ├── ProgressOverlay.tsx# overlay durante limpeza
    │   └── ui/                # shadcn primitives (button, card, badge, checkbox, dialog)
    ├── store/                 # Zustand slices
    │   ├── scan.store.ts      # disco, categorias, scans, progresso, histórico
    │   └── selection.store.ts # Sets de itens selecionados por categoria
    └── lib/
        ├── format.ts          # formatBytes/percent/date
        └── utils.ts           # cn helper (clsx + twMerge)
```

**Princípios**
- **IPC como contrato**: `shared/ipc-contract.ts` define schemas Zod. Main valida entrada com `.parse()`. Renderer importa os tipos. Se o schema mudar, TS quebra os dois lados.
- **Feature-first no renderer**, layer-first no main (domain / infra / ipc).
- **Não escrevemos "utils"**. Cada função mora perto do domínio dela.
- **Sem comentários explicando o QUE o código faz** — nomes fazem isso. Só documentamos aqui.

---

## Modelo de segurança

Cinco garantias, não-negociáveis:

1. **Whitelist de paths** — `assertAllowed()` bloqueia qualquer path fora de `$HOME`, `/Applications` ou `/opt/homebrew`. Chamada antes de qualquer trashPath.
2. **Nunca `rm -rf`** — toda deleção usa `shell.trashItem` do Electron (nativo do macOS). Restaurável pela Lixeira enquanto ela não for esvaziada.
3. **`execFile`, nunca `exec`** — sem string interpolation em shell (evita injeção). Args passados como array.
4. **Re-scan antes de limpar** — o cleaner re-executa o scan da categoria antes de agir. Renderer só envia `itemIds`, nunca dados stale.
5. **Preview obrigatório** — a UI só chama `cleanCategory` após confirmação explícita no `PreviewDialog`.

Bonus:
- Docker.raw marcado `cleanable: false` (é sparse — não faz sentido "deletar")
- Wallpaper cleaner preserva o wallpaper ativo. Se o plist estiver corrompido, preserva **tudo** por precaução.
- History é best-effort — falha nele não aborta cleanup nem afeta bytes liberados reportados.

---

## Estender: adicionar uma categoria

Toda a lógica mora em `src/main/domain/categories.ts`. Uma categoria é:

```ts
type Category = {
  meta: CategoryMeta
  scan: () => Promise<ScanOutput>
  cleanItem: (item: ScanItem) => Promise<number>  // retorna bytes liberados
}
```

**Passo a passo:**

1. Definir os targets (ou implementar scan customizado). Ex:
   ```ts
   const MY_TARGETS: Target[] = [
     { id: 'my-app', label: 'Meu App', path: '~/Library/Caches/com.myapp' },
   ]
   ```
2. Adicionar ao array `CATEGORIES`:
   ```ts
   {
     meta: {
       id: 'my-category',
       label: 'Minha categoria',
       description: 'O que ela faz.',
       tier: 'safe',        // 'safe' | 'caution' | 'review'
       icon: 'terminal',    // veja ICONS em CategoryCard.tsx
     },
     scan: () => measureTargets(MY_TARGETS),
     cleanItem: (item) => trashChildren(item.path),
   },
   ```
3. Se precisar de ícone novo, adicionar em `src/renderer/components/CategoryCard.tsx` no map `ICONS`.

Não precisa mexer em UI, IPC nem preload — o resto é automático.

---

## Stack

- **Runtime**: Electron 34 + electron-vite 3
- **UI**: React 19 + TypeScript 5.7 + Tailwind 3.4 + shadcn primitives (Radix Dialog/Checkbox) + Sonner (toasts) + Lucide icons
- **State**: Zustand 5
- **Contratos**: Zod 3
- **Packaging**: electron-builder 26 (target `dir`, ad-hoc signed)
- **Node**: 24 · **pnpm**: 10

**Bundle final**
- main: ~27 KB · preload: ~3 KB · renderer: ~880 KB · `.app`: ~271 MB (Electron runtime é o gordo)

---

## Roadmap

**Feito**
- M1 — Bootstrap + Dashboard + DiskGauge + scan read-only
- M2 — Preview + clean via Lixeira + progress em tempo real + history + toasts
- M3 — Tier caution: caches Electron por app + downloads antigos
- M4 — Tier review: apps não usados + arquivos grandes
- Logo + ícone + packaging + instalação em `/Applications`

**Poderia vir depois**
- Time Machine snapshots locais (precisa `sudo`, exige prompt admin nativo)
- Assinatura + notarization pra distribuição fora da máquina (DMG + Apple Developer ID)
- Whitelist configurável de apps Electron adicionais
- Análise incremental do `$HOME` (treemap tipo GrandPerspective)
- Restore rápido do último cleanup via history log
