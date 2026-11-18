import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ThresholdPlayground } from "./ThresholdPlayground";

export const metadata: Metadata = { title: "Пороги" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Пороги"
        subtitle="Проверьте на демоданных, как пороги влияют на отклонения и сумму под риском. Изменения действуют только на этой странице."
      />
      <ThresholdPlayground />
    </>
  );
}
