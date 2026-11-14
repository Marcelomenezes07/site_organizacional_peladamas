# Guia de Frontend Moderno — Design, Animação e 3D

> **Objetivo:** referência reutilizável para planejar, implementar e revisar interfaces profissionais com Codex, Claude Code ou desenvolvimento manual.
>
> **Como usar:** coloque este arquivo na raiz do repositório. Antes de implementar uma página, peça ao assistente: **“Leia `GUIA_FRONTEND_MODERNO.md`, analise o projeto e siga o fluxo de implementação e os critérios de qualidade desse guia. Não altere regras de negócio.”**

## 1. Princípio central

Um frontend excelente não vem de uma biblioteca isolada. Ele combina **direção de arte**, **hierarquia visual**, **componentes consistentes**, **movimento com propósito**, **acessibilidade** e **desempenho**. Nem toda página precisa de efeitos 3D.

**Regra de ouro:** primeiro torne a interface clara e atraente sem animação; depois acrescente movimento para orientar o usuário.

## 2. Stack recomendada (escolha apenas o necessário)

| Necessidade | Ferramentas | Quando usar |
| --- | --- | --- |
| Aplicação | React + TypeScript + Vite (ou Next.js, se houver necessidade real) | Estrutura, componentes, estados e rotas |
| Estilos | Tailwind CSS + CSS | Layout, responsividade, tokens, efeitos visuais |
| Componentes | shadcn/ui + Radix UI (opcional) | Base acessível e personalizável; não é identidade visual pronta |
| Microinterações | Motion for React | Entrada, saída, layout, menus, feedback e hover |
| Sequências complexas | GSAP + ScrollTrigger | Cronologias, seções sincronizadas com rolagem |
| Suavização da rolagem | Lenis (opcional) | Apenas quando melhora a experiência e não prejudica acesso/navegação |
| Gráficos 3D | Three.js + React Three Fiber | Cenas e objetos interativos no navegador |
| Assets 3D próprios | Blender | Modelagem, texturas, animação e exportação GLB/glTF |
| Ícones | Lucide | Ícones consistentes e leves |

**Não instale tudo de uma vez.** Comece com React + TypeScript + Tailwind + componentes e adicione Motion. Só use GSAP para animações que realmente pedem linha do tempo/scroll; só use Three.js se houver conteúdo 3D.

## 3. Linguagem visual: defina antes de programar

Preencha um mini-briefing para cada tela ou módulo:

- **Objetivo da página:** o que a pessoa deve entender ou fazer?
- **Público-alvo:** para quem é a experiência?
- **Estilo:** editorial, premium minimalista, tecnológico, corporativo, lúdico etc.
- **Referências:** 2 a 3 URLs ou capturas de tela; explique o que copiar *como princípio*, não os elementos literalmente.
- **Cores:** fundo, superfície, texto, destaque, estados (sucesso/alerta/erro).
- **Tipografia:** fonte de título, corpo, tamanhos e pesos.
- **Espaçamento e grid:** escala consistente; boa hierarquia; respiro.
- **Componentes:** botões, cards, navegação, formulários, tabelas, modais.
- **Movimento:** o que anima, em resposta a qual ação e com qual propósito.
- **Mobile:** comportamento e prioridades em tela pequena.
- **Critérios de aceitação:** como saber se ficou pronto e bom.

### Três direções visuais possíveis

1. **Produto premium:** grandes títulos, poucos elementos, fotografias/3D pontuais, seções narrativas e animações com scroll.
2. **Dashboard tecnológico:** densidade de informação controlada, painéis, indicadores, gráficos, estados claros e microinterações discretas.
3. **Landing page experimental:** tipografia expressiva, movimento mais elaborado, efeitos visuais e transições de seções — sem atrapalhar o conteúdo.

## 4. Hierarquia de animações

### Nível 1 — Obrigatório na maioria dos projetos
- Hover, foco, pressionado e feedback de clique.
- Entrada/saída de modais, menus e alertas.
- Transições de estado e carregamento (skeletons quando úteis).
- Durações e curvas consistentes; evite animar tudo ao mesmo tempo.

### Nível 2 — Quando melhora o entendimento
- Revelação progressiva de seções.
- Movimentos suaves entre layouts e expansão de cards.
- Transições de páginas e mudanças de contexto.

### Nível 3 — Só quando existe propósito claro
- Pinning e timelines longas de scroll.
- Parallax, partículas, distorções e transições cinematográficas.
- Objetos 3D manipuláveis e cenas WebGL.

**Preferências reduzidas de movimento:** respeite `prefers-reduced-motion`, diminua/remova movimento não essencial e mantenha todos os fluxos funcionais.

## 5. Quando usar Three.js e Blender

- **CSS/Motion:** texto, cartões, gradientes, transições, parallax simples e animação 2D.
- **GSAP:** timelines coordenadas e scroll-driven mais complexos.
- **Three.js / React Three Fiber:** modelo 3D rotacionável, partículas 3D, luzes/câmera e cenas interativas.
- **Blender:** criar um objeto 3D elaborado, editar malha/materiais e exportar para a web.

**Pipeline 3D:** modelar/otimizar no Blender → exportar como `.glb` → carregar no React Three Fiber → ajustar câmera, luz, controles e responsividade → medir desempenho em celular → criar fallback para dispositivos menos potentes.

**Atenção:** 3D não substitui design, é um recurso de comunicação. Mantenha geometria e texturas compactas; evite cenas pesadas e renderização desnecessária.

## 6. Fluxo de trabalho com Codex ou Claude Code

1. **Diagnóstico:** ler estrutura existente, stack, páginas e restrições; identificar o que não pode quebrar.
2. **Proposta:** descrever direção visual, mapa de componentes, animações e dependências sugeridas.
3. **Implementação incremental:** criar tokens, componentes e layout; depois estados/interações; depois animações.
4. **Revisão visual:** comparar com referência em desktop e mobile; corrigir hierarquia, alinhamento, espaçamento, tipografia e contraste.
5. **Validação:** build, typecheck, lint/testes disponíveis; navegação por teclado; responsividade; movimento reduzido; desempenho.
6. **Entrega:** listar arquivos modificados, decisões, dependências, comandos executados e pendências reais.

Para um projeto existente: **não reescreva a aplicação inteira, não mude backend, não invente endpoints, não mexa na lógica de negócio** sem necessidade e permissão.

## 7. Prompt mestre — copiar e colar

```text
Atue como engenheiro frontend sênior e designer de produto digital especializado em interfaces premium, acessíveis, performáticas e interativas.

Leia primeiro GUIA_FRONTEND_MODERNO.md e analise a estrutura atual do repositório.

Tarefa: [descreva a página/fluxo a implementar]
Público: [quem usa]
Objetivo: [ação principal]
Direção visual: [ex.: dashboard tecnológico discreto, elegante, com excelente hierarquia]
Referências: [links/capturas e o que gosto em cada uma]
Restrições: preservar rotas, APIs, tipos, autenticação e regras de negócio existentes.

1) Faça um diagnóstico curto do frontend e proponha uma direção visual consistente.
2) Defina tokens de estilo, hierarquia tipográfica, componentes e animações adequadas.
3) Implemente em passos pequenos, priorizando layout, responsividade e usabilidade.
4) Utilize Motion para microinterações; GSAP apenas para sequências complexas; Three.js apenas se o caso justificar 3D.
5) Implemente estados de loading, vazio, erro, sucesso, hover, foco e disabled quando aplicáveis.
6) Respeite acessibilidade, teclado, contraste e prefers-reduced-motion.
7) Evite aparência genérica, excesso de efeitos, dependências desnecessárias e queda de desempenho no celular.
8) Rode os checks disponíveis e informe exatamente o que foi validado e o que não foi.

Antes de grandes mudanças, apresente um plano de arquivos e componentes. No final, resuma o resultado com decisões técnicas e próximos ajustes visuais.
```

## 8. Prompt rápido para melhorar uma tela existente

```text
Leia GUIA_FRONTEND_MODERNO.md. Analise a tela [nome/rota] e melhore o visual sem alterar comportamento, dados, integrações ou regras de negócio. Priorize hierarquia, tipografia, espaçamento, contraste, estados de interface, responsividade e microinterações discretas. Mostre o plano, implemente, execute as verificações disponíveis e detalhe os arquivos alterados.
```

## 9. Prompt específico para landing page com scroll/3D

```text
Leia GUIA_FRONTEND_MODERNO.md. Quero uma landing page narrativa e responsiva para [produto], inspirada em [referências]. Proponha um storyboard das seções e diga onde CSS, Motion, GSAP ScrollTrigger ou React Three Fiber são realmente necessários. Use scroll animado apenas para reforçar a narrativa. Se houver 3D, inclua carregamento progressivo, fallback visual, otimização mobile e suporte a reduced motion. Implemente em etapas e valide o desempenho.
```

## 10. Checklist de aprovação

### Visual e UX
- [ ] A tela comunica o objetivo em poucos segundos.
- [ ] Há hierarquia clara de títulos, conteúdo e ações.
- [ ] Cores, tipografia, espaçamento e raios são consistentes.
- [ ] Desktop e mobile estão bem resolvidos — não apenas “encaixam”.
- [ ] Loading, vazio, erro, sucesso e disabled estão contemplados.
- [ ] As animações comunicam intenção e não distraem.

### Técnica e acessibilidade
- [ ] Interface navegável por teclado, com foco visível.
- [ ] Contraste e rótulos de formulários adequados.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Imagens responsivas, formatos e tamanhos adequados.
- [ ] Dependências novas são justificáveis.
- [ ] Conteúdo e navegação funcionam sem efeitos sofisticados.
- [ ] Foi testado em largura de celular e desktop.
- [ ] Build, TypeScript, lint e testes relevantes passaram, ou foram registradas limitações.
- [ ] Nenhuma integração ou regra de negócio foi alterada indevidamente.

## 11. Erros comuns

- Pedir só “faça bonito e moderno”, sem objetivo nem referência.
- Colocar animação em todo elemento e prejudicar a leitura.
- Usar Three.js onde CSS resolveria melhor.
- Instalar várias bibliotecas que fazem a mesma função.
- Avaliar só em monitor grande, ignorando celular.
- Confundir componentes prontos com identidade visual completa.
- Ignorar feedback, estados de erro e acessibilidade.

## 12. Referências para consultar

- Inspiração: https://www.awwwards.com/
- Interfaces e componentes: https://ui.shadcn.com/
- Tailwind: https://tailwindcss.com/docs
- Motion: https://motion.dev/
- GSAP: https://gsap.com/docs/v3/
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Blender: https://www.blender.org/
- Web performance: https://web.dev/
- Acessibilidade WCAG: https://www.w3.org/WAI/standards-guidelines/wcag/

---

**Como lembrar o assistente em qualquer implementação:** “Leia o guia de frontend deste repositório e siga seus critérios, adaptando as tecnologias à necessidade real.”
