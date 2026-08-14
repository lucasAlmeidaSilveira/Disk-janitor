# CLAUDE.md

Instruções específicas deste projeto. Leia primeiro `README.md` pra visão geral e como usar. Este arquivo cobre **regras que devem ser seguidas** ao alterar o código.

## Contexto rápido

Electron 34 + React 19 + TS 5.7. macOS-only. Ferramenta pessoal — sem plans de distribuição pública. Stack completa em `README.md`.

## Comandos principais

| Ação | Comando |
|---|---|
| Dev com HMR | `pnpm dev` |
| Typecheck (main + renderer) | `pnpm typecheck` |
| Build (sem empacotar) | `pnpm build` |
| Empacotar `.app` | `pnpm dist` |
| Instalar/atualizar em /Applications | ver README §"Fluxo de trabalho" |

**Antes de empacotar**, mate o app se estiver aberto: `pkill -f "Disk Janitor"`.

## Regras não-negociáveis (safety)

Este app deleta arquivos do usuário. Violar qualquer regra abaixo é bug crítico:

1. **Nunca use `fs.unlink`, `fs.rm`, `rimraf`, ou `rm` via shell.** Use `trashPath()` ou `trashChildren()` de `src/main/domain/trash.ts` — vai pra Lixeira, restaurável.
2. **Nunca ignore `assertAllowed()`.** Antes de qualquer trash, valide o path via `src/main/domain/safety.ts` (whitelist: `$HOME`, `/Applications`, `/opt/homebrew`).
3. **`execFile`, nunca `exec`.** Args como array, nunca interpole strings em shell. Ver `src/main/infra/shell.ts`.
4. **Re-scan antes de limpar.** `cleaner.ts` chama `scanCategory()` antes de agir. Renderer só envia `itemIds`. Não confie em dados stale.
5. **Preview obrigatório no fluxo de UI.** Nenhum botão dispara `cleanCategory` sem passar pelo `PreviewDialog`.

## Extensão: adicionar categoria

Único ponto de extensão: `src/main/domain/categories.ts`. Não precisa mexer em UI, IPC ou preload. Ver README §"Estender". Se a categoria precisa de infra nova (ex.: parsear um formato de arquivo), coloque em `src/main/infra/<nome>.ts` — não polua `domain/`.

## Arquitetura — regras

- **`domain/` é puro TypeScript.** Nenhum import de `electron`, `child_process`, `fs`, `path` nativo. Toda I/O vai em `infra/` e é chamada pelo domínio via injeção implícita (ex.: `trash.ts` importa `shell.trashItem` — a exceção justificada porque trash é uma primitiva de segurança).
- **`shared/ipc-contract.ts` é a fonte de verdade.** Se mudar um schema Zod, TS quebra os dois lados automaticamente — corrija ambos. Nunca duplique tipos em main ou renderer.
- **Renderer é feature-first.** `views/`, `components/`, `store/`, `hooks/`, `lib/` — não organize por tipo técnico. Componentes shadcn em `components/ui/` (copiados, não instalados via CLI).
- **Nunca crie `utils.ts`.** Cada função mora perto do domínio dela. Exceção: `renderer/lib/utils.ts` só pra `cn()` (padrão shadcn).

## Estilo de código

- **Sem comentários que explicam O QUE o código faz.** Nomes claros fazem isso. Só comente WHY não-óbvio (workaround, invariante escondida).
- **Não adicione JSDoc por padrão.** Só em APIs públicas de biblioteca — não é o caso aqui.
- **Zod defaults**: use `.default(true)` pra campos opcionais com fallback. Não crie helpers de "hidrate".
- **Não adicione error handling defensivo em código interno.** Só valide em boundaries (IPC entrada, comando de shell parsing). Confie em invariants dentro do domínio.

## Coisas a evitar

- Adicionar dependência sem consultar. Stack já tá dimensionada.
- Feature flags, "backwards-compat", ou código morto marcado com `// removed`. Delete de vez.
- Wrappers "utils" pra `fs`, `path`, etc. Use a stdlib direto.
- Testes E2E via Playwright/Puppeteer no repo — se precisar validar, teste na mão em `pnpm dev`.
- Refatorar de raspa sem motivo. Se três linhas parecidas não incomodam, deixa.

## Antes de considerar "pronto"

1. `pnpm typecheck` — zero erros
2. `pnpm build` — passa
3. Se mudou main/preload, reinicie `pnpm dev` pra confirmar que carrega
4. Se mudou lógica de limpeza, teste com **um item pequeno** primeiro (Lixeira permite reverter)
5. Se mudou o IPC contract, confirme que main **e** renderer compilam

## Convenções específicas

- **Idioma da UI**: pt-BR. Labels, tooltips, toasts, notas de categoria — tudo em português. Código e comentários (se houver) em inglês.
- **Ícones**: `lucide-react` — sempre. Adicione ao map `ICONS` em `CategoryCard.tsx` se for pra dashboard.
- **Toasts**: `sonner` — `toast.success/error/info`. Já configurado em `App.tsx`.
- **Diálogos**: sempre via `components/ui/dialog.tsx` (Radix). Nunca `<dialog>` HTML ou modal custom.
