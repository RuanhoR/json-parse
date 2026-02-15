import { JSONToken, TokenParser } from "../token";
class JSONProgram {
  constructor(
    public token: JSONToken[],
    public object: object,
  ) {}
}
class Parser {
  token: JSONToken[];
  constructor(public code: string) {
    this.token = TokenParser(code);
  }
  generateObject() {
    return new JSONProgram(this.token, this.handlerToken(this.token));
  }
  handlerToken(tokens: JSONToken[]): object {
    let i = 0;
    const len = tokens.length;

    function skipSpaces() {
      while (
        i < len &&
        ((tokens[i] as JSONToken).type === "Space" ||
          (tokens[i] as JSONToken).type === "Comment")
      )
        i++;
    }

    function parseValue(): any {
      skipSpaces();
      if (i >= len) throw new Error("[parser]: Unexpected end of input");
      const tk = tokens[i];
      if (!tk) return;
      if (tk.type === "ObjectStart") return parseObject();
      if (tk.type === "ArrayStart") return parseArray();
      if (tk.type === "Data") {
        i++;
        return thisRef.handlerData(tk);
      }
      if (tk.type === "ObjectKey") {
        // treat as quoted string value
        i++;
        const code = tk.code;
        if (
          (code.startsWith('"') && code.endsWith('"')) ||
          (code.startsWith("'") && code.endsWith("'"))
        ) {
          return code.slice(1, -1);
        }
        return code;
      }
      throw new Error(`[parser]: Unexpected token type '${tk.type}'`);
    }

    function parseObject(): object {
      const obj: any = {};
      // consume '{'
      i++;
      skipSpaces();
      if (i < len && (tokens[i] as JSONToken).type === "ObjectEnd") {
        i++;
        return obj;
      }
      while (i < len) {
        skipSpaces();
        if (i >= len) throw new Error("[parser]: Unexpected end in object");
        const keyToken = tokens[i];
        if (!keyToken) continue;
        let key: string;
        if (keyToken.type === "ObjectKey") {
          key = keyToken.code;
          if (
            (key.startsWith('"') && key.endsWith('"')) ||
            (key.startsWith("'") && key.endsWith("'"))
          ) {
            key = key.slice(1, -1);
          }
          i++;
        } else if (keyToken.type === "Data") {
          // accept unquoted key or quoted data
          key = keyToken.code;
          if (
            (key.startsWith('"') && key.endsWith('"')) ||
            (key.startsWith("'") && key.endsWith("'"))
          ) {
            key = key.slice(1, -1);
          }
          i++;
        } else {
          throw new Error("[parser]: Expected object key");
        }

        skipSpaces();
        if (
          i >= len ||
          (tokens[i] as JSONToken).type !== "Spilt" ||
          (tokens[i] as JSONToken).code !== ":"
        ) {
          throw new Error("[parser]: Expected ':' after key");
        }
        // consume ':'
        i++;

        const value = parseValue();
        obj[key] = value;

        skipSpaces();
        if (
          i < len &&
          (tokens[i] as JSONToken).type === "Spilt" &&
          (tokens[i] as JSONToken).code === ","
        ) {
          i++;
          continue;
        }
        if (i < len && (tokens[i] as JSONToken).type === "ObjectEnd") {
          i++;
          break;
        }
      }
      return obj;
    }

    function parseArray(): any[] {
      const arr: any[] = [];
      // consume '['
      i++;
      skipSpaces();
      if (i < len && (tokens[i] as JSONToken).type === "ArrayEnd") {
        i++;
        return arr;
      }
      while (i < len) {
        const val = parseValue();
        arr.push(val);
        skipSpaces();
        const tk = tokens[i];
        if (!tk) continue;
        if (i < len && tk.type === "Spilt" && tk.code === ",") {
          i++;
          continue;
        }
        if (i < len && tk.type === "ArrayEnd") {
          i++;
          break;
        }
      }
      return arr;
    }

    // bind thisRef so parseValue can call handlerData
    const thisRef = this as any;

    const result = parseValue();
    return result as object;
  }
  handlerData(token: JSONToken): number | string | null | boolean {
    if (token.type !== "Data") {
      throw new Error("[parser]: must Data JsonKey");
    }
    if (token.code == "null") return null;
    if (token.code == "true") return true;
    if (token.code == "false") return false;
    if (token.code.startsWith("'") && token.code.endsWith("'")) {
      return token.code.slice(1, -1);
    }
    if (token.code.startsWith('"') && token.code.endsWith('"')) {
      return token.code.slice(1, -1);
    }
    const num = parseFloat(token.code);
    if (!Number.isNaN(num)) return num;
    throw new Error(`[parse value]: Unexpected '${token.code}'`);
  }
}
function ParserFn(code: string) {
  return new Parser(code).generateObject();
}
export { ParserFn as Parser };
