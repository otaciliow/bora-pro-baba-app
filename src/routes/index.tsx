import { createFileRoute } from "@tanstack/react-router";
import Home from "@/components/Home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bora pro Baba — Próxima partida e lista de presença" },
      { name: "description", content: "Confirme sua presença no baba, veja a próxima partida, a lista de quem cola e sua situação de mensalidade." },
      { property: "og:title", content: "Bora pro Baba — Próxima partida" },
      { property: "og:description", content: "Confirme presença, veja quem cola e mantenha a mensalidade em dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});
