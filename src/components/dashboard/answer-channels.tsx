"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api, type PushDevice } from "@/lib/api";
import {
  deviceLabel,
  isStandalone,
  platform,
  pushSupported,
  subscribeDevice,
} from "@/lib/web-push";
import { Button, Card, ErrorNote, Input, Toggle } from "../ui";
import { ForkFrame, ForkMark } from "../instance";
import { useApi, useOwner } from "./hooks";

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

type PushState = { publicKey: string | null; devices: PushDevice[] };

function AnswerCard() {
  const owner = useOwner();
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | null>(null);
  const { email, telegram, push } = owner.answer;
  const linked = owner.telegram?.linked ?? false;
  const { data: devices } = useApi<PushState>("/v1/me/push");
  const tested = devices?.devices.some((device) => device.tested) ?? false;
  const on = [email, telegram, push].filter(Boolean).length;

  async function update(body: {
    answerEmail?: boolean;
    answerTelegram?: boolean;
    answerPush?: boolean;
  }) {
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
          disabled={email && on === 1}
          onChange={(checked) => void update({ answerEmail: checked })}
          label="Answer by email"
        />
      </div>
      {owner.telegram && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">Telegram</span>
          <Toggle
            checked={telegram}
            disabled={!linked || (telegram && on === 1)}
            onChange={(checked) => void update({ answerTelegram: checked })}
            label="Answer on Telegram"
          />
        </div>
      )}
      {devices?.publicKey && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">
            Web app
            {!tested && !push && (
              <span className="block text-xs text-zinc-500">
                Pass a test question on a device first.
              </span>
            )}
          </span>
          <Toggle
            checked={push}
            disabled={(!push && !tested) || (push && on === 1)}
            onChange={(checked) => void update({ answerPush: checked })}
            label="Answer in the web app"
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

function DeviceRow({ device, onChanged }: { device: PushDevice; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>, done: string) {
    setBusy(key);
    setNote(null);
    setError(null);
    try {
      await action();
      setNote(done);
    } catch (err) {
      setError(errorText(err, "That didn't work."));
    } finally {
      setBusy(null);
    }
  }

  const test = (kind: "notification" | "question") =>
    run(
      kind,
      () => api(`/v1/me/push/${device.id}/test`, { method: "POST", body: { kind } }),
      kind === "question"
        ? "Sent. Tap the notification: it should open this page and confirm the test."
        : "Sent. Check that it arrived.",
    );

  return (
    <li className="grid gap-2 border-t border-white/5 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-300">
          {device.label}{" "}
          <span className={device.tested ? "text-emerald-400" : "text-zinc-500"}>
            · {device.tested ? "tested" : "not tested yet"}
          </span>
        </span>
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "remove"}
          onClick={() =>
            void run(
              "remove",
              async () => {
                await api(`/v1/me/push/${device.id}`, { method: "DELETE" });
                onChanged();
              },
              "Removed.",
            )
          }
        >
          Remove
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "notification"}
          onClick={() => void test("notification")}
        >
          Test notification
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "question"}
          onClick={() => void test("question")}
        >
          Test question
        </Button>
      </div>
      {note && <p className="text-xs text-zinc-400">{note}</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
    </li>
  );
}

type Diagnostic = {
  version: string;
  log: { at: string; step: string; detail?: string }[];
};

// Shows what the service worker saw on the last notification tap, to debug it from a screenshot.
function PushDiagnostics() {
  const [controlled, setControlled] = useState<boolean | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const worker = navigator.serviceWorker;
    function onMessage(event: MessageEvent) {
      const data = event.data as ({ type?: string } & Diagnostic) | null;
      if (data?.type === "callsign:diagnostic") setDiagnostic(data);
    }
    worker.addEventListener("message", onMessage);
    void worker.ready.then((registration) => {
      setControlled(worker.controller !== null);
      registration.active?.postMessage({ type: "callsign:diagnostic?" });
    });
    return () => worker.removeEventListener("message", onMessage);
  }, []);

  if (controlled === null) return null;
  return (
    <div className="font-mono text-[11px] leading-relaxed text-zinc-600">
      <p>
        worker {diagnostic?.version ?? "?"} · {controlled ? "controls this page" : "no controller"}
      </p>
      {diagnostic?.log.map((entry) => (
        <p key={`${entry.at}-${entry.step}`} className="break-all">
          {new Date(entry.at).toLocaleTimeString()} {entry.step}
          {entry.detail ? ` · ${entry.detail}` : ""}
        </p>
      ))}
    </div>
  );
}

function InstallSteps() {
  const kind = platform();
  if (kind === "ios") {
    return (
      <p className="text-sm text-zinc-500">
        On this iPhone, open this page in Safari, tap Share, then Add to Home Screen (iOS 16.4 or
        later). Open Callsign from the home screen, sign in with the code from your sign-in email,
        and come back here.
      </p>
    );
  }
  if (kind === "android") {
    return (
      <p className="text-sm text-zinc-500">
        In Chrome, open the menu and choose Install app, then open Callsign from your home screen.
        Notifications also work without installing it.
      </p>
    );
  }
  return (
    <p className="text-sm text-zinc-500">
      Open this page on your phone to install Callsign on its home screen. This browser can also
      get notifications while it&apos;s open.
    </p>
  );
}

function WebAppCard() {
  const { data, mutate } = useApi<PushState>("/v1/me/push");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The account page only renders in the browser, once the owner is loaded.
  const [supported] = useState(pushSupported);
  const [installed] = useState(isStandalone);

  if (!data?.publicKey) return null;
  const publicKey = data.publicKey;

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const subscription = await subscribeDevice(publicKey);
      await api("/v1/me/push", {
        method: "POST",
        body: { ...subscription, label: deviceLabel() },
      });
      await mutate();
    } catch (err) {
      setError(errorText(err, "Couldn't turn on notifications."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChannelCard title="Web app">
      {!installed && <InstallSteps />}
      {supported ? (
        <div>
          <Button size="sm" loading={busy} onClick={() => void enable()}>
            Turn on notifications
          </Button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          This browser can&apos;t receive notifications.
          {platform() === "ios" && " On an iPhone, add Callsign to the home screen first."}
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {data.devices.length > 0 && (
        <ul className="grid gap-3">
          {data.devices.map((device) => (
            <DeviceRow key={device.id} device={device} onChanged={() => void mutate()} />
          ))}
        </ul>
      )}
      <PushDiagnostics />
    </ChannelCard>
  );
}

// A tapped "Test question" notification opens this page with its token: that proves the device.
export function PushTestConfirm() {
  const params = useSearchParams();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const token = params.get("push-test");
  const started = useRef(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api("/v1/me/push/confirm", { method: "POST", body: { token } }).then(
      () => {
        setResult({
          ok: true,
          text: "Test passed: questions can reach this device. You can now turn on the web app.",
        });
        void mutate("/v1/me/push");
      },
      (err: unknown) => setResult({ ok: false, text: errorText(err, "The test failed.") }),
    );
    router.replace("/dashboard/account");
  }, [token, router, mutate]);

  if (!result) return null;
  return result.ok ? (
    <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-sm text-emerald-300">
      {result.text}
    </p>
  ) : (
    <ErrorNote>{result.text}</ErrorNote>
  );
}

function WebAppFrame() {
  const { data } = useApi<PushState>("/v1/me/push");
  if (!data?.publicKey) return null;
  return (
    <ForkFrame>
      <WebAppCard />
    </ForkFrame>
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
      <WebAppFrame />
    </div>
  );
}
