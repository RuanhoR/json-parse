class JSONToken {
  constructor(
    public code: string,
    public type: (typeof JSONTokenType)[number],
  ) {
    if (typeof code !== "string")
      throw new TypeError("[json token]: must string");
  }
}
const JSONTokenType = [
  "Data",
  "Spilt",
  "Space",
  "ObjectStart",
  "ArrayStart",
  "ObjectEnd",
    "Comment",
  "ArrayEnd",
  "ObjectKey",
] as const;
class TokenParser {
  constructor(private code: string, private keepComments = false) {
    this.start();
  }
  token: JSONToken[] = [];
  start() {
    const tokens: JSONToken[] = [];
    const src = this.code;
    const len = src.length;
    let i = 0;
    while (i < len) {
      const ch = src[i];
      if (!ch) continue;
      // skip newline entirely (original code treated '\n' specially)
      if (ch === "\n") {
        i++;
        continue;
      }

      // contiguous spaces (except '\n') -> Space token
      if (/\s/.test(ch)) {
        let j = i + 1;
        while (j < len && src[j] !== "\n" && /\s/.test((src[j] as string))) j++;
        tokens.push(new JSONToken(src.slice(i, j), "Space"));
        i = j;
        continue;
      }

      // structural single-char tokens
      if (ch === "{") {
        tokens.push(new JSONToken(ch, "ObjectStart"));
        i++;
        continue;
      }
      if (ch === "}") {
        tokens.push(new JSONToken(ch, "ObjectEnd"));
        i++;
        continue;
      }
      if (ch === "[") {
        tokens.push(new JSONToken(ch, "ArrayStart"));
        i++;
        continue;
      }
      if (ch === "]") {
        tokens.push(new JSONToken(ch, "ArrayEnd"));
        i++;
        continue;
      }
      if (ch === ":" || ch === ",") {
        tokens.push(new JSONToken(ch, "Spilt"));
        i++;
        continue;
      }

      // comments: // single-line or /* */ multi-line
      if (ch === "/") {
        const next = src[i + 1];
        if (next === "/") {
          // single-line comment: skip until newline (optionally emit)
          let j = i + 2;
          while (j < len && src[j] !== "\n") j++;
          const segment = src.slice(i, j);
          if (this.keepComments) tokens.push(new JSONToken(segment, "Comment"));
          i = j;
          continue;
        }
        if (next === "*") {
          // multi-line comment: skip until */ (optionally emit)
          let j = i + 2;
          while (j < len) {
            if (src[j] === "*" && src[j + 1] === "/") {
              j += 2;
              break;
            }
            j++;
          }
          const segment = src.slice(i, j);
          if (this.keepComments) tokens.push(new JSONToken(segment, "Comment"));
          i = j;
          continue;
        }
      }
      // string (supports escapes)
      if (ch === '"') {
        let j = i + 1;
        let closed = false;
        while (j < len) {
          const c2 = src[j];
          if (c2 === "\\") {
            j += 2; // skip escaped char
            continue;
          }
          if (c2 === '"') {
            j++;
            closed = true;
            break;
          }
          j++;
        }
        // take whatever we found (if unterminated, take to end)
        const segment = src.slice(i, j);
        tokens.push(new JSONToken(segment, "Data"));
        i = j;
        continue;
      }

      // number, literal, or unquoted data: consume until whitespace or structural char
      let j = i;
      while (j < len) {
        const c2 = src[j];
        if (!c2) continue;
        if (c2 === "\n") break;
        if (/\s/.test(c2)) break;
        if ("{}[]:,".includes(c2)) break;
        j++;
      }
      const seg = src.slice(i, j);
      tokens.push(new JSONToken(seg, "Data"));
      i = j;
    }

    // post-process: if a Data token is a quoted string and next non-space token is ':' then it's an ObjectKey
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      if (!t) continue;
      if (
        t.type === "Data" &&
        typeof t.code === "string" &&
        t.code.startsWith('"')
      ) {
        let m = k + 1;
        while (m < tokens.length && (tokens[m] as JSONToken).type === "Space")
          m++;
        if (
          m < tokens.length &&
          (tokens[m] as JSONToken).type === "Spilt" &&
          (tokens[m] as JSONToken).code === ":"
        ) {
          t.type = "ObjectKey";
        }
      }
    }

    this.token = tokens;
  }
}
function ParserTokenFn(code: string, keepComments = false) {
  return (new TokenParser(code, keepComments)).token;
}
export {
  JSONToken,
  JSONTokenType,
  ParserTokenFn as TokenParser
}