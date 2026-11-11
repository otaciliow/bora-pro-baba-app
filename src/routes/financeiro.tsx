import { createFileRoute } from "@tanstack/react-router";
import Finance from "@/components/Finance";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Bora pro Baba — Financeiro" },
      {
        name: "description",
        content:
          "Pague a mensalidade do seu baba pelo PIX, envie o comprovante para a diretoria e acompanhe o histórico dos seus pagamentos.",
      },
      { property: "og:title", content: "Bora pro Baba — Financeiro" },
      {
        property: "og:description",
        content:
          "Chave PIX do baba, envio de comprovante e histórico de mensalidades — tudo num só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Finance,
});
