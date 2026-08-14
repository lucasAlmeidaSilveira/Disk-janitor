<p align="center">
  <img src="resources/icon.png" width="128" alt="Disk Janitor" />
</p>

<h1 align="center">Disk Janitor</h1>

<p align="center">
  Limpeza de disco no macOS com tiers de segurança, preview obrigatório e envio pra Lixeira — nunca <code>rm -rf</code>.
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-black" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/status-personal%20project-blueviolet" />
</p>

---

## Sumário

- [O que faz](#o-que-faz)
- [Instalar](#instalar)
- [Como usar](#como-usar)
- [Categorias](#categorias)
- [Como fica seguro](#como-fica-seguro)
- [Desenvolvimento](#desenvolvimento)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## O que faz

Resolve o problema clássico de "onde foi meu espaço em disco?" e permite limpar **com confiança**:

- **Diagnóstico por categoria** — caches de browsers, ferramentas de dev, Docker, wallpapers, apps não usados, arquivos grandes...
- **Tiers de segurança** — cada categoria é marcada como 🟢 safe, 🟡 caution ou 🔴 review
- **Preview obrigatório** — nada é apagado sem você ver a lista final e confirmar
- **Lixeira, sempre** — todos os deletes vão pra Lixeira do macOS; restauráveis enquanto ela não for esvaziada
- **Histórico** — cada limpeza é logada (categoria, bytes liberados, timestamp, itens)

---

## Instalar

### Opção A — Build local (recomendado)

**Requisitos:** macOS Sonoma+ em Apple Silicon, Node ≥ 20, pnpm ≥ 9.

```bash
git clone https://github.com/<seu-user>/disk-janitor.git
cd disk-janitor
pnpm install
pnpm dist
codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app"
ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app"
open "/Applications/Disk Janitor.app"
```

### Opção B — `.app` pronto

Arraste `Disk Janitor.app` pra `/Applications/` e abra pelo Launchpad ou Spotlight.

**Primeira abertura**: se o macOS reclamar de "desenvolvedor não verificado" (Gatekeeper), clique direito no app → **Abrir** → confirmar. Só precisa uma vez.

---

## Como usar

### 1. Diagnóstico
Ao abrir, você vê o **gauge do disco** (usado/livre/porcentagem, com cor por saturação) e um grid de categorias.

- Clique **"Escanear categorias seguras"** pra rodar todas as 🟢 em paralelo.
- Ou clique **"Escanear"** dentro de um card específico.

Categorias 🟡 e 🔴 **nunca rodam sem sua ação explícita**.

### 2. Explorar uma categoria
Clique **"Ver"** num card com resultados. A tela mostra:
- Cada item com **label, path completo, tamanho** e uma **nota** (o que preserva ou apaga)
- Uma **explicação do tier** no topo (o que aquele nível de risco significa na prática)

### 3. Selecionar
Marque as checkboxes dos itens que quiser limpar. Use o checkbox no header pra selecionar tudo. O rodapé mostra **quantos itens** e o **total em bytes**.

### 4. Preview
Clique **"Enviar para Lixeira"**. Um diálogo mostra a lista final + total agregado, com **Cancelar** ou **Confirmar e limpar**.

### 5. Limpeza
Após confirmar, um overlay mostra progresso em tempo real:
- Item atual sendo processado
- Barra de progresso
- Bytes liberados até o momento

Ao terminar, um toast confirma o resultado. O gauge do disco e o scan da categoria atualizam sozinhos.

### 6. Histórico
Botão **"Histórico"** no header do dashboard abre um painel lateral com as últimas limpezas: categoria, bytes liberados, timestamp, itens com sucesso/falha.

### 7. Se se arrepender
Abra a **Lixeira** do macOS → botão direito no item → **Colocar de volta**. Funciona pra qualquer coisa que o app tenha enviado pra Lixeira e que ela ainda não tenha sido esvaziada.

---

## Categorias

### 🟢 Safe — nenhum login perdido, dados regeneráveis
| Categoria | O que faz |
|---|---|
| **Caches de browsers e apps** | Spotify, Arc, Chrome, updaters (Figma/Beekeeper/Gather), Playwright, TypeScript, CloudKit |
| **Ferramentas de dev** | pnpm store, npm cache, `~/.cache`, Gradle |
| **Docker** | Info sobre `Docker.raw` (sparse) + estimativa de `docker system prune -a --volumes` |
| **Wallpapers dinâmicos** | Vídeos aerials em `~/Library/Application Support/com.apple.wallpaper/aerials/videos` — **preserva o wallpaper ativo** |

### 🟡 Caution — pode invalidar sessão local ou cache offline
| Categoria | O que faz |
|---|---|
| **Caches de apps Electron** | Cirúrgico por app: só `Cache`, `Code Cache`, `GPUCache`, `DawnCache`, `Service Worker/CacheStorage` de Claude, Cursor, VS Code, Discord, Notion, Figma, GatherV2, ChatGPT Atlas. **Preserva login, cookies, IndexedDB e dados do usuário.** |
| **Downloads antigos** | `.dmg`, `.pkg`, `.iso`, `.zip`, `.tar.gz`, `.xz` em `~/Downloads` com mais de 30 dias |

### 🔴 Review — envolve arquivos pessoais, revisar item a item
| Categoria | O que faz |
|---|---|
| **Apps não abertos há tempos** | `/Applications/*.app` sem uso há mais de 180 dias (via `mdls -name kMDItemLastUsedDate`) |
| **Arquivos grandes** | Top 30 arquivos > 500 MB no `$HOME` (via `mdfind`), excluindo `node_modules/`, `.git/`, envs virtuais, bundles (`*.app`, `*.photoslibrary`, etc.), `Library/Containers/com.docker.docker/` e `Library/CloudStorage/` |

---

## Como fica seguro

Cinco garantias, aplicadas em **todo** delete:

1. **Whitelist de paths** — só `$HOME`, `/Applications`, `/opt/homebrew`. Fora disso, `assertAllowed()` nega.
2. **Nunca `rm -rf`** — só `shell.trashItem` (nativo macOS). Sempre restaurável.
3. **`execFile`, nunca `exec`** — args como array, zero interpolação em shell (sem risco de injection).
4. **Re-scan antes de limpar** — o cleaner re-executa o scan antes de agir. Renderer só envia IDs, nunca dados stale.
5. **Preview obrigatório na UI** — nenhum botão dispara clean sem passar pelo `PreviewDialog`.

Extras:
- Docker.raw marcado `cleanable: false` (é sparse — não faz sentido "deletar")
- Se o plist do wallpaper estiver corrompido, o cleaner preserva **tudo** por precaução
- History log é best-effort — falha nele não aborta cleanup nem afeta bytes liberados reportados

---

## Desenvolvimento

<details>
<summary><b>Setup, workflow e arquitetura</b></summary>

### Setup
```bash
git clone <repo>
cd disk-janitor
pnpm install
```

### Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Dev com HMR. Renderer recarrega ao salvar; main/preload rebuildam auto. |
| `pnpm typecheck` | `tsc --noEmit` em main+preload e renderer. |
| `pnpm build` | electron-vite build (gera `out/`, sem empacotar). |
| `pnpm dist` | Build + `electron-builder --mac --arm64 --dir` → `.app`. |

### Fluxo — depois de alterar código

**Iterando (várias mudanças por minuto):**
```bash
pnpm dev   # HMR renderer, rebuild auto main/preload
```
Se o main não pegar: `pkill -f "electron-vite.js dev" ; pkill -f "disk-janitor.*Electron" && pnpm dev`

**Refletir no app instalado em `/Applications/`:**
```bash
pkill -f "Disk Janitor"
pnpm dist
codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app"
ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app"
open "/Applications/Disk Janitor.app"
```

Alias sugerido pro `~/.zshrc`:
```bash
alias dj-update='cd ~/disk-janitor && pkill -f "Disk Janitor"; pnpm dist && codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app" && ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app" && open "/Applications/Disk Janitor.app"'
```

### Arquitetura

**Processo principal (Node) ↔ preload (bridge) ↔ renderer (React)**, com contratos Zod compartilhados.

```
src/
├── main/                # processo Node do Electron
│   ├── index.ts         # bootstrap + BrowserWindow + dock icon
│   ├── ipc/             # handlers via ipcMain.handle
│   ├── domain/          # TS puro (categorias, scanner, cleaner, safety, trash, history)
│   └── infra/           # bordas de sistema (shell, df, du, docker, mdfind, mdls, plutil)
├── preload/bridge.ts    # API tipada via contextBridge
├── shared/              # Zod schemas (fonte de verdade)
└── renderer/            # UI React (views, components, store Zustand, hooks)
```

**Princípios:**
- **IPC como contrato**: `shared/ipc-contract.ts` é fonte de verdade. Se mudar, TS quebra os dois lados.
- **`domain/` é puro TS.** Nenhum import de Electron/fs/child_process. I/O vai em `infra/`.
- **Feature-first no renderer.** Componentes shadcn em `components/ui/` (copiados, não instalados via CLI).
- **Sem `utils.ts`.** Cada função mora perto do domínio dela.
- **Sem comentários explicando O QUE o código faz.** Nomes claros fazem isso.

### Adicionar uma categoria

Único extension point: `src/main/domain/categories.ts`. Não precisa mexer em UI, IPC ou preload.

Passo a passo:
1. (Opcional) Adicione scanner em `src/main/infra/<nome>.ts`
2. Importe em `categories.ts`
3. Adicione ao array `CATEGORIES`:
   ```ts
   {
     meta: { id, label, description, tier, icon },
     scan: () => scanFn(),
     cleanItem: (item) => trashChildren(item.path),  // ou trashPath / custom
   }
   ```
4. Se ícone novo, adicione ao map `ICONS` em `components/CategoryCard.tsx`
5. `pnpm typecheck` + restart `pnpm dev`

**Regras não-negociáveis** (ver `CLAUDE.md`): sempre `trashPath`/`trashChildren`, nunca `fs.unlink`/`rm`. Sempre `execFile` via `infra/shell.ts`.

</details>

---

## Tech stack

<table>
  <tr><td><b>Runtime</b></td><td>Electron 34 · electron-vite 3 · Node 24 · pnpm 10</td></tr>
  <tr><td><b>UI</b></td><td>React 19 · TypeScript 5.7 · Tailwind 3.4 · shadcn primitives (Radix) · Sonner · Lucide</td></tr>
  <tr><td><b>State</b></td><td>Zustand 5</td></tr>
  <tr><td><b>Contratos</b></td><td>Zod 3</td></tr>
  <tr><td><b>Packaging</b></td><td>electron-builder 26 (ad-hoc signed)</td></tr>
</table>

**Tamanhos:** main ~27 KB · preload ~3 KB · renderer ~880 KB · `.app` ~271 MB (Electron runtime).

---

## Roadmap

**Feito**
- ✅ Dashboard com gauge + grid de categorias
- ✅ Fluxo preview → confirmar → progresso em tempo real
- ✅ 8 categorias em 3 tiers de segurança
- ✅ Envio pra Lixeira (nunca `rm -rf`)
- ✅ History log persistente
- ✅ Logo + ícone + packaging + instalação em `/Applications`

**Poderia vir depois**
- [ ] Time Machine snapshots locais (precisa `sudo` interativo)
- [ ] Assinatura + notarization pra distribuição pública (Apple Developer ID)
- [ ] Whitelist configurável de apps Electron adicionais
- [ ] Análise incremental do `$HOME` estilo treemap (GrandPerspective)
- [ ] Restore rápido do último cleanup via history log

---

## Licença

Projeto pessoal, sem licença explícita ainda. Se planeja distribuir/usar publicamente, adicione MIT ou Apache 2.0.

---

<p align="center">
  Feito com <a href="https://claude.com/claude-code">Claude Code</a>.
</p>
