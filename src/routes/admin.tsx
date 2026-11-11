import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/components/Admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Bora pro Baba — Painel da Diretoria" },
      { name: "description", content: "Aprove atletas, confira comprovantes PIX e gerencie o seu baba." },
      { property: "og:title", content: "Bora pro Baba — Painel da Diretoria" },
      { property: "og:description", content: "Solicitações de entrada, conferência de PIX e gestão do baba em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});
