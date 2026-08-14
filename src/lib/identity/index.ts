import { generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { MANDATE } from "@/lib/config";
import { nonce, sha256 } from "@/lib/hash";

export type AgentRole = "corporate" | "rogue";

export type AgentRecord = {
  id: string;
  role: AgentRole;
  label: string;
  did: string;
  publicKeyDer: Buffer;
  privateKey: KeyObject;
  publicKey: KeyObject;
};

function makeAgent(id: string, role: AgentRole, label: string): AgentRecord {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const did = `did:key:z${publicKeyDer.toString("base64url")}`;
  return { id, role, label, did, publicKeyDer, privateKey, publicKey };
}

const corporate = makeAgent(MANDATE.agentId, "corporate", "Apex Procure");
const rogue = makeAgent("spoof-07", "rogue", "Unknown bot");

const registry = new Map<string, AgentRecord>([
  [corporate.did, corporate],
]);

export const agents = { corporate, rogue };

export function mandateHash() {
  return sha256(
    JSON.stringify({
      sku: MANDATE.sku,
      capSgd: MANDATE.capSgd,
      merchants: MANDATE.merchants,
      agentId: MANDATE.agentId,
    }),
  );
}

export function createChallenge() {
  return nonce(16);
}

export function signIdentity(agent: AgentRecord, challenge: string) {
  const payload = `${challenge}|${agent.id}|${mandateHash()}`;
  const signature = sign(null, Buffer.from(payload), agent.privateKey).toString(
    "base64url",
  );
  return {
    agentId: agent.id,
    did: agent.did,
    challenge,
    mandateHash: mandateHash(),
    signature,
    payload,
  };
}

export type IdentityRequest = {
  agentId: string;
  did: string;
  challenge: string;
  mandateHash: string;
  signature: string;
};

export function verifyIdentity(req: IdentityRequest) {
  const expectedHash = mandateHash();
  if (req.mandateHash !== expectedHash) {
    return {
      ok: false as const,
      reason: "Mandate hash mismatch",
      code: "MANDATE_HASH",
    };
  }

  const agent = registry.get(req.did);
  if (!agent) {
    return {
      ok: false as const,
      reason: "Agent not in corporate registry",
      code: "UNKNOWN_DID",
    };
  }

  if (agent.id !== req.agentId) {
    return {
      ok: false as const,
      reason: "Agent id does not match DID",
      code: "AGENT_MISMATCH",
    };
  }

  const payload = `${req.challenge}|${req.agentId}|${req.mandateHash}`;
  const ok = verify(
    null,
    Buffer.from(payload),
    agent.publicKey,
    Buffer.from(req.signature, "base64url"),
  );

  if (!ok) {
    return {
      ok: false as const,
      reason: "Signature failed",
      code: "BAD_SIG",
    };
  }

  return {
    ok: true as const,
    agent: { id: agent.id, did: agent.did, label: agent.label },
    code: "VERIFIED",
  };
}
