"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { Button, Card, ErrorNote, Input, Toggle } from "../ui";
import { ForkFrame, ForkMark } from "../instance";
import { useOwner } from "./hooks";

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function TestButton({ channel, label }: { channel: "email" | "telegram"; label: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setSent(false);
    setError(null);
    try {
      await api("/v1/me/answer-test", { method: "POST", body: { channel } });
      setSent(true);
    } catch (err) {
      setError(errorText(err, "Couldn't send the test."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div>
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void send()}>
          {label}
        </Button>
      </div>
      {sent && <p className="text-xs text-zinc-400">Sent. Check that it arrived.</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

function ChannelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="grid content-start gap-3 p-5 sm:p-6">
      <h3 className="font-medium text-white">{title}</h3>
      {children}
    </Card>
  );
}

function AnswerCard() {
  const owner = useOwner();
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | null>(null);
  const { email, telegram } = owner.answer;
  const linked = owner.telegram?.linked ?? false;

  async function update(body: { answerEmail?: boolean; answerTelegram?: boolean }) {
    setError(null);
    try {
      await api("/v1/me", { method: "PATCH", body });
      await mutate("/v1/me");
    } catch (err) {
      setError(errorText(err, "Couldn't save the setting."));
    }
  }

  return (
    <ChannelCard title="Answer">
      <p className="text-sm text-zinc-500">
        Where your agents&apos; questions and approvals reach you. Keep at least one. Security
        alerts always come by email, and on Telegram when it&apos;s connected.
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-300">Email</span>
        <Toggle
          checked={email}
          disabled={email && !telegram}
          onChange={(checked) => void update({ answerEmail: checked })}
          label="Answer by email"
        />
      </div>
      {owner.telegram && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">Telegram</span>
          <Toggle
            checked={telegram}
            disabled={!linked || (telegram && !email)}
            onChange={(checked) => void update({ answerTelegram: checked })}
            label="Answer on Telegram"
          />
        </div>
      )}
      <div className="grid gap-1 border-t border-white/5 pt-3">
        <p className="flex items-center gap-1.5 text-sm text-zinc-300">
          Confidential mode <ForkMark className="size-3.5 text-signal" />
        </p>
        <p className="text-sm text-zinc-500">
          On this server, conversations are confidential by default: their content isn&apos;t sent
          to Telegram or by email, so it&apos;s exposed in fewer places. You read it in this
          dashboard.
        </p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
    </ChannelCard>
  );
}

function EmailCard() {
  const owner = useOwner();
  const { mutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  function sendCode(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api("/v1/me/answer-address", { method: "POST", body: { email: address } });
      setCodeSent(true);
    }, "Couldn't send the code.");
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api("/v1/me/answer-address/confirm", { method: "POST", body: { code } });
      await mutate("/v1/me");
      setEditing(false);
      setCodeSent(false);
      setAddress("");
      setCode("");
    }, "Couldn't confirm the code.");
  }

  function reset() {
    void run(async () => {
      await api("/v1/me/answer-address", { method: "DELETE" });
      await mutate("/v1/me");
    }, "Couldn't go back to your sign-in address.");
  }

  return (
    <ChannelCard title="Email">
      <p className="text-sm text-zinc-500">
        Questions and approvals go to{" "}
        <span className="break-all text-zinc-300">{owner.answer.address}</span>.
      </p>
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Use another address
          </Button>
          {owner.answer.customAddress && (
            <Button size="sm" variant="secondary" loading={busy} onClick={reset}>
              Use {owner.email}
            </Button>
          )}
        </div>
      )}
      {editing && !codeSent && (
        <form onSubmit={sendCode} className="grid gap-2">
          <Input
            type="email"
            aria-label="New address"
            placeholder="you@example.com"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
          <div>
            <Button size="sm" type="submit" loading={busy}>
              Send a code
            </Button>
          </div>
        </form>
      )}
      {editing && codeSent && (
        <form onSubmit={confirm} className="grid gap-2">
          <p className="text-xs text-zinc-400">
            Type the six-digit code sent to <span className="break-all">{address}</span>.
          </p>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
          <div>
            <Button size="sm" type="submit" loading={busy}>
              Confirm
            </Button>
          </div>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <TestButton channel="email" label="Test email" />
    </ChannelCard>
  );
}

function TelegramCard() {
  const owner = useOwner();
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = owner.telegram?.linked ?? false;

  useEffect(() => {
    if (!waiting || linked) return;
    const timer = setInterval(() => void mutate("/v1/me"), 3000);
    const stop = setTimeout(() => setWaiting(false), 10 * 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [waiting, linked, mutate]);

  async function connect() {
    setBusy(true);
    setError(null);
    const tab = window.open("", "_blank");
    try {
      const { url } = await api<{ url: string }>("/v1/me/telegram", { method: "POST" });
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setWaiting(true);
    } catch (err) {
      tab?.close();
      setError(errorText(err, "Couldn't start the connection."));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await api("/v1/me/telegram", { method: "DELETE" });
      await mutate("/v1/me");
    } catch (err) {
      setError(errorText(err, "Couldn't disconnect Telegram."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChannelCard title="Telegram">
      <p className="text-sm text-zinc-500">
        {linked
          ? "Connected. Tap an option or reply to answer, and freeze an agent with one tap."
          : "Answer your agents and freeze an agent with one tap, without opening email."}
      </p>
      <div>
        {linked ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => void disconnect()}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" loading={busy} onClick={() => void connect()}>
            Connect Telegram
          </Button>
        )}
      </div>
      {waiting && !linked && (
        <p className="text-xs text-zinc-500">
          Press Start in the Telegram chat that opened. This page updates once it&apos;s connected.
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {linked && <TestButton channel="telegram" label="Test Telegram" />}
    </ChannelCard>
  );
}

export function AnswerSettings() {
  const owner = useOwner();
  return (
    <div className="grid gap-6">
      <ForkFrame>
        <AnswerCard />
      </ForkFrame>
      <ForkFrame>
        <EmailCard />
      </ForkFrame>
      {owner.telegram && (
        <ForkFrame>
          <TelegramCard />
        </ForkFrame>
      )}
    </div>
  );
}
