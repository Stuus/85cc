/**
 * A safe mathematical expression evaluator that supports basic arithmetic
 * (+, -, *, /) and parentheses, preventing any arbitrary code execution risks.
 */
export function safeEvaluate(expr: string): number {
  // 1. Strict allowlist validation
  if (!/^[-+/*0-9.() \s]+$/.test(expr)) {
    return 0;
  }

  // 2. Tokenize
  const tokens = expr.match(/([0-9.]+)|([-+/*()])/g);
  if (!tokens) return 0;

  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const values: number[] = [];
  const ops: string[] = [];

  const applyOp = () => {
    if (values.length < 2) return;
    const right = values.pop()!;
    const left = values.pop()!;
    const op = ops.pop()!;
    if (op === '+') values.push(left + right);
    else if (op === '-') values.push(left - right);
    else if (op === '*') values.push(left * right);
    else if (op === '/') values.push(left / right);
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!isNaN(Number(token))) {
      values.push(Number(token));
    } else if (token === '(') {
      ops.push(token);
    } else if (token === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        applyOp();
      }
      ops.pop(); // remove '('
    } else if (['+', '-', '*', '/'].includes(token)) {
      // Handle unary minus/plus (e.g., at the start or after an operator)
      if ((token === '-' || token === '+') && (i === 0 || ['+', '-', '*', '/', '('].includes(tokens[i - 1]))) {
        values.push(0); // Treat `-x` as `0 - x`
      }

      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== '(' &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        applyOp();
      }
      ops.push(token);
    }
  }

  while (ops.length > 0) {
    applyOp();
  }

  const result = values.length > 0 ? values[0] : 0;
  return isNaN(result) || !isFinite(result) ? 0 : result;
}
