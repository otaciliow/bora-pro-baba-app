import { createFileRoute } from "@tanstack/react-router";
import DrawTeams from "@/components/DrawTeams";

export const Route = createFileRoute("/sorteio")({
  head: () => ({
    meta: [
      { title: "Bora pro Baba — Sorteio de Times" },
      { name: "description", content: "Sorteie os times do baba em segundos: escolha quantos times, quantos atletas por time e copie a escalação pronta para o WhatsApp." },
      { property: "og:title", content: "Bora pro Baba — Sorteio de Times" },
      { property: "og:description", content: "Times equilibrados por média de nota, com escalação pronta para colar no WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DrawTeams,
});
