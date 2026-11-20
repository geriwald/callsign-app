import { Suspense } from "react";
import { QuestionsPage } from "@/components/dashboard/questions-page";

export const instant = false;

export default function Questions() {
  return (
    <Suspense>
      <QuestionsPage />
    </Suspense>
  );
}
