/** Evaluate only decimal arithmetic, with multiplication/division precedence. */
export function calculate(expression: string): number {
  if (!expression || expression.length > 200) throw new Error('Expressão inválida.');
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/-]/g);
  if (!tokens || tokens.join('') !== expression) throw new Error('Expressão inválida.');
  let index = 0;
  const number = (): number => {
    let sign = 1;
    if (tokens[index] === '+' || tokens[index] === '-') sign = tokens[index++] === '-' ? -1 : 1;
    const token = tokens[index++];
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('Número inválido.');
    return sign * Number(token);
  };
  const product = (): number => {
    let value = number();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = number();
      if (operator === '/' && right === 0) throw new Error('Divisão por zero.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  let value = product();
  while (index < tokens.length) {
    const operator = tokens[index++];
    if (operator !== '+' && operator !== '-') throw new Error('Operador inválido.');
    const right = product();
    value = operator === '+' ? value + right : value - right;
  }
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(cents)) throw new Error('Resultado fora do limite.');
  return cents / 100;
}
