/**
 * Safe formula evaluator for Brewery Layer 3 code mods.
 *
 * NOT JavaScript execution. No eval(). No new Function(). No module
 * access. A whitelisted-token lexer feeds a recursive-descent parser
 * that builds a tiny AST; the AST is walked against a context object
 * and returns a number.
 *
 * Supported:
 *   - Numeric literals:      5, 10, 0.5, -2
 *   - Dice notation:         XdY, XdYkhZ (keep highest Z),
 *                            XdYklZ (keep lowest Z — disadvantage)
 *                            X defaults to 1 when omitted (e.g. d20).
 *   - Arithmetic:            + - * / %
 *   - Comparisons:           > < >= <= == !=
 *   - Functions:             min, max, floor, ceil, abs, if
 *   - Identifiers:           whitelisted paths (see ALLOWED_IDENT_ROOTS)
 *
 * Any other token is rejected. Unknown identifiers are rejected at
 * parse time (so `validateFormula` catches typos without running the
 * formula). Dice rolls only happen inside `evaluateFormula` — the
 * validator deliberately doesn't roll.
 */

const ALLOWED_IDENT_ROOTS = new Set([
  // direct scalars
  "weapon_damage_dice", "spell_level", "damage_dealt", "roll_result", "save_dc",
  // nested context objects (members validated per-root below)
  "actor", "target", "config",
]);

const ACTOR_TARGET_FIELDS = new Set([
  "level", "class_level", "prof",
  "str", "dex", "con", "int", "wis", "cha",
  "str_mod", "dex_mod", "con_mod", "int_mod", "wis_mod", "cha_mod",
  "hp", "max_hp", "temp_hp",
  "ac", "spell_mod", "spell_dc",
]);

const FUNCTIONS = new Set(["min", "max", "floor", "ceil", "abs", "if"]);

// Tokenizer pattern. Order matters: longer patterns first.
const TOKEN_PATTERNS = [
  ["DICE",   /^(\d*)d(\d+)(?:(kh|kl)(\d+))?/i],
  ["NUMBER", /^\d+(?:\.\d+)?/],
  ["IDENT",  /^[a-zA-Z_][a-zA-Z0-9_]*/],
  ["OP",     /^(>=|<=|==|!=|>|<|\+|-|\*|\/|%|\(|\)|,|\.)/],
  ["SPACE",  /^\s+/],
];

function tokenize(formula) {
  let src = String(formula);
  const tokens = [];
  let pos = 0;
  while (src.length > 0) {
    let matched = false;
    for (const [type, re] of TOKEN_PATTERNS) {
      const m = src.match(re);
      if (!m) continue;
      if (type !== "SPACE") {
        tokens.push({ type, value: m[0], groups: m.slice(1), pos });
      }
      src = src.slice(m[0].length);
      pos += m[0].length;
      matched = true;
      break;
    }
    if (!matched) {
      throw new Error(`Unexpected token at position ${pos}: "${src[0]}"`);
    }
  }
  return tokens;
}

/**
 * Parser — recursive descent with standard operator precedence.
 *
 * Grammar:
 *   expression    := comparison
 *   comparison    := additive ( (> | < | >= | <= | == | !=) additive )?
 *   additive      := multiplicative ( (+ | -) multiplicative )*
 *   multiplicative:= unary ( (* | / | %) unary )*
 *   unary         := ('-' | '+') unary | primary
 *   primary       := NUMBER | DICE | path | funcCall | '(' expression ')'
 *   path          := IDENT ( '.' IDENT )*
 *   funcCall      := IDENT '(' ( expression ( ',' expression )* )? ')'
 */
function makeParser(tokens) {
  let i = 0;
  const peek = (off = 0) => tokens[i + off];
  const eat = (type, value) => {
    const t = tokens[i];
    if (!t) throw new Error(`Unexpected end of formula`);
    if (t.type !== type) throw new Error(`Expected ${type} at position ${t.pos}, got ${t.type} "${t.value}"`);
    if (value !== undefined && t.value !== value) {
      throw new Error(`Expected "${value}" at position ${t.pos}, got "${t.value}"`);
    }
    i += 1;
    return t;
  };
  const check = (type, value) => {
    const t = tokens[i];
    if (!t || t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  };

  function parseExpression() {
    return parseComparison();
  }

  function parseComparison() {
    const left = parseAdditive();
    if (check("OP") && [">", "<", ">=", "<=", "==", "!="].includes(peek().value)) {
      const op = eat("OP").value;
      const right = parseAdditive();
      return { type: "binary", op, left, right };
    }
    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();
    while (check("OP", "+") || check("OP", "-")) {
      const op = eat("OP").value;
      const right = parseMultiplicative();
      left = { type: "binary", op, left, right };
    }
    return left;
  }

  function parseMultiplicative() {
    let left = parseUnary();
    while (check("OP", "*") || check("OP", "/") || check("OP", "%")) {
      const op = eat("OP").value;
      const right = parseUnary();
      left = { type: "binary", op, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (check("OP", "-")) {
      eat("OP", "-");
      return { type: "unary", op: "-", operand: parseUnary() };
    }
    if (check("OP", "+")) {
      eat("OP", "+");
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error("Unexpected end of formula");

    if (t.type === "NUMBER") {
      eat("NUMBER");
      return { type: "number", value: Number(t.value) };
    }
    if (t.type === "DICE") {
      eat("DICE");
      const [countStr, facesStr, keepMode, keepCountStr] = t.groups;
      return {
        type: "dice",
        count: countStr ? Number(countStr) : 1,
        faces: Number(facesStr),
        keepMode: keepMode ? keepMode.toLowerCase() : null,
        keepCount: keepCountStr ? Number(keepCountStr) : null,
        raw: t.value,
      };
    }
    if (t.type === "OP" && t.value === "(") {
      eat("OP", "(");
      const inner = parseExpression();
      eat("OP", ")");
      return inner;
    }
    if (t.type === "IDENT") {
      return parseIdentOrCall();
    }
    throw new Error(`Unexpected token "${t.value}" at position ${t.pos}`);
  }

  function parseIdentOrCall() {
    const first = eat("IDENT");
    // Function call
    if (check("OP", "(")) {
      if (!FUNCTIONS.has(first.value)) {
        throw new Error(`Unknown function "${first.value}"`);
      }
      eat("OP", "(");
      const args = [];
      if (!check("OP", ")")) {
        args.push(parseExpression());
        while (check("OP", ",")) {
          eat("OP", ",");
          args.push(parseExpression());
        }
      }
      eat("OP", ")");
      return { type: "call", name: first.value, args };
    }
    // Path (ident.ident.ident…)
    const segments = [first.value];
    while (check("OP", ".")) {
      eat("OP", ".");
      const next = eat("IDENT");
      segments.push(next.value);
    }
    validatePath(segments, first.pos);
    return { type: "path", segments };
  }

  function validatePath(segments, pos) {
    const root = segments[0];
    if (!ALLOWED_IDENT_ROOTS.has(root)) {
      throw new Error(`Unknown variable "${root}" at position ${pos}`);
    }
    if ((root === "actor" || root === "target")) {
      if (segments.length !== 2) {
        throw new Error(`"${root}" needs a single sub-field (e.g. ${root}.level) at position ${pos}`);
      }
      if (!ACTOR_TARGET_FIELDS.has(segments[1])) {
        throw new Error(`Unknown field "${root}.${segments[1]}" at position ${pos}`);
      }
    } else if (root === "config") {
      // Config values are user-defined at install time; any
      // single-segment child is accepted. Nested paths are not
      // supported (config values are flat key/value pairs).
      if (segments.length !== 2) {
        throw new Error(`"config" needs a single sub-field (e.g. config.multiplier) at position ${pos}`);
      }
    } else {
      // Direct scalars can't have sub-fields.
      if (segments.length !== 1) {
        throw new Error(`"${root}" has no sub-fields; saw "${segments.join(".")}" at position ${pos}`);
      }
    }
  }

  function parse() {
    const node = parseExpression();
    if (i < tokens.length) {
      throw new Error(`Unexpected trailing token "${tokens[i].value}" at position ${tokens[i].pos}`);
    }
    return node;
  }

  return { parse };
}

/**
 * Roll an XdY[khZ|klZ] dice node and return the total.
 */
function rollDice(node) {
  const count = Math.max(0, Math.floor(node.count));
  const faces = Math.max(1, Math.floor(node.faces));
  if (count === 0) return 0;
  const rolls = [];
  for (let n = 0; n < count; n += 1) {
    rolls.push(1 + Math.floor(Math.random() * faces));
  }
  if (node.keepMode && node.keepCount != null) {
    const keep = Math.max(0, Math.min(rolls.length, Math.floor(node.keepCount)));
    const sorted = rolls.slice().sort((a, b) => a - b);
    const slice = node.keepMode === "kh" ? sorted.slice(sorted.length - keep) : sorted.slice(0, keep);
    return slice.reduce((s, v) => s + v, 0);
  }
  return rolls.reduce((s, v) => s + v, 0);
}

/**
 * Resolve a path node against the context. Returns a number (missing
 * values coerce to 0 rather than throwing; saves one branch of
 * defensive null-check at every call site in user formulas).
 */
function resolvePath(segments, context) {
  let value = context;
  for (const seg of segments) {
    if (value == null || typeof value !== "object") return 0;
    value = value[seg];
  }
  if (value == null) return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Evaluate an AST node against the context.
 */
function evalNode(node, context) {
  switch (node.type) {
    case "number": return node.value;
    case "dice":   return rollDice(node);
    case "path":   return resolvePath(node.segments, context);
    case "unary":  return -evalNode(node.operand, context);
    case "binary": {
      const l = evalNode(node.left, context);
      const r = evalNode(node.right, context);
      switch (node.op) {
        case "+":  return l + r;
        case "-":  return l - r;
        case "*":  return l * r;
        case "/":  return r === 0 ? 0 : l / r;
        case "%":  return r === 0 ? 0 : l % r;
        case ">":  return l > r ? 1 : 0;
        case "<":  return l < r ? 1 : 0;
        case ">=": return l >= r ? 1 : 0;
        case "<=": return l <= r ? 1 : 0;
        case "==": return l === r ? 1 : 0;
        case "!=": return l !== r ? 1 : 0;
        default:   throw new Error(`Unknown operator ${node.op}`);
      }
    }
    case "call": {
      const args = node.args.map((a) => evalNode(a, context));
      switch (node.name) {
        case "min":   return Math.min(...args);
        case "max":   return Math.max(...args);
        case "floor": return Math.floor(args[0] || 0);
        case "ceil":  return Math.ceil(args[0] || 0);
        case "abs":   return Math.abs(args[0] || 0);
        case "if": {
          if (args.length !== 3) throw new Error(`if() requires 3 arguments`);
          return args[0] ? args[1] : args[2];
        }
        default: throw new Error(`Unknown function ${node.name}`);
      }
    }
    default: throw new Error(`Unknown AST node ${node.type}`);
  }
}

/**
 * Evaluate a formula against a context object.
 *
 * @param {string} formula
 * @param {object} context — { actor, target, config, weapon_damage_dice, spell_level, damage_dealt, roll_result, save_dc }
 * @returns {number}
 */
export function evaluateFormula(formula, context = {}) {
  if (typeof formula !== "string" || !formula.trim()) {
    throw new Error("formula is empty");
  }
  const tokens = tokenize(formula);
  const ast = makeParser(tokens).parse();
  return evalNode(ast, context);
}

/**
 * Validate a formula without executing it. Returns true on success;
 * throws a human-readable error otherwise. Used by the mod
 * validation gate (session start check) + the creator form's
 * on-blur validation.
 */
export function validateFormula(formula) {
  if (typeof formula !== "string" || !formula.trim()) {
    throw new Error("formula is empty");
  }
  const tokens = tokenize(formula);
  makeParser(tokens).parse(); // throws on unknown idents / syntax
  return true;
}

/**
 * Reference data exported so the creator form + help docs can
 * render them without re-deriving.
 */
export const FORMULA_REFERENCE = {
  scalars: [
    { key: "weapon_damage_dice", description: "Base damage dice count of the weapon just used" },
    { key: "spell_level",        description: "Level the spell was cast at" },
    { key: "damage_dealt",       description: "Amount of damage just dealt (on_hit/on_damage events)" },
    { key: "roll_result",        description: "The d20 roll result (on_hit/on_crit events)" },
    { key: "save_dc",            description: "DC of the save being made" },
  ],
  actor_fields: [
    { key: "level",        description: "Total character level" },
    { key: "class_level",  description: "Level in primary class" },
    { key: "prof",         description: "Proficiency bonus" },
    { key: "str",          description: "Strength score" },
    { key: "str_mod",      description: "Strength modifier" },
    { key: "dex",          description: "Dexterity score" },
    { key: "dex_mod",      description: "Dexterity modifier" },
    { key: "con",          description: "Constitution score" },
    { key: "con_mod",      description: "Constitution modifier" },
    { key: "int",          description: "Intelligence score" },
    { key: "int_mod",      description: "Intelligence modifier" },
    { key: "wis",          description: "Wisdom score" },
    { key: "wis_mod",      description: "Wisdom modifier" },
    { key: "cha",          description: "Charisma score" },
    { key: "cha_mod",      description: "Charisma modifier" },
    { key: "hp",           description: "Current HP" },
    { key: "max_hp",       description: "Maximum HP" },
    { key: "temp_hp",      description: "Temporary HP" },
    { key: "ac",           description: "Armor Class" },
    { key: "spell_mod",    description: "Spellcasting ability modifier" },
    { key: "spell_dc",     description: "Spell save DC" },
  ],
  functions: [
    { key: "min(a, b)",    description: "Smaller of the two values" },
    { key: "max(a, b)",    description: "Larger of the two values" },
    { key: "floor(x)",     description: "Round down to nearest integer" },
    { key: "ceil(x)",      description: "Round up to nearest integer" },
    { key: "abs(x)",       description: "Absolute value" },
    { key: "if(c, t, e)",  description: "Return t if c is truthy, else e" },
  ],
  operators: ["+", "-", "*", "/", "%", ">", "<", ">=", "<=", "==", "!="],
  dice: [
    { key: "1d6",    description: "Roll one d6" },
    { key: "2d8",    description: "Roll two d8" },
    { key: "4d6kh3", description: "Roll 4d6, keep highest 3" },
    { key: "2d20kl1", description: "Roll 2d20, keep lowest 1 (disadvantage)" },
  ],
};
