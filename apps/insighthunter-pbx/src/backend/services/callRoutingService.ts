// Call-flow runtime (docs/insight-pbx-master-prompt.md §4.3). Stateless: each
// Twilio webhook carries (flow, version, node) in its signed URL and this
// service renders TwiML for the next interactive step.
import { escapeXml } from "../providers/twilio/twiml.js";
import { isWithinBusinessHours } from "../utils/time.js";
import type { CallFlowDefinition, CallFlowNode } from "./callFlowValidation.js";

const MAX_HOPS = 25;

export interface StepContext {
  orgId: string;
  now: Date;
  /** Builds the signed-URL for the next webhook step. */
  stepUrl: (node: string, kind: "menu" | "dial") => string;
  voicemailAction: string;
  /** Resolves an extension to a Twilio <Client> identity, or null. */
  clientIdentityFor: (extension: string) => Promise<string | null>;
}

export interface FlowInput {
  digits?: string;
  dialStatus?: string;
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const wrap = (body: string) => `${HEADER}<Response>${body}</Response>`;
const say = (text: string) => `<Say voice="Polly.Joanna">${escapeXml(text)}</Say>`;

/** Chooses the node to run after an interactive step returned. */
export function resolveNext(
  def: CallFlowDefinition,
  fromNode: string,
  kind: "menu" | "dial",
  input: FlowInput,
): string | null {
  const node = def.nodes[fromNode];
  if (!node) return null;
  if (kind === "menu" && node.type === "menu") {
    const target = input.digits ? node.options[input.digits] : undefined;
    return target ?? node.timeoutNext;
  }
  if (kind === "dial" && node.type === "ring_extension") {
    return input.dialStatus === "completed" ? null : node.noAnswerNext;
  }
  return null;
}

/** Renders TwiML starting at `nodeId`, following non-interactive nodes. A null node ends the call. */
export async function renderFlowFrom(
  def: CallFlowDefinition,
  nodeId: string | null,
  ctx: StepContext,
): Promise<string> {
  if (nodeId === null) return wrap("<Hangup/>");
  let prefix = "";
  let current: string = nodeId;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const node: CallFlowNode | undefined = def.nodes[current];
    if (!node) break;
    switch (node.type) {
      case "say":
        prefix += say(node.text);
        current = node.next;
        continue;
      case "business_hours":
        current = isWithinBusinessHours(ctx.now, node) ? node.openNext : node.closedNext;
        continue;
      case "menu":
        return wrap(
          `${prefix}<Gather input="dtmf" numDigits="1" timeout="6" action="${escapeXml(ctx.stepUrl(current, "menu"))}">${say(node.prompt)}</Gather>` +
            `<Redirect method="POST">${escapeXml(ctx.stepUrl(current, "menu"))}</Redirect>`,
        );
      case "ring_extension": {
        const identity = await ctx.clientIdentityFor(node.extension);
        if (!identity) {
          current = node.noAnswerNext;
          continue;
        }
        return wrap(
          `${prefix}<Dial timeout="20" action="${escapeXml(ctx.stepUrl(current, "dial"))}"><Client>${escapeXml(identity)}</Client></Dial>`,
        );
      }
      case "voicemail":
        return wrap(
          `${prefix}${say("Please leave a message after the tone.")}<Record maxLength="120" playBeep="true" action="${escapeXml(ctx.voicemailAction)}"/>`,
        );
      case "hangup":
        return wrap(`${prefix}<Hangup/>`);
    }
  }
  // Missing node or hop limit: fail safe rather than loop or go silent.
  return wrap(
    `${say("We're sorry, we could not connect your call. Please try again later.")}<Hangup/>`,
  );
}
