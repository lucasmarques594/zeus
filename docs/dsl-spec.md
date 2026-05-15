# Portugol-Pizzaria — Especificação da Linguagem

> Versão: 0.1.0
> Status: Draft
> Última atualização: 2026-05-08

## 1. Visão geral

O **Portugol-Pizzaria** é uma linguagem de domínio específico (DSL) educativa, derivada do Portugol clássico brasileiro, projetada para ensinar programação a crianças e adolescentes de 12 a 14 anos por meio de um jogo de gerenciamento de pizzaria.

### 1.1. Princípios de design

1. **Idioma materno primeiro.** Todas as palavras-chave e funções built-in são em português brasileiro. O objetivo é remover a barreira do inglês na fase inicial de aprendizado.
2. **Sintaxe minimalista.** Apenas um jeito de fazer cada coisa. Sem `var`/`let`/`const`, sem `;` opcional, sem `==` vs `===`.
3. **Indentação obrigatória.** Estrutura visual ensina pensamento estruturado desde o primeiro dia. Inspirado em Python.
4. **Determinística e tick-based.** Toda instrução de ação consome um número fixo de ticks. Isso permite replay determinístico, controle de velocidade e leaderboard justo.
5. **Tipagem dinâmica implícita.** O jogador não declara tipos. Variáveis nascem na primeira atribuição.
6. **Erros como ferramenta pedagógica.** Mensagens de erro são em PT-BR, contextuais e sugerem a próxima ação.

### 1.2. O que está fora do escopo

- Classes, herança, interfaces (sem POO)
- `async`/`await`, promises, callbacks
- Módulos, imports, namespaces
- Tratamento de exceção (`try`/`catch`)
- Listas, dicionários, sets (apenas tipos primitivos)
- Acesso a APIs do navegador (`window`, `fetch`, `document`)
- Regex, manipulação avançada de strings

Esses recursos podem ser adicionados em versões futuras se houver demanda pedagógica clara.

---

## 2. Léxico

### 2.1. Caracteres

- O código-fonte é UTF-8.
- **Acentos são aceitos mas opcionais** em palavras-chave: `faca` e `faça` são equivalentes; `funcao` e `função` são equivalentes. O lexer normaliza internamente para a forma sem acento.
- Identificadores aceitam letras (com ou sem acento), dígitos e underscore. Não podem começar com dígito.

### 2.2. Comentários

```
# Isto é um comentário de uma linha
# Comentários vão até o fim da linha
```

Não há comentários de múltiplas linhas. Use vários `#` em sequência.

### 2.3. Literais

| Tipo | Exemplos |
|---|---|
| Inteiro | `0`, `42`, `-7` |
| Real | `3.14`, `-0.5`, `100.0` |
| Texto | `"oi"`, `"pizza calabresa"`, `""` |
| Lógico | `verdadeiro`, `falso` |
| Nulo | `nulo` |

Strings usam **apenas aspas duplas**. Não há interpolação de strings.

### 2.4. Palavras reservadas

```
se          senao       senao_se
enquanto    para        de          ate          passo
funcao      retornar    parar       continuar
e           ou          nao
verdadeiro  falso       nulo
```

Sinônimos com acento:
- `senão` ≡ `senao`
- `senão_se` ≡ `senao_se`
- `função` ≡ `funcao`
- `até` ≡ `ate`
- `não` ≡ `nao`

### 2.5. Operadores

| Categoria | Operadores |
|---|---|
| Aritméticos | `+`, `-`, `*`, `/`, `%` |
| Comparação | `==`, `!=`, `<`, `>`, `<=`, `>=` |
| Lógicos | `e`, `ou`, `nao` |
| Atribuição | `=` |

Não existe atribuição composta (`+=`, `-=`, etc) na v0.1. Pode ser adicionada na v0.2.

### 2.6. Indentação

- A indentação é significativa, igual ao Python.
- O padrão é **4 espaços por nível**. Tabs também são aceitos mas convertidos para 4 espaços pelo lexer.
- Misturar tabs e espaços na mesma linha gera erro de sintaxe.

---

## 3. Gramática (EBNF)

```ebnf
programa       = comando* ;

comando        = comandoSimples NEWLINE
               | seComando
               | enquantoComando
               | paraComando
               | funcaoDef ;

comandoSimples = atribuicao
               | chamadaFuncao
               | retornar
               | parar
               | continuar ;

atribuicao     = IDENT "=" expressao ;

retornar       = "retornar" expressao? ;
parar          = "parar" ;
continuar      = "continuar" ;

seComando      = "se" expressao ":" bloco
                 ("senao_se" expressao ":" bloco)*
                 ("senao" ":" bloco)? ;

enquantoComando = "enquanto" expressao ":" bloco ;

paraComando    = "para" IDENT "de" expressao "ate" expressao
                 ("passo" expressao)? ":" bloco ;

funcaoDef      = "funcao" IDENT "(" listaParams? ")" ":" bloco ;
listaParams    = IDENT ("," IDENT)* ;

bloco          = INDENT comando+ DEDENT ;

expressao      = exprOu ;
exprOu         = exprE ("ou" exprE)* ;
exprE          = exprNao ("e" exprNao)* ;
exprNao        = "nao" exprNao | comparacao ;
comparacao     = exprAditiva (opComp exprAditiva)? ;
opComp         = "==" | "!=" | "<" | ">" | "<=" | ">=" ;
exprAditiva    = termo (("+" | "-") termo)* ;
termo          = fator (("*" | "/" | "%") fator)* ;
fator          = NUMERO
               | TEXTO
               | "verdadeiro"
               | "falso"
               | "nulo"
               | IDENT
               | chamadaFuncao
               | "(" expressao ")"
               | "-" fator ;

chamadaFuncao  = IDENT "(" listaArgs? ")" ;
listaArgs      = expressao ("," expressao)* ;
```

---

## 4. Semântica de execução

### 4.1. Modelo de tick

O jogo executa em **ticks discretos**. Cada chamada a uma função built-in consome um número conhecido de ticks (ver tabela de built-ins). Estruturas de controle (`se`, `enquanto`, `para`, `funcao`) e operações puras (aritmética, comparação, atribuição) **não consomem ticks**.

O game loop do Phaser avança o interpretador 1 tick por frame (em velocidade normal), permitindo ao jogador ver cada ação acontecendo.

### 4.2. Escopo

- Há um **escopo global** e um escopo por função.
- Variáveis criadas dentro de uma função são **locais** a ela.
- Variáveis criadas fora de qualquer função são **globais** e acessíveis em qualquer lugar.
- Não há closures: funções não capturam o escopo onde foram definidas.

### 4.3. Passagem de parâmetros

Por valor para tipos primitivos. Não há referências, ponteiros ou objetos mutáveis na v0.1.

### 4.4. Limites de execução

Para evitar travamentos do navegador e loops infinitos lógicos:

| Limite | Valor padrão |
|---|---|
| Máximo de ticks por execução | 10.000 |
| Máximo de profundidade de recursão | 100 |
| Máximo de iterações de loop sem tick | 100.000 |

Quando um limite é atingido, a execução é interrompida com erro pedagógico (ver `error-catalog.md`).

---

## 5. Funções built-in

Todas as funções built-in são acessíveis globalmente e seus nomes são reservados (não podem ser redefinidos pelo jogador).

### 5.1. Movimento

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `mover(direcao)` | 1 | nulo | Move o personagem 1 célula. `direcao` ∈ {`"norte"`, `"sul"`, `"leste"`, `"oeste"`}. Falha silenciosamente se houver parede. |
| `virar(direcao)` | 1 | nulo | Vira o personagem sem se mover. |
| `posicao()` | 0 | texto | Retorna `"x,y"` da posição atual. |
| `direcao_atual()` | 0 | texto | Retorna a direção que o personagem está olhando. |

### 5.2. Interação básica

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `pegar()` | 1 | lógico | Pega o item da célula em frente. Retorna `verdadeiro` se conseguiu. |
| `soltar()` | 1 | lógico | Solta o item que está segurando na célula em frente. |
| `segurando()` | 0 | texto | Retorna o tipo do item nas mãos ou `nulo`. |
| `peca_em_frente()` | 0 | texto | Retorna o tipo da célula à frente: `"chao"`, `"parede"`, `"forno"`, `"mesa"`, `"balcao"`, `"caixa"`, `"lixo"`, `"ingrediente"`. |

### 5.3. Pizzaria

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `ingrediente_em(peca)` | 0 | texto | Retorna o ingrediente da célula: `"massa"`, `"molho"`, `"queijo"`, `"calabresa"`, `"frango"`, ou `nulo`. |
| `montar_pizza()` | 3 | lógico | Combina os ingredientes que está segurando em uma pizza crua. Falha se faltar massa ou molho. |
| `colocar_no_forno()` | 1 | lógico | Coloca a pizza segurada no forno em frente. |
| `tirar_do_forno()` | 1 | lógico | Tira a pizza do forno em frente. Cuidado: muito cedo = crua, muito tarde = queimada. |
| `estado_forno()` | 0 | texto | `"vazio"`, `"cozinhando"`, `"pronto"`, `"queimado"`. |

### 5.4. Pedidos e atendimento

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `proximo_pedido()` | 0 | texto/nulo | Retorna o próximo pedido na fila ou `nulo`. Formato: `"mesa,sabor"` (ex: `"3,calabresa"`). |
| `entregar(mesa)` | 1 | lógico | Entrega o que está segurando à mesa indicada (inteiro 1-N). |
| `status_mesa(numero)` | 0 | texto | `"vazia"`, `"esperando"`, `"servida"`, `"irritada"`. |

### 5.5. Economia (níveis avançados)

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `dinheiro()` | 0 | inteiro | Saldo atual em centavos (inteiro). |
| `comprar(ingrediente, qtd)` | 2 | lógico | Compra ingredientes para repor estoque. |
| `estoque(ingrediente)` | 0 | inteiro | Quantidade restante do ingrediente. |

### 5.6. Utilidades

| Função | Ticks | Retorno | Descrição |
|---|---|---|---|
| `escrever(valor)` | 0 | nulo | Imprime valor no console do jogo. Útil para debug. |
| `esperar(ticks)` | N | nulo | Não faz nada, apenas consome `N` ticks. |
| `aleatorio(min, max)` | 0 | inteiro | Inteiro aleatório entre `min` e `max` (inclusivo). |
| `tick_atual()` | 0 | inteiro | Retorna o tick atual do mundo. |

---

## 6. Exemplos de código por nível

### Nível 0 — primeiro programa

```
mover("leste")
```

### Nível 1 — sequência

```
mover("leste")
mover("leste")
mover("leste")
virar("sul")
mover("sul")
```

### Nível 2 — repetição manual cansa (ainda sem `para`)

```
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
mover("leste")
```

### Nível 3 — loop `para` resolve a dor

```
para i de 1 ate 10:
    mover("leste")
```

### Nível 4 — pegar e entregar

```
mover("norte")
pegar()
virar("sul")
mover("sul")
entregar(1)
```

### Nível 5 — primeira decisão com `se`

```
se proximo_pedido() != nulo:
    mover("norte")
    pegar()
    mover("sul")
    entregar(1)
```

### Nível 6 — primeiro `enquanto`

```
enquanto proximo_pedido() != nulo:
    mover("norte")
    pegar()
    mover("sul")
    entregar(1)
```

### Nível 7 — atender uma fila completa

```
enquanto proximo_pedido() != nulo:
    pedido = proximo_pedido()
    mover("norte")
    pegar()
    mover("sul")
    # mesa do pedido vem antes da vírgula
    entregar(1)
```

### Nível 8 — função para reusar lógica

```
funcao buscar_pizza():
    mover("norte")
    pegar()
    mover("sul")

funcao atender(mesa):
    buscar_pizza()
    entregar(mesa)

enquanto proximo_pedido() != nulo:
    atender(1)
```

### Nível 9 — escolher por tipo de pizza

```
funcao fazer_pizza(sabor):
    se sabor == "calabresa":
        mover("leste")
    senao_se sabor == "frango":
        mover("oeste")
    senao:
        escrever("sabor desconhecido")
        retornar falso
    pegar()
    retornar verdadeiro

enquanto proximo_pedido() != nulo:
    fazer_pizza("calabresa")
```

### Nível 10 — otimização (montar do zero, gerenciar forno)

```
funcao pegar_ingrediente(nome):
    enquanto ingrediente_em(peca_em_frente()) != nome:
        virar("leste")
    pegar()

funcao fazer_margherita():
    pegar_ingrediente("massa")
    pegar_ingrediente("molho")
    pegar_ingrediente("queijo")
    montar_pizza()
    colocar_no_forno()

fazer_margherita()
enquanto estado_forno() != "pronto":
    esperar(1)
tirar_do_forno()
```

---

## 7. Sandboxing e segurança

A DSL é executada por meio de um **AST walker** implementado em TypeScript. Isso significa que:

- Não usamos `eval()`, `new Function()` ou Web Workers com código solto.
- O código do jogador não tem acesso a `window`, `document`, `fetch`, `localStorage`, ou qualquer API do navegador.
- A única forma de interagir com o mundo é por meio das funções built-in listadas neste documento.
- Loops infinitos e recursão profunda são interrompidos pelos limites de execução (seção 4.4).

---

## 8. Versionamento da linguagem

A versão da DSL é incluída no payload de submissão de score ao backend KRATOS, no campo `dslVersion`. Isso permite que mudanças futuras na linguagem não invalidem leaderboards antigos.

| Versão | Status | Mudanças |
|---|---|---|
| 0.1.0 | Draft atual | Especificação inicial |

---

## 9. Referências

- Forbellone, A. L. V., & Eberspächer, H. F. (2005). *Lógica de programação: a construção de algoritmos e estruturas de dados*.
- Noschang, L. F. et al. (2014). *Portugol Studio: Uma IDE para Iniciantes em Programação*. UNIVALI.
- The Farmer Was Replaced (jogo). Inspiração para o modelo tick-based e progressão por desbloqueio.
