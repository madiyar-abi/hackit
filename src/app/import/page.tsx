import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ImportAnalyzer } from "./ImportAnalyzer";

export const metadata: Metadata = { title: "Свои данные" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Проверка на своих данных"
        subtitle="Загрузите выгрузку из 1С или SFA-системы в CSV — тот же движок найдёт отклонения и причины. Анализ идёт прямо в браузере, файлы никуда не отправляются."
      />
      <ImportAnalyzer />
    </>
  );
}
