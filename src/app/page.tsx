"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Bell,
  Navigation,
  Eye,
  Layers,
  Github,
  ExternalLink,
  MousePointer,
  Zap,
  ArrowRight,
  Menu,
  X,
  Crosshair,
  Radio,
  BarChart3,
  Users,
  Timer,
  Satellite,
  Mail,
} from "lucide-react";

/* ─────────── Fade-in on scroll ─────────── */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────── Grid pattern ─────────── */
function GridPattern() {
  return (
    <div
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(88,92,43,.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(88,92,43,.5) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

/* ─────────── Data ─────────── */
const FEATURES = [
  {
    icon: Crosshair,
    title: "Cercas Virtuais (Geofencing)",
    description:
      "Desenhe polígonos diretamente no mapa para definir zonas de monitoramento. Personalize cores, nomes e regras de alerta para cada área delimitada.",
    color: "text-[#585c2b]",
    bg: "bg-[#585c2b]/10",
  },
  {
    icon: Navigation,
    title: "Rastreamento em Tempo Real",
    description:
      "Acompanhe a posição dos animais com atualizações instantâneas via Firebase Realtime Database. Marcadores com foto e identificação no mapa Leaflet.",
    color: "text-[#6b7230]",
    bg: "bg-[#6b7230]/10",
  },
  {
    icon: Bell,
    title: "Alertas de Entrada e Saída",
    description:
      "Sistema de alertas automático com verificação de geofencing. Receba notificações por e-mail quando um animal entrar ou sair das zonas definidas.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Histórico e Mapa de Calor",
    description:
      "Visualize a trajetória dos animais ao longo do tempo com três modos de visualização: rastro, mapa de calor e ambos. Período configurável de 15min a 7 dias.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Timer,
    title: "Temporizador de Verificação",
    description:
      "Configure intervalos automáticos de verificação de posição. O sistema coleta dados periodicamente e armazena o histórico para análise posterior.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Shield,
    title: "Autenticação Segura",
    description:
      "Login com e-mail/senha, Google ou Facebook via Firebase Auth. Dados sincronizados por usuário com persistência local e em nuvem.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: MousePointer,
    title: "Defina as Áreas de Pesquisa",
    description:
      "Desenhe polígonos no mapa interativo para delimitar as zonas de estudo. Atribua nomes e cores para identificar cada área de monitoramento.",
    screenshot: "/screenshot-polygon-drawn.png",
  },
  {
    step: "02",
    icon: Radio,
    title: "Registre os Animais",
    description:
      "Adicione os animais ao sistema pelo código de rastreamento. O TALON sincroniza automaticamente com o Firebase e exibe a posição no mapa.",
    screenshot: "/screenshot-animais.png",
  },
  {
    step: "03",
    icon: Bell,
    title: "Configure os Alertas",
    description:
      "Ative alertas de entrada e saída para cada zona. O sistema verifica automaticamente se o animal cruzou os limites e envia notificações por e-mail.",
    screenshot: "/screenshot-alertas.png",
  },
];

const TECH_STACK = [
  { name: "Next.js 16", category: "Framework" },
  { name: "React 19", category: "UI" },
  { name: "TypeScript", category: "Linguagem" },
  { name: "Leaflet + OSM", category: "Mapas" },
  { name: "Firebase RTDB", category: "Dados em Tempo Real" },
  { name: "Firebase Auth", category: "Autenticação" },
  { name: "Prisma ORM", category: "Persistência" },
  { name: "SQLite", category: "Banco Local" },
  { name: "Turf.js", category: "Geolocalização" },
  { name: "geolib", category: "Cálculos Geográficos" },
  { name: "Leaflet.heat", category: "Mapa de Calor" },
  { name: "Recharts", category: "Visualização" },
  { name: "Socket.io", category: "Comunicação" },
  { name: "Resend", category: "E-mail" },
  { name: "Tailwind CSS", category: "Estilização" },
  { name: "shadcn/ui", category: "Componentes" },
];

/* ═══════════════ PAGE ═══════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ──────── Navbar ──────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <img
              src="/talon-logo-icon.png"
              alt="TALON"
              className="w-8 h-8 rounded-lg group-hover:shadow-lg transition-shadow"
            />
            <span className="text-xl font-bold tracking-tight">TALON</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#sistema"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              O Sistema
            </a>
            <a
              href="#funcionalidades"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#workflow"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Fluxo de Trabalho
            </a>
            <a
              href="#tecnologia"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tecnologia
            </a>
            <Button asChild size="sm" className="gap-1.5 bg-linear-to-r from-[#585c2b] to-[#6b7230] hover:from-[#6b7230] hover:to-[#7a8238] text-white shadow-md shadow-[#585c2b]/20">
              <a
                href="/sistema"
              >
                Acessar Sistema
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b">
            <div className="px-4 py-4 flex flex-col gap-3">
              <a href="#sistema" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>O Sistema</a>
              <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Fluxo de Trabalho</a>
              <a href="#tecnologia" className="text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Tecnologia</a>
              <Button asChild size="sm" className="gap-1.5 w-full bg-linear-to-rrom-[#585c2b] to-[#6b7230] text-white">
                <a href="/sistema">
                  Acessar Sistema
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ──────── Hero ──────── */}
        <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
          <GridPattern />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center gap-8">
              <FadeIn>
                <Badge
                  variant="outline"
                  className="gap-1.5 px-3 py-1 text-xs border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                >
                  <Crosshair className="size-3" />
                  Sistema de Geofencing para Pesquisa
                </Badge>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-4xl">
                  Rastreie e monitore animais com{" "}
                  <span className="bg-linear-to-r from-[#585c2b] via-[#6b7230] to-[#7a8238] bg-clip-text text-transparent">
                    geofencing inteligente
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Crie cercas virtuais no mapa, acompanhe a movimentação dos animais em
                  tempo real e receba alertas automáticos quando eles entrarem ou saírem
                  das zonas de pesquisa definidas.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-linear-to-r from-[#585c2b] to-[#6b7230] hover:from-[#6b7230] hover:to-[#7a8238] text-white shadow-lg shadow-[#585c2b]/25 hover:shadow-[#585c2b]/40 transition-all"
                >
                  <a
                    href="/sistema"
                   
                   
                  >
                    Acessar o Sistema
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </FadeIn>

              {/* Real screenshot of the dashboard */}
              <FadeIn delay={400} className="w-full max-w-5xl mt-4">
                <div className="relative rounded-2xl overflow-hidden border shadow-2xl shadow-[#585c2b]/10 group">
                  <img
                    src="/screenshot-dashboard.png"
                    alt="TALON - Painel principal com mapa interativo e cercas virtuais"
                    className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                  />
                  <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border text-xs">
                    <span className="text-muted-foreground">Tela real do sistema • </span>
                    <span className="text-[#585c2b] dark:text-[#8a9240] font-semibold">Painel com mapa e controles</span>
                  </div>
                  <div className="absolute -inset-px rounded-2xl bg-linear-to-r from-[#585c2b]/20 via-[#6b7230]/20 to-[#7a8238]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ──────── O Sistema (Overview with real screenshots) ──────── */}
        <section id="sistema" className="relative py-20 sm:py-28 bg-muted/30">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                >
                  <Eye className="size-3 mr-1" />
                  O Sistema
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Interface real, dados reais
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  Capturas de tela do TALON em funcionamento — o que você vê é o que o sistema faz.
                </p>
              </div>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Login */}
              <FadeIn>
                <Card className="overflow-hidden border-border/50 hover:border-[#585c2b]/30 transition-all duration-300">
                  <div className="aspect-4/3 bg-muted/50 overflow-hidden">
                    <img
                      src="/screenshot-login.png"
                      alt="TALON - Tela de login com autenticação por e-mail, Google e Facebook"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="size-4 text-sky-500" />
                      <h3 className="font-semibold">Autenticação</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Login com e-mail/senha, Google ou Facebook via Firebase Auth. Dados sincronizados por usuário com persistência em nuvem.
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* Dashboard with sidebar */}
              <FadeIn delay={100}>
                <Card className="overflow-hidden border-border/50 hover:border-[#585c2b]/30 transition-all duration-300">
                  <div className="aspect-4/3 bg-muted/50 overflow-hidden">
                    <img
                      src="/screenshot-sidebar.png"
                      alt="TALON - Painel com menu lateral: Temporizador, Animais, Alertas, Como usar"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="size-4 text-[#6b7230]" />
                      <h3 className="font-semibold">Painel de Controle</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Menu lateral com acesso ao temporizador, gerenciamento de animais, configuração de alertas e guia de uso.
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* Polygon drawing */}
              <FadeIn delay={200}>
                <Card className="overflow-hidden border-border/50 hover:border-[#585c2b]/30 transition-all duration-300">
                  <div className="aspect-4/3 bg-muted/50 overflow-hidden">
                    <img
                      src="/screenshot-polygon-verified.png"
                      alt="TALON - Polígono desenhado no mapa definindo zona de geofencing"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="size-4 text-[#585c2b]" />
                      <h3 className="font-semibold">Cercas Virtuais</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Desenhe polígonos diretamente no mapa para delimitar as áreas de pesquisa. Personalize nome e cor de cada zona.
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* Alert settings */}
              <FadeIn delay={300}>
                <Card className="overflow-hidden border-border/50 hover:border-[#585c2b]/30 transition-all duration-300">
                  <div className="aspect-4/3 bg-muted/50 overflow-hidden">
                    <img
                      src="/screenshot-alertas.png"
                      alt="TALON - Configuração de alertas de entrada e saída por zona"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="size-4 text-amber-500" />
                      <h3 className="font-semibold">Alertas Configuráveis</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ative ou desative alertas de entrada e saída individualmente para cada zona. Notificações por e-mail automáticas.
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ──────── Features ──────── */}
        <section id="funcionalidades" className="relative py-20 sm:py-28">
          <GridPattern />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                >
                  <Zap className="size-3 mr-1" />
                  Funcionalidades
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Ferramentas completas para pesquisa de campo
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  Cada funcionalidade foi projetada para atender às necessidades reais de pesquisadores que trabalham com rastreamento animal.
                </p>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <FadeIn key={feature.title} delay={i * 80}>
                  <Card className="group relative h-full border-border/50 hover:border-[#585c2b]/30 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-[#585c2b]/5 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div
                        className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <feature.icon className={`size-5 ${feature.color}`} />
                      </div>
                      <h3 className="text-base font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ──────── Workflow ──────── */}
        <section id="workflow" className="relative py-20 sm:py-28 bg-muted/30">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                >
                  <Users className="size-3 mr-1" />
                  Fluxo de Trabalho
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Do campo ao alerta em 3 passos
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  Veja como o TALON funciona na prática — cada etapa com captura de tela real do sistema.
                </p>
              </div>
            </FadeIn>

            <div className="space-y-16">
              {WORKFLOW_STEPS.map((step, i) => (
                <FadeIn key={step.step} delay={100}>
                  <div
                    className={`grid lg:grid-cols-2 gap-8 items-center ${
                      i % 2 === 1 ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Text */}
                    <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#585c2b] to-[#6b7230] flex items-center justify-center shadow-md shadow-[#585c2b]/20">
                          <step.icon className="size-5 text-white" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#585c2b] dark:text-[#8a9240]">
                            PASSO {step.step}
                          </span>
                          <h3 className="text-xl font-semibold leading-tight">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Screenshot */}
                    <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                      <div className="relative rounded-xl overflow-hidden border shadow-xl group">
                        <img
                          src={step.screenshot}
                          alt={`TALON - ${step.title}`}
                          className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute -inset-px rounded-xl bg-linear-to-r from-[#585c2b]/10 via-[#6b7230]/10 to-[#7a8238]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ──────── Architecture highlight ──────── */}
        <section className="relative py-20 sm:py-28">
          <GridPattern />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <FadeIn>
                <div>
                  <Badge
                    variant="outline"
                    className="mb-4 border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                  >
                    <Satellite className="size-3 mr-1" />
                    Arquitetura
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                    Tempo real com{" "}
                    <span className="bg-linear-to-r from-[#585c2b] to-[#6b7230] bg-clip-text text-transparent">
                      Firebase + Prisma
                    </span>
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    O TALON usa uma arquitetura híbrida: Firebase Realtime Database para
                    sincronização instantânea das posições, Prisma ORM com SQLite para
                    persistência de alertas e zonas, e Resend para envio de notificações
                    por e-mail.
                  </p>
                  <div className="space-y-4">
                    {[
                      {
                        icon: Radio,
                        label: "Firebase RTDB — posições atualizadas em tempo real via listeners"
                      },
                      {
                        icon: Shield,
                        label: "Firebase Auth — autenticação com e-mail, Google e Facebook"
                      },
                      {
                        icon: Crosshair,
                        label: "Turf.js + geolib — cálculos precisos de geofencing (ponto-in-polígono)"
                      },
                      {
                        icon: Mail,
                        label: "Resend — envio automático de alertas por e-mail"
                      },
                      {
                        icon: BarChart3,
                        label: "Leaflet.heat — visualização de mapas de calor da movimentação"
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <item.icon className="size-5 text-[#585c2b] mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={200}>
                <div className="relative">
                  <Card className="overflow-hidden border shadow-2xl shadow-[#585c2b]/5">
                    <div className="bg-muted/50 p-2 flex items-center gap-2 border-b">
                      <div className="size-2.5 rounded-full bg-red-500" />
                      <div className="size-2.5 rounded-full bg-amber-500" />
                      <div className="size-2.5 rounded-full bg-[#6b7230]" />
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        schema.prisma
                      </span>
                    </div>
                    <CardContent className="p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                      <pre className="text-muted-foreground">
                        <span className="text-[#585c2b] dark:text-[#8a9240]">model</span>{" "}
                        <span className="text-foreground font-semibold">User</span> {"{"}
                        {"\n"}
                        {"  "}id{"          "}String{"      "}@id @default(cuid())
                        {"\n"}
                        {"  "}email{"       "}String{"      "}@unique
                        {"\n"}
                        {"  "}firebaseUid{" "}String{"      "}@unique
                        {"\n"}
                        {"  "}animals{"     "}UserAnimal[]
                        {"\n"}
                        {"  "}polygons{"    "}Polygon[]
                        {"\n"}
                        {"  "}alerts{"      "}Alert[]
                        {"\n"}
                        {"}"}
                        {"\n\n"}
                        <span className="text-[#585c2b] dark:text-[#8a9240]">model</span>{" "}
                        <span className="text-foreground font-semibold">Polygon</span> {"{"}
                        {"\n"}
                        {"  "}id{"           "}String{"   "}@id @default(cuid())
                        {"\n"}
                        {"  "}name{"         "}String
                        {"\n"}
                        {"  "}color{"        "}String
                        {"\n"}
                        {"  "}vertices{"     "}String{"   "}{'// JSON: [{lat, lng}]'}
                        {"\n"}
                        {"  "}alertOnExit{"  "}Boolean{"  "}@default(true)
                        {"\n"}
                        {"  "}alertOnEntry{" "}Boolean{"  "}@default(true)
                        {"\n"}
                        {"  "}isActive{"     "}Boolean{"  "}@default(true)
                        {"\n"}
                        {"}"}
                        {"\n\n"}
                        <span className="text-[#585c2b] dark:text-[#8a9240]">model</span>{" "}
                        <span className="text-foreground font-semibold">Alert</span> {"{"}
                        {"\n"}
                        {"  "}id{"          "}String{"   "}@id @default(cuid())
                        {"\n"}
                        {"  "}type{"        "}String{"   "}{'// "entry" | "exit"'}
                        {"\n"}
                        {"  "}animalCode{"  "}String
                        {"\n"}
                        {"  "}emailSent{"   "}Boolean{"  "}@default(false)
                        {"\n"}
                        {"  "}polygon{"     "}Polygon{"  "}@relation(...)
                        {"\n"}
                        {"}"}
                      </pre>
                    </CardContent>
                  </Card>
                  <div className="absolute -inset-4 rounded-3xl bg-linear-to-r from-[#585c2b]/10 via-[#6b7230]/10 to-[#7a8238]/10 -z-10 blur-2xl" />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ──────── Tech Stack ──────── */}
        <section id="tecnologia" className="relative py-20 sm:py-28 bg-muted/30">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 border-[#585c2b]/30 bg-[#585c2b]/5 text-[#585c2b] dark:text-[#8a9240]"
                >
                  <Layers className="size-3 mr-1" />
                  Stack Tecnológico
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Tecnologias open-source e consolidadas
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  Stack moderno e robusto, baseado em ferramentas amplamente adotadas pela comunidade.
                </p>
              </div>
            </FadeIn>

            <div className="flex flex-wrap justify-center gap-3">
              {TECH_STACK.map((tech, i) => (
                <FadeIn key={tech.name} delay={i * 40}>
                  <div className="px-4 py-2.5 rounded-xl border bg-card/80 backdrop-blur-sm hover:border-[#585c2b]/30 hover:bg-[#585c2b]/5 transition-all duration-300 cursor-default">
                    <span className="text-sm font-medium">{tech.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {tech.category}
                    </span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ──────── CTA ──────── */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
          <GridPattern />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FadeIn>
              <div className="rounded-3xl border bg-linear-to-b from-[#585c2b]/5 via-[#6b7230]/5 to-transparent p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-linear-to-b from-[#585c2b]/20 to-transparent blur-3xl pointer-events-none" />

                <img
                  src="/talon-logo.png"
                  alt="TALON"
                  className="w-200 h-50 mx-auto mb-6 relative"
                />
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 relative">
                  Comece a monitorar agora
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative">
                  O TALON está em funcionamento. Crie sua conta, defina suas zonas de
                  pesquisa e comece a receber alertas em tempo real.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-linear-to-r from-[#585c2b] to-[#6b7230] hover:from-[#6b7230] hover:to-[#7a8238] text-white shadow-lg shadow-[#585c2b]/25 hover:shadow-[#585c2b]/40 transition-all"
                >
                  <a
                    href="/sistema"
                   
                   
                  >
                    Acessar o Sistema
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ──────── Footer ──────── */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/talon-logo-icon.png"
                alt="TALON"
                className="w-6 h-6 rounded-md"
              />
              <span className="text-sm font-semibold">TALON</span>
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Joshua-likesjs/TALON"
               
               
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Github className="size-4" />
                GitHub
              </a>
              <a
                href="/sistema"
               
               
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="size-4" />
                Sistema
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
