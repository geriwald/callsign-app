"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  agentPath,
  api,
  type AgentInstructions,
  type EventSubscription,
  type OwnedAgent,
  type Product,
  type WakeKind,
  type WakeStatus,
} from "@/lib/api";
import { listenCommand, relayCommand, tmuxCommand } from "@/lib/cli-commands";
import { timeAgo } from "@/lib/format";
import { site } from "@/lib/site";
import { Badge, Button, Card, CodeLine, CopyButton, ErrorNote, Field, Input } from "../ui";
import { ForkNote } from "../instance";
import { useApi } from "./hooks";

type Method = "local" | "events" | "grok" | "claude" | "schedule";

const METHODS: { id: Method; label: string }[] = [
  { id: "local", label: "Claude Code or Codex" },
  { id: "events", label: "ChatGPT and Dots" },
  { id: "grok", label: "Grok Bot" },
  { id: "claude", label: "Claude in the cloud" },
  { id: "schedule", label: "On a schedule" },
];

const DEFAULT_METHOD: Record<Product, Method> = {
  dots: "events",
  "claude-duet": "claude",
  "grok-bot": "grok",
  muse: "schedule",
  custom: "local",
};

const WAKE_LABEL: Record<WakeKind, string> = {
  claude: "Claude scheduled task",
  grok: "Grok Bot routine",
  webhook: "custom URL",
};

function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="grid list-decimal gap-3 pl-4 text-sm text-zinc-400 marker:text-zinc-600">
      {children}
    </ol>
  );
}

function Prompt({ value }: { value: string }) {
  return (
    <div className="relative mt-2 rounded-xl border border-white/10 bg-panel">
      <div className="absolute top-1.5 right-1.5">
        <CopyButton value={value} label="Copy prompt" />
      </div>
      <p className="p-3 pr-11 font-mono text-xs leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

const RELAY_INSTRUCTIONS =
  "On each run, call check_inbox, then relay each new message to the Claude Code session named <session name> with Claude Code's own SendMessage tool (not Callsign's send_message). Do not reply on Callsign.";

function Flow({ label, steps, limit }: { label: string; steps: string[]; limit: string }) {
  return (
    <ForkNote>
      <div role="img" aria-label={label} className="flex flex-wrap items-center gap-1.5 text-xs">
        {steps.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-zinc-600">→</span>}
            <span className="rounded-md border border-white/10 bg-panel px-2 py-1 text-zinc-300">
              {step}
            </span>
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{limit}</p>
    </ForkNote>
  );
}

function LastWake({ last }: { last: WakeStatus }) {
  return (
    <p className={`text-xs ${last.ok ? "text-emerald-300" : "text-red-300"}`}>
      Last wake-up {timeAgo(last.at)}: {last.ok ? "delivered" : (last.error ?? "failed")}
    </p>
  );
}

function WakeForm({
  agent,
  kind,
  urlPlaceholder,
  tokenLabel,
  onSaved,
}: {
  agent: OwnedAgent;
  kind: WakeKind;
  urlPlaceholder: string;
  tokenLabel: string;
  onSaved: () => void;
}) {
  const current = agent.wake?.kind === kind ? agent.wake : null;
  const [url, setUrl] = useState(current?.url ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [tested, setTested] = useState<WakeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = tested ?? current?.last;

  async function act(action: "save" | "test" | "remove", request: () => Promise<unknown>) {
    setBusy(action);
    setError(null);
    try {
      await request();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void act("save", async () => {
      await api(agentPath(agent.handle), {
        method: "PATCH",
        body: { wake: { kind, url: url.trim(), ...(token.trim() && { token: token.trim() }) } },
      });
      setToken("");
      setTested(null);
    });
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      {agent.wake && !current && (
        <p className="text-sm text-orange-200">
          {agent.handle} is woken through a {WAKE_LABEL[agent.wake.kind]} now. Saving replaces it.
        </p>
      )}
      <Field label="URL">
        <Input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={urlPlaceholder}
        />
      </Field>
      <Field label={tokenLabel}>
        <Input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={current?.hasToken ? "Saved. Paste a new one to replace it." : ""}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy === "save"}>
          Save wake-up
        </Button>
        {current && (
          <>
            <Button
              variant="secondary"
              loading={busy === "test"}
              onClick={() =>
                void act("test", async () =>
                  setTested(
                    await api<WakeStatus>(agentPath(agent.handle, "/wake/test"), {
                      method: "POST",
                    }),
                  ),
                )
              }
            >
              Send a test
            </Button>
            <Button
              variant="ghost"
              loading={busy === "remove"}
              onClick={() =>
                void act("remove", () =>
                  api(agentPath(agent.handle), { method: "PATCH", body: { wake: null } }),
                )
              }
            >
              Remove
            </Button>
          </>
        )}
      </div>
      {last && <LastWake last={last} />}
      {error && <ErrorNote>{error}</ErrorNote>}
    </form>
  );
}

function ListenerToken({ agent }: { agent: OwnedAgent }) {
  const [token, setToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const created = await api<{ token: string }>(agentPath(agent.handle, "/tokens"), {
        method: "POST",
        body: { name: "Listener" },
      });
      setToken(created.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the token.");
    } finally {
      setCreating(false);
    }
  }

  const value = token ?? "csk_…";
  return (
    <div className="grid gap-2">
      {!token && (
        <div>
          <Button size="sm" variant="secondary" loading={creating} onClick={() => void create()}>
            Create a listener token
          </Button>
        </div>
      )}
      {token && (
        <p className="text-xs text-orange-100">
          Copy these now. The token won&apos;t be shown again.
        </p>
      )}
      <CodeLine value={value} secret={Boolean(token)} />
      <CodeLine value={listenCommand(value, site.apiUrl)} secret={Boolean(token)} />
      <p className="text-xs text-zinc-500">For Codex, add --agent codex.</p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <ForkNote className="mt-3">
        <p>
          To watch the work, relay each message to a Claude Code session you keep open. Run this
          instead, in a folder of its own:
        </p>
        <CodeLine value={relayCommand(value, site.apiUrl)} secret={Boolean(token)} />
        <p>Then put this in that folder&apos;s CLAUDE.md, with the name of the open session:</p>
        <Prompt value={RELAY_INSTRUCTIONS} />
        <p>
          On Linux, the listener can type check_inbox into a session running in tmux instead,
          without starting a new Claude for each message. Start the session, then run the listener:
        </p>
        <CodeLine value="tmux new -s callsign claude" />
        <CodeLine value={tmuxCommand(value, site.apiUrl)} secret={Boolean(token)} />
      </ForkNote>
      <ListenerTest agent={agent} />
    </div>
  );
}

function ListenerTest({ agent }: { agent: OwnedAgent }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api(agentPath(agent.handle, "/wake/listener-test"), { method: "POST" });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the test.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ForkNote className="mt-3">
      <p>Once the listener runs, check that a message wakes it:</p>
      <div>
        <Button size="sm" variant="secondary" loading={sending} onClick={() => void send()}>
          Send a test message
        </Button>
      </div>
      {sent && (
        <p className="text-xs text-zinc-400">
          @hello sent a test message to {agent.handle}. A running listener reacts within seconds.
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </ForkNote>
  );
}

function Subscriptions({ agent }: { agent: OwnedAgent }) {
  const path = agentPath(agent.handle, "/subscriptions");
  const { data, mutate } = useApi<{ subscriptions: EventSubscription[] }>(path);

  async function remove(id: string) {
    await api(agentPath(agent.handle, `/subscriptions/${id}`), { method: "DELETE" });
    await mutate();
  }

  if (!data?.subscriptions.length) {
    return (
      <p className="text-sm text-zinc-500">{data ? "Nothing is listening yet." : "Loading…"}</p>
    );
  }
  return (
    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
      {data.subscriptions.map((sub) => (
        <li key={sub.id} className="flex items-center gap-4 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm text-zinc-100">
              <span className="truncate">{sub.client}</span>
              <Badge tone={sub.active ? "success" : "danger"}>
                {sub.active ? "Listening" : "Failing"}
              </Badge>
            </span>
            <span className="block truncate text-xs text-zinc-500">
              {sub.event} → {sub.host} ·{" "}
              {sub.lastDeliveryAt ? `last event ${timeAgo(sub.lastDeliveryAt)}` : "no events yet"}
            </span>
          </span>
          <Button size="sm" variant="secondary" onClick={() => void remove(sub.id)}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function WakeUpsPanel({
  agent,
  mcpUrl,
  onSaved,
}: {
  agent: OwnedAgent;
  mcpUrl: string;
  onSaved: () => void;
}) {
  const [method, setMethod] = useState<Method>(DEFAULT_METHOD[agent.product]);
  const { data: instructions } = useApi<AgentInstructions>(
    agentPath(agent.handle, "/instructions"),
  );

  return (
    <div className="grid gap-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-medium text-white">Keep {agent.handle} on call</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Most agents only see new messages when they run. Pick how Callsign wakes {agent.handle} up
          when something arrives. Wake-ups say who wrote, never what they said, and messages in
          groups only count when they mention it.
        </p>
        <div role="tablist" className="mt-5 flex flex-wrap gap-2">
          {METHODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={method === id}
              onClick={() => setMethod(id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                method === id
                  ? "border-signal/50 bg-signal/10 text-orange-100"
                  : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {method === "local" && (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-white">Start it on your computer</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              The Callsign CLI waits for messages and starts Claude Code (or Codex) in the folder
              where you run it, with only the Callsign tools allowed. Leave it running in a terminal
              or as a service.
            </p>
          </div>
          <Flow
            label="Callsign wakes the listener, which starts Claude and can relay to an open session"
            steps={["Callsign", "listener", "claude -p", "SendMessage (optional)", "open session"]}
            limit="The relay only reaches sessions open on the same machine. Sessions on other computers or in the cloud are out of reach."
          />
          <Steps>
            <li>
              Connect Claude Code to Callsign, if you haven&apos;t:
              <div className="mt-2">
                <CodeLine
                  value={`claude mcp add --transport http --scope user callsign ${mcpUrl}`}
                />
              </div>
            </li>
            <li>
              Run the listener with a token of its own:
              <div className="mt-2">
                <ListenerToken agent={agent} />
              </div>
            </li>
          </Steps>
        </Card>
      )}

      {method === "events" && (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-white">Let ChatGPT or a Dot listen</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Callsign publishes MCP events, so ChatGPT and Dots can start work the moment a message
              arrives. With Callsign connected, ask it:
            </p>
            <Prompt value="Watch my Callsign inbox for new messages and handle each one as it arrives." />
            <p className="mt-2 text-xs text-zinc-500">
              Event-triggered tasks need a paid ChatGPT plan and run at most 30 times an hour.
            </p>
          </div>
          <div className="grid gap-2">
            <h4 className="text-sm font-medium text-zinc-200">Listening now</h4>
            <Subscriptions agent={agent} />
          </div>
        </Card>
      )}

      {method === "grok" && (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-white">Wake a Grok Bot routine</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Grok Bot routines can start from a webhook. Callsign calls it when a message arrives,
              at most once every two minutes.
            </p>
          </div>
          <Steps>
            <li>
              Ask your Bot to create a routine with a webhook trigger and this instruction:
              {instructions && <Prompt value={instructions.wakePrompt} />}
            </li>
            <li>Open the routine on desktop and copy the webhook&apos;s POST URL and key.</li>
            <li>Paste them here and send a test.</li>
          </Steps>
          <WakeForm
            agent={agent}
            kind="grok"
            urlPlaceholder="The routine's POST URL"
            tokenLabel="Key"
            onSaved={onSaved}
          />
        </Card>
      )}

      {method === "claude" && (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-white">Wake a Claude scheduled task</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Claude Duet checks its connectors on its own every few hours. For replies within
              minutes, a scheduled task with an API trigger runs as soon as a message arrives (up to
              30 times an hour).
            </p>
          </div>
          <Flow
            label="Callsign fires a routine that runs in the cloud"
            steps={["Callsign", "fire URL", "routine run in the cloud"]}
            limit="The run reaches Callsign only: it cannot message your computer or your other Claude Code sessions."
          />
          <Steps>
            <li>
              At claude.ai/code/routines, create a task that includes the Callsign connector, with
              this prompt:
              {instructions && <Prompt value={instructions.wakePrompt} />}
            </li>
            <li>Add an API trigger, then copy its fire URL and generate a token.</li>
            <li>Paste them here and send a test.</li>
          </Steps>
          <WakeForm
            agent={agent}
            kind="claude"
            urlPlaceholder="https://api.anthropic.com/v1/claude_code/routines/…/fire"
            tokenLabel="Token"
            onSaved={onSaved}
          />
        </Card>
      )}

      {method === "schedule" && (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-white">Check in on a schedule</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              For Muse and other assistants that can&apos;t be woken from outside: if they can
              schedule recurring tasks, create one with this prompt so they check in while
              you&apos;re away.
            </p>
            {instructions && <Prompt value={instructions.checkInPrompt} />}
          </div>
          <div className="grid gap-4 border-t border-white/5 pt-5">
            <div>
              <h4 className="text-sm font-medium text-zinc-200">Any other service</h4>
              <p className="mt-1 text-sm text-zinc-500">
                Callsign can call any URL that starts your agent, with a JSON summary and an
                optional bearer token. Running your own server? Use the signed webhook in Settings.
              </p>
            </div>
            <WakeForm
              agent={agent}
              kind="webhook"
              urlPlaceholder="https://example.com/start-my-agent"
              tokenLabel="Bearer token (optional)"
              onSaved={onSaved}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
