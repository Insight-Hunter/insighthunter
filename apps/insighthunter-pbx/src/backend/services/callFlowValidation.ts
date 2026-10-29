// Pure validation of call-flow definitions (docs/insight-pbx-master-prompt.md §4.3).
import { type BusinessHours, isValidClock, isValidTimezone } from "../utils/time.js";

// A definition is a graph: { start, nodes: { [id]: node } }.

export type CallFlowNode =
  | { type: "say"; text: string; next: string }
  | {
      type: "menu";
      prompt: string;
      options: Record<string, string>;
      timeoutNext: string;
    }
  | ({ type: "business_hours"; openNext: string; closedNext: string } & BusinessHours)
  | { type: "ring_extension"; extension: string; noAnswerNext: string }
  | { type: "voicemail" }
  | { type: "hangup" };

export interface CallFlowDefinition {
  start: string;
  nodes: Record<string, CallFlowNode>;
}

export interface ValidationIssue {
  node?: string;
  code: string;
  message: string;
}

const MAX_NODES = 100;
const MAX_TEXT = 1000;
const NODE_ID = /^[a-zA-Z0-9_-]{1,40}$/;
const EXTENSION = /^[0-9]{2,6}$/;
const DIGIT = /^[0-9*#]$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT;
}

/** Returns structural/semantic issues; empty array means publishable. */
export function validateCallFlow(
  input: unknown,
  knownExtensions?: ReadonlySet<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(input) || !isObject(input["nodes"]) || typeof input["start"] !== "string") {
    return [{ code: "invalid_definition", message: "Expected { start, nodes }." }];
  }
  const start = input["start"];
  const nodes = input["nodes"];
  const ids = Object.keys(nodes);

  if (ids.length === 0 || ids.length > MAX_NODES) {
    return [{ code: "invalid_node_count", message: `Between 1 and ${MAX_NODES} nodes required.` }];
  }
  if (!(start in nodes)) {
    issues.push({ code: "start_missing", message: `Start node "${start}" does not exist.` });
  }

  const edges = new Map<string, string[]>();
  const link = (from: string, to: unknown, label: string) => {
    if (typeof to !== "string" || !(to in nodes)) {
      issues.push({
        node: from,
        code: "dangling_edge",
        message: `${label} must reference an existing node.`,
      });
      return;
    }
    edges.get(from)?.push(to);
  };

  for (const id of ids) {
    edges.set(id, []);
    const node = nodes[id];
    if (!NODE_ID.test(id)) {
      issues.push({
        node: id,
        code: "invalid_node_id",
        message: "Node ids are 1-40 chars [A-Za-z0-9_-].",
      });
    }
    if (!isObject(node)) {
      issues.push({ node: id, code: "invalid_node", message: "Node must be an object." });
      continue;
    }
    switch (node["type"]) {
      case "say":
        if (!text(node["text"]))
          issues.push({ node: id, code: "invalid_text", message: "text is required." });
        link(id, node["next"], "next");
        break;
      case "menu": {
        if (!text(node["prompt"]))
          issues.push({ node: id, code: "invalid_text", message: "prompt is required." });
        const options = node["options"];
        if (!isObject(options) || Object.keys(options).length === 0) {
          issues.push({
            node: id,
            code: "invalid_options",
            message: "At least one option is required.",
          });
        } else {
          for (const [digit, target] of Object.entries(options)) {
            if (!DIGIT.test(digit)) {
              issues.push({
                node: id,
                code: "invalid_digit",
                message: `"${digit}" is not a DTMF key.`,
              });
            }
            link(id, target, `option ${digit}`);
          }
        }
        link(id, node["timeoutNext"], "timeoutNext");
        break;
      }
      case "business_hours": {
        const tz = node["timezone"];
        if (typeof tz !== "string" || !isValidTimezone(tz)) {
          issues.push({
            node: id,
            code: "invalid_timezone",
            message: "Valid IANA timezone required.",
          });
        }
        const days = node["days"];
        if (
          !Array.isArray(days) ||
          days.length === 0 ||
          !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        ) {
          issues.push({ node: id, code: "invalid_days", message: "days must be integers 0-6." });
        }
        const open = node["open"];
        const close = node["close"];
        if (
          typeof open !== "string" ||
          typeof close !== "string" ||
          !isValidClock(open) ||
          !isValidClock(close) ||
          open >= close
        ) {
          issues.push({
            node: id,
            code: "invalid_hours",
            message: "open/close must be HH:MM with open < close.",
          });
        }
        link(id, node["openNext"], "openNext");
        link(id, node["closedNext"], "closedNext");
        break;
      }
      case "ring_extension": {
        const ext = node["extension"];
        if (typeof ext !== "string" || !EXTENSION.test(ext)) {
          issues.push({
            node: id,
            code: "invalid_extension",
            message: "extension must be 2-6 digits.",
          });
        } else if (knownExtensions && !knownExtensions.has(ext)) {
          issues.push({
            node: id,
            code: "unknown_extension",
            message: `Extension ${ext} does not exist.`,
          });
        }
        link(id, node["noAnswerNext"], "noAnswerNext");
        break;
      }
      case "voicemail":
      case "hangup":
        break;
      default:
        issues.push({ node: id, code: "unknown_type", message: "Unsupported node type." });
    }
  }

  // Reachability and termination: every reachable path must be able to end.
  const reachable = new Set<string>();
  const stack = start in nodes ? [start] : [];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (reachable.has(id)) continue;
    reachable.add(id);
    stack.push(...(edges.get(id) ?? []));
  }
  for (const id of ids) {
    if (!reachable.has(id)) {
      issues.push({ node: id, code: "unreachable", message: "Node is not reachable from start." });
    }
  }

  const terminal = (id: string) => {
    const t = (nodes[id] as { type?: unknown } | undefined)?.type;
    return t === "voicemail" || t === "hangup";
  };
  const canTerminate = new Set(ids.filter(terminal));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, targets] of edges) {
      if (!canTerminate.has(id) && targets.some((t) => canTerminate.has(t))) {
        canTerminate.add(id);
        changed = true;
      }
    }
  }
  for (const id of reachable) {
    if (!canTerminate.has(id)) {
      issues.push({
        node: id,
        code: "no_termination",
        message: "Node cannot reach voicemail or hangup.",
      });
    }
  }

  return issues;
}
