/**
 * Universal Content Parser
 * Converts various content formats (TipTap JSON, Blocks, raw HTML/Text) 
 * into a clean, portable Markdown string.
 */

export type Mark = { type: string; attrs?: Record<string, any> };
export type JSONText = { type: "text"; text: string; marks?: Mark[] };
export type JSONNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: (JSONNode | JSONText)[];
  text?: string;
  marks?: Mark[];
};
export type JSONDoc = { type: "doc"; content?: JSONNode[] };

export function asArticleJsonDoc(content: unknown): JSONDoc | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }
  const doc = content as JSONDoc;
  if (doc.type !== "doc" || !Array.isArray(doc.content) || doc.content.length === 0) {
    return null;
  }
  return doc;
}

/**
 * Translates a TipTap JSON tree into a clean Markdown string.
 */
export function translateTipTap(node: JSONNode | JSONDoc | JSONText): string {
  if (!node) return "";

  // Handle text nodes
  if (node.type === "text") {
    let text = (node as JSONText).text || "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold" || mark.type === "strong") text = `**${text}**`;
        if (mark.type === "italic" || mark.type === "em") text = `_${text}_`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "link") text = `[${text}](${mark.attrs?.href})`;
      }
    }
    return text;
  }

  const content = node.content?.map(translateTipTap).join("") || "";

  switch (node.type) {
    case "doc":
      return node.content?.map(translateTipTap).join("\n\n") || "";
    case "paragraph":
      return content;
    case "heading":
      const level = node.attrs?.level || 1;
      return `${"#".repeat(level)} ${content}`;
    case "bulletList":
      return node.content?.map((item) => `* ${translateTipTap(item)}`).join("\n") || "";
    case "orderedList":
      return node.content?.map((item, i) => `${i + 1}. ${translateTipTap(item)}`).join("\n") || "";
    case "listItem":
      return content;
    case "blockquote": {
      const quoted = content
        .split("\n")
        .map((line) => (line.trim() ? `> ${line}` : ">"))
        .join("\n");
      return quoted;
    }
    case "horizontalRule":
      return "---";
    case "image":
      return `![${node.attrs?.alt || ""}](${node.attrs?.src})`;
    case "hardBreak":
      return "\n";
    case "codeBlock":
      return `\`\`\`${node.attrs?.language || ""}\n${content}\n\`\`\``;
    default:
      return content;
  }
}

/**
 * The Gatekeeper: Sniffs input and returns clean Markdown.
 */
export function universalParser(input: any): string {
  if (!input) return "";

  // 1. If it's a string, check if it's hidden JSON
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        input = JSON.parse(trimmed);
      } catch (e) {
        return input; // It's a raw string/Markdown already
      }
    } else {
      return input; // It's already clean Markdown or Text
    }
  }

  // 2. If it's the "Blocks" format (legacy or custom)
  if (input.blocks && Array.isArray(input.blocks)) {
    return input.blocks.map((b: any) => b.text).join("\n\n");
  }

  // 3. If it's the "TipTap" format (Recursive)
  if (input.type === "doc") {
    return translateTipTap(input);
  }

  // 4. Fallback for arrays
  if (Array.isArray(input)) {
    return input.map(universalParser).join("\n\n");
  }

  return String(input);
}
