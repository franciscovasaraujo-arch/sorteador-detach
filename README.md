# Sorteador ao vivo — Detach! 26

Sorteador para o Detach! 26, lives e esquentas. É um site estático (HTML + CSS + JS, sem build),
pronto para a Vercel. **Nenhum dado de participante sai do navegador**: a lista fica salva só
no computador que está rodando o sorteio (localStorage).

## Links por evento

A URL define o tema e o evento. Cada combinação guarda seus próprios participantes e vencedores.

| O quê | URL |
|---|---|
| Detach! 26 (padrão) | `/` |
| Esquenta / live | `/?evento=Esquenta%20%232` |
| Já abrir em modo apresentação | `/?evento=Live%20Tokens&apresentacao=1` |
| Tema antigo do Inspect! | `/?tema=inspect` |

## Atalhos

- **ESPAÇO** ou **ENTER**: sortear
- **P**: modo apresentação (esconde o painel)
- **F**: tela cheia
- **ESC**: sair do modo apresentação

## Para a transmissão (mesmo computador opera e transmite)

1. Abra o link do evento no Chrome e importe a lista.
2. Aperte **P** (apresentação) e **F** (tela cheia).
3. No OBS, use **Captura de janela** (ou de tela) apontando para o Chrome.
4. ESPAÇO sorteia. Se a página recarregar, a lista e os vencedores voltam sozinhos.

## Importar participantes

- CSV com colunas `Nome` e `Email` (separador `;` ou `,`, exportação do Sympla funciona).
- Ou cole na caixa de texto: um por linha, opcionalmente `Nome; email`.
- Duplicados são removidos pelo **email** (homônimos com emails diferentes continuam como pessoas diferentes).
- Quem já ganhou não volta para a lista se você importar de novo.
- Veja `exemplo-participantes.csv`.

## Vencedores

- **Ausente**: passe o mouse no vencedor no painel e clique em *Ausente* (fica riscado, continua no registro).
- **Exportar CSV**: baixa a lista de vencedores com ordem, email, status e horário.
- **Limpar tudo**: dois cliques para confirmar.

## Publicar na Vercel

**Opção A — pelo GitHub (recomendado, deploy automático a cada push)**
1. Crie um repositório e suba esta pasta.
2. Em vercel.com → *Add New → Project* → importe o repositório.
3. Framework Preset: **Other**. Build command: vazio. Output directory: `.` (raiz).
4. Deploy.

**Opção B — pelo terminal**
```bash
cd sorteador-online
npx vercel        # primeira vez: faz login e cria o projeto
npx vercel --prod
```

**Domínio próprio (opcional):** na Vercel, *Settings → Domains* → adicione `sorteio.detach.com.br`
e crie o registro CNAME indicado onde o domínio detach.com.br é gerenciado.

## Fontes

A identidade usa **Alfabet** e **Scale VF** (pagas). Sem os arquivos, o site usa a Alfabet se ela
estiver instalada no computador e, senão, a **Archivo** (Google Fonts). Para usar as oficiais na web,
coloque os `.woff2` em `fonts/` e descomente o bloco `@font-face` no topo de `css/tokens.css`
(confirme a licença de uso web antes).

## Estrutura

```
index.html
css/tokens.css   ← cores, fontes e raios por tema (mexa aqui para ajustar a identidade)
css/app.css      ← layout e componentes
js/config.js     ← temas e parâmetros de URL
js/csv.js        ← leitura de CSV / texto colado e exportação
js/store.js      ← estado, sorteio (crypto.getRandomValues) e persistência
js/main.js       ← interface, animação e atalhos
assets/          ← logos Detach! e Inspect!
```

## Testar localmente

Por usar módulos JS, abra com um servidor (não funciona clicando duas vezes no arquivo):
```bash
npx serve .      # ou: python -m http.server
```
