import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/components/Auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Bora pro Baba" },
      { name: "description", content: "Entre ou crie sua conta no Bora pro Baba e organize seu futebol semanal." },
      { property: "og:title", content: "Entrar — Bora pro Baba" },
      { property: "og:description", content: "A organização do seu futebol semanal sem dor de cabeça." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});
