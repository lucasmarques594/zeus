# Catálogo de Erros — Portugol-Pizzaria

> Versão: 0.1.0
> Última atualização: 2026-05-08

## Filosofia

Erros são **ferramentas pedagógicas**, não falhas. Cada mensagem de erro deve:

1. **Falar a linguagem do jogador** (PT-BR, vocabulário simples).
2. **Indicar exatamente onde** o problema aconteceu (linha, coluna).
3. **Explicar o que aconteceu** sem jargão técnico.
4. **Sugerir a próxima ação** que o jogador pode tomar.
5. **Ter personalidade** — a pizzaria fala com o jogador, não um compilador frio.

Toda mensagem de erro segue este formato:

```
🍕 [Tipo do erro] na linha X
   Mensagem em PT-BR explicando o que aconteceu
   💡 Dica: sugestão de como resolver
```

---

## 1. Erros de sintaxe (parser)

São detectados antes da execução, ao analisar o código escrito pelo jogador.

### 1.1. Indentação inconsistente

```
🍕 Indentação errada na linha 4
   Esta linha tem uma indentação diferente do esperado.
   No Portugol-Pizzaria, cada nível de bloco usa 4 espaços.
   💡 Dica: verifique se você usou 4 espaços (não tabs misturados) e se o
   bloco está alinhado com as outras linhas do mesmo nível.
```

**Quando aparece:** linha tem mistura de tabs e espaços, ou número errado de espaços.

### 1.2. Bloco vazio

```
🍕 Bloco vazio na linha X
   Você abriu um bloco com ':' mas não escreveu nada dentro.
   💡 Dica: depois de 'se', 'enquanto', 'para' ou 'funcao', precisa ter pelo
   menos um comando indentado abaixo.
```

**Quando aparece:** um `se:`, `enquanto:`, etc, sem corpo.

### 1.3. Dois pontos esquecidos

```
🍕 Faltou o ':' na linha X
   Estruturas como 'se', 'enquanto', 'para' e 'funcao' precisam terminar
   com dois pontos antes do bloco.
   💡 Dica: tente assim → se condicao:
                            (bloco aqui)
```

**Quando aparece:** `se x` em vez de `se x:`.

### 1.4. Parênteses não fechados

```
🍕 Parênteses sem par na linha X
   Você abriu um '(' mas esqueceu de fechar com ')'.
   💡 Dica: conte os parênteses na linha. Cada '(' precisa de um ')'.
```

### 1.5. Aspas não fechadas

```
🍕 Texto sem fim na linha X
   Você começou um texto com aspas mas não fechou.
   💡 Dica: textos no Portugol-Pizzaria usam aspas duplas. Exemplo: "norte"
```

### 1.6. Palavra desconhecida

```
🍕 Não entendi 'XYZ' na linha X
   Esta palavra não é um comando que eu conheço.
   💡 Dica: você quis dizer 'mover'? 'enquanto'? Olhe a lista de
   comandos disponíveis neste nível.
```

**Quando aparece:** identificador que não é palavra-chave nem função built-in nem variável definida.
**Bonus:** se a palavra escrita for parecida com uma conhecida (distância de Levenshtein <= 2), sugerir a correção: "Você quis dizer 'mover'?".

### 1.7. Dois operadores seguidos

```
🍕 Dois operadores juntos na linha X, coluna Y
   Algo como '+ +' ou '* /' não faz sentido.
   💡 Dica: entre dois operadores precisa ter um valor (número, variável
   ou chamada de função).
```

### 1.8. Atribuição inválida

```
🍕 Não dá pra atribuir valor a 'XYZ' na linha X
   Só dá pra usar '=' com um nome de variável do lado esquerdo.
   💡 Dica: 'mover() = 5' não funciona. Tente 'x = 5'.
```

### 1.9. Função built-in usada como variável

```
🍕 'mover' é um comando, não uma variável (linha X)
   Você não pode atribuir um valor a 'mover'. É uma função reservada.
   💡 Dica: escolha outro nome para sua variável, como 'minha_acao'.
```

### 1.10. Recurso não disponível neste nível

```
🍕 Você ainda não desbloqueou 'enquanto' (linha X)
   Este comando estará disponível no nível 6.
   💡 Dica: por enquanto, tente resolver com os comandos que você já tem.
```

**Quando aparece:** uso de `enquanto`, `se`, `funcao` etc em níveis onde ainda não foi introduzido.

---

## 2. Erros de tipo (semântico)

Detectados ao executar uma operação com tipos incompatíveis.

### 2.1. Soma de tipos incompatíveis

```
🍕 Não dá pra somar texto com número (linha X)
   Você tentou: "calabresa" + 3
   💡 Dica: '+' funciona com dois números OU dois textos, não misturados.
```

### 2.2. Comparação inválida

```
🍕 Comparação estranha na linha X
   Comparar texto com número quase sempre é um erro.
   Você tentou: "norte" < 5
   💡 Dica: verifique se as duas coisas que você está comparando
   são do mesmo tipo.
```

### 2.3. Argumento de função com tipo errado

```
🍕 'mover' espera uma direção (texto), não um número (linha X)
   Você passou: mover(5)
   💡 Dica: tente mover("leste"), com aspas duplas em volta da direção.
```

### 2.4. Chamada de algo que não é função

```
🍕 'idade' não é uma função (linha X)
   Você tentou usar 'idade()' como função, mas é uma variável.
   💡 Dica: para ler o valor da variável, escreva apenas 'idade' sem os parênteses.
```

### 2.5. Número errado de argumentos

```
🍕 'entregar' precisa de 1 argumento, você passou 0 (linha X)
   A função 'entregar' espera o número da mesa.
   💡 Dica: tente entregar(1) para entregar à mesa 1.
```

---

## 3. Erros de runtime (execução)

Acontecem durante a execução do programa.

### 3.1. Variável não definida

```
🍕 Não conheço a variável 'pedido' (linha X)
   Você usou 'pedido' antes de criar.
   💡 Dica: variáveis nascem na primeira atribuição. Tente:
   pedido = proximo_pedido()
```

### 3.2. Divisão por zero

```
🍕 Divisão por zero na linha X
   Não é possível dividir um número por zero.
   💡 Dica: antes de dividir, verifique com 'se' se o divisor não é zero.
```

### 3.3. Limite de ticks atingido

```
🍕 Ufa, o programa demorou demais!
   Você usou mais de 10.000 ticks. Provavelmente tem um loop que
   nunca termina.
   💡 Dica: revise seus 'enquanto'. A condição precisa ficar falsa em
   algum momento, senão o loop nunca acaba.
```

### 3.4. Recursão muito profunda

```
🍕 Função se chamando demais (linha X)
   Sua função se chamou mais de 100 vezes seguidas.
   💡 Dica: se uma função se chama dentro dela mesma, precisa ter
   uma condição de parada (com 'se' e 'retornar') para não ficar
   infinita.
```

### 3.5. Retorno fora de função

```
🍕 'retornar' só funciona dentro de funções (linha X)
   Você usou 'retornar' fora de qualquer função.
   💡 Dica: 'retornar' encerra uma função e devolve um valor.
   Só faz sentido dentro de 'funcao NOME():'.
```

### 3.6. Parar/continuar fora de loop

```
🍕 'parar' só funciona dentro de loops (linha X)
   Você usou 'parar' fora de 'enquanto' ou 'para'.
   💡 Dica: 'parar' interrompe um loop. Só faz sentido dentro de um.
```

---

## 4. Erros de domínio (mundo do jogo)

Não são erros de programação, mas avisos didáticos sobre o que aconteceu no jogo.

### 4.1. Bateu na parede

```
🍕 Ops! O entregador bateu numa parede.
   Você mandou mover("norte"), mas tinha uma parede no caminho.
   💡 Dica: use peca_em_frente() para verificar antes de mover.
```

**Comportamento:** não interrompe execução. Apenas registra no console e o personagem fica parado.

### 4.2. Pegar com mãos cheias

```
🍕 As mãos do entregador já estão cheias!
   Ele já está segurando alguma coisa.
   💡 Dica: use soltar() ou entregar() antes de pegar outro item.
```

### 4.3. Soltar com mãos vazias

```
🍕 As mãos estão vazias, não dá pra soltar nada.
   Você chamou soltar() mas o entregador não está segurando nada.
   💡 Dica: chame pegar() antes para pegar algo.
```

### 4.4. Entregar pizza errada

```
🍕 O cliente da mesa 2 não pediu calabresa, pediu frango.
   A pizza voltou pra você (e o cliente ficou bravo).
   💡 Dica: olhe o pedido com proximo_pedido() antes de pegar a pizza.
```

### 4.5. Entregar para mesa vazia

```
🍕 A mesa 3 não tem ninguém esperando!
   Você entregou no vazio.
   💡 Dica: verifique status_mesa(3) antes de entregar.
```

### 4.6. Tirar pizza no momento errado

```
🍕 Pizza queimada! 😢
   Você tirou tarde demais. O forno estava queimado.
   💡 Dica: use estado_forno() em loop com esperar() para tirar
   no momento exato.
```

### 4.7. Tirar pizza crua

```
🍕 Pizza crua! 😬
   Você tirou cedo demais. A massa não cozinhou.
   💡 Dica: aguarde até estado_forno() retornar "pronto".
```

### 4.8. Montar pizza incompleta

```
🍕 Falta ingrediente!
   Para montar uma pizza, você precisa de pelo menos massa e molho.
   💡 Dica: pegue todos os ingredientes antes de chamar montar_pizza().
```

---

## 5. Mensagens de aviso (não são erros)

São informações que aparecem no console sem interromper a execução.

### 5.1. Loop sem progresso aparente

```
ℹ️  Aviso: o loop na linha X executou 50 vezes sem mudar o estado do mundo.
    Isso pode indicar um loop sem fim. Verifique a condição.
```

### 5.2. Variável criada mas nunca usada

```
ℹ️  A variável 'pedido' foi criada mas nunca foi usada.
    Se foi de propósito, ignore este aviso.
```

### 5.3. Código depois de retornar

```
ℹ️  Linha X nunca será executada (vem depois de 'retornar').
    Considere remover ou mover para antes do retornar.
```

---

## 6. Implementação técnica

### 6.1. Estrutura do erro

Em TypeScript:

```typescript
type DSLError = {
  kind: 'syntax' | 'type' | 'runtime' | 'domain' | 'warning'
  code: string              // ex: 'E001', 'D003'
  line: number              // linha 1-indexed
  column: number            // coluna 1-indexed
  message: string           // mensagem em PT-BR
  hint?: string             // dica de resolução
  suggestion?: string       // correção sugerida (typo)
  docLink?: string          // link para tutorial
}
```

### 6.2. Catálogo programático

Os erros são definidos em `src/engine/errors.ts` como uma constante exportada. Cada erro tem:

```typescript
export const ERRORS = {
  E_INDENT_MISMATCH: {
    kind: 'syntax',
    code: 'E001',
    template: (line: number) => ({
      message: `Indentação errada na linha ${line}`,
      hint: 'Verifique se você usou 4 espaços (não tabs misturados)...',
    }),
  },
  // ...
} as const
```

### 6.3. Localização

Apesar do projeto ser PT-BR-first, a estrutura permite adicionar outros idiomas no futuro. As mensagens ficam em `src/engine/i18n/pt-BR.ts` e podem ser substituídas por `en-US.ts` ou outras.

### 6.4. Apresentação visual

No editor do jogo:

- **Sublinhado vermelho** sobre o trecho exato do erro
- **Tooltip** ao passar o mouse com a mensagem completa
- **Painel de erros** lateral com lista clicável (clica → vai pra linha)
- **Som suave** ao detectar erro (configurável, opcional)
- **Personagem da pizzaria reage** com expressão confusa quando há erro

---

## 7. Princípios para autores de novos erros

Ao adicionar um novo erro a este catálogo:

1. **Nunca culpe o jogador.** Use "Não consegui entender" em vez de "Você errou".
2. **Mostre o exemplo correto** sempre que possível.
3. **Use vocabulário de criança.** Em vez de "tipo incompatível", use "tipos diferentes". Em vez de "operando", use "valor".
4. **Inclua a dica.** Toda mensagem deve ter um próximo passo concreto.
5. **Teste com criança real.** Se um adolescente de 12 anos não entender a mensagem, reescreva.
