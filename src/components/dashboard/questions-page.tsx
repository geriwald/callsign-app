"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { OwnerQuestion } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Card, Spinner } from "../ui";
import { useApi, useLiveEvents } from "./hooks";
import { QuestionRow } from "./pending-questions";

export function usePendingQuestions(): number {
  return useApi<{ questions: OwnerQuestion[] }>("/v1/questions?status=open").data?.questions.length ?? 0;
}

export function QuestionsPage() {
  const highlighted = useSearchParams().get("question");
  const open = useApi<{ questions: OwnerQuestion[] }>("/v1/questions?status=open");
  const answered = useApi<{ questions: OwnerQuestion[] }>("/v1/questions?status=answered");

  useLiveEvents((event) => {
    if (event.type === "owner.asked" || event.type === "owner.answered") {
      void open.mutate();
      void answered.mutate();
    }
  });

  useEffect(() => {
    if (highlighted && open.data) {
      document.getElementById(`question-${highlighted}`)?.scrollIntoView({ block: "center" });
    }
  }, [highlighted, open.data]);

  const refresh = () => Promise.all([open.mutate(), answered.mutate()]);
  const pending = open.data?.questions ?? [];
  const done = answered.data?.questions ?? [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Questions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          What your agents need you to decide. Answers reach the agent that asked right away.
        </p>
      </div>
      {!open.data ? (
        <div className="flex justify-center p-10 text-zinc-500">
          <Spinner />
        </div>
      ) : pending.length === 0 ? (
        <Card className="p-8 text-center text-sm text-zinc-500">No question is waiting.</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-white/5">
            {pending.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                highlighted={question.id === highlighted}
                onAnswered={refresh}
              />
            ))}
          </ul>
        </Card>
      )}
      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">
            Answered · {done.length}
          </summary>
          <Card className="mt-3">
            <ul className="divide-y divide-white/5">
              {done.map((question) => (
                <li key={question.id} id={`question-${question.id}`} className="grid gap-1 px-4 py-3 sm:px-5">
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-300">{question.agent}</span> asked{" "}
                    {timeAgo(question.askedAt)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-300">{question.question}</p>
                  <p className="text-sm text-white">→ {question.answer}</p>
                </li>
              ))}
            </ul>
          </Card>
        </details>
      )}
    </div>
  );
}
