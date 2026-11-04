import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles, AlertTriangle, BarChart3, Link2, Inbox, Bot, ArrowRight,
  MessageSquare, Sun, Moon, Clock, Zap, Check, Calendar, Crown,
  Users, Building2, Shield, Settings, BookOpen, Activity, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import MockupTabs from '@/components/landing/MockupTabs';
import ContactForm from '@/components/landing/ContactForm';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: Inbox,
    title: 'CRM de preguntas',
    desc: 'Todas las preguntas de tus publicaciones en una bandeja unificada. Filtrá por categoría, estado y producto.',
    tag: 'Core'
  },
  {
    icon: Bot,
    title: 'Respuestas con IA',
    desc: 'La IA analiza cada pregunta y sugiere la mejor respuesta según el contexto del producto. Vos aprobás o editás.',
    tag: 'IA'
  },
  {
    icon: Zap,
    title: 'Autopilot con guardrails',
    desc: 'Dejá que la IA responda automáticamente según tus reglas. Configurá umbrales de confianza y horarios.',
    tag: 'Pro'
  },
  {
    icon: AlertTriangle,
    title: 'Bandeja prioritaria',
    desc: 'Las preguntas que necesitan atención humana se destacan automáticamente. No pierdas ninguna venta.',
    tag: 'Core'
  },
  {
    icon: Users,
    title: 'Equipos y roles',
    desc: 'Invitá a tu equipo, asigná roles (admin, agente) y colaborá en la atención sin pisarte.',
    tag: 'Equipos'
  },
  {
    icon: Building2,
    title: 'Multi-empresa',
    desc: 'Gestioná múltiples empresas desde una sola cuenta. Ideal para agencias o vendedores con varias operaciones.',
    tag: 'Agencias'
  },
  {
    icon: BookOpen,
    title: 'Catálogo inteligente',
    desc: 'Cargá contexto de cada producto: puntos clave, FAQ, notas de envío. La IA lo usa para responder mejor.',
    tag: 'IA'
  },
  {
    icon: BarChart3,
    title: 'Métricas por empresa',
    desc: 'Dashboard con tiempo de respuesta, categorías frecuentes y rendimiento del equipo. Todo en tiempo real.',
    tag: 'Analytics'
  },
];

const targetAudiences = [
  {
    title: 'Vendedores de alto volumen',
    desc: 'Más de 50 preguntas diarias que no podés responder a tiempo',
    icon: '📦',
  },
  {
    title: 'Equipos de atención',
    desc: 'Múltiples personas respondiendo sin coordinación',
    icon: '👥',
  },
  {
    title: 'Agencias y operadores',
    desc: 'Gestionás varias cuentas de Mercado Libre de distintos clientes',
    icon: '🏢',
  },
];

const differentiators = [
  {
    title: 'Especializado en MeLi',
    desc: 'No es un chatbot genérico. Está diseñado específicamente para las dinámicas de Mercado Libre.',
  },
  {
    title: 'IA con contexto de producto',
    desc: 'La IA lee tu catálogo y usa esa información para responder con precisión, no inventa.',
  },
  {
    title: 'Control total',
    desc: 'Vos decidís cuándo la IA responde sola y cuándo pide aprobación. Guardrails configurables.',
  },
  {
    title: 'Multi-tenant real',
    desc: 'Cada empresa tiene su configuración, equipo y métricas aisladas. Datos nunca se mezclan.',
  },
];

const steps = [
  {
    icon: Link2,
    title: 'Conectá tu cuenta',
    desc: 'Vinculá Mercado Libre en un clic. Conexión segura con la API oficial.'
  },
  {
    icon: BookOpen,
    title: 'Cargá tu catálogo',
    desc: 'Agregá contexto a tus productos para que la IA responda con precisión.'
  },
  {
    icon: Bot,
    title: 'Activá el copiloto',
    desc: 'La IA sugiere respuestas. Vos aprobás, editás o activás autopilot.'
  },
];

const faqs = [
  {
    q: '¿Cuántas cuentas de Mercado Libre puedo conectar?',
    a: 'En esta versión, cada empresa puede conectar 1 cuenta de Mercado Libre. Si gestionás múltiples cuentas, podés crear una empresa por cada una.',
  },
  {
    q: '¿La IA puede responder cualquier pregunta?',
    a: 'La IA responde preguntas de precio, stock, envío, garantía y técnicas. Si detecta una pregunta compleja o fuera de su alcance, la marca como "requiere humano".',
  },
  {
    q: '¿Puedo tener varios usuarios en mi empresa?',
    a: 'Sí. El plan Base incluye hasta 3 usuarios. Podés asignar roles de admin o agente a cada uno.',
  },
  {
    q: '¿Qué pasa si no me convence?',
    a: 'No hay contratos. Cancelás cuando quieras. Podés probar el producto antes de decidir.',
  },
];

const Landing = () => {
  const { theme, setTheme } = useTheme();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>SoporteML — Respondé preguntas de Mercado Libre con IA</title>
        <meta name="description" content="Centralizá las preguntas de tus publicaciones de Mercado Libre, respondé con IA y automatizá tu atención sin perder ventas." />
        <link rel="canonical" href="https://soporteml.com/" />
        <meta property="og:title" content="SoporteML — Respondé preguntas de Mercado Libre con IA" />
        <meta property="og:description" content="Centralizá las preguntas de tus publicaciones de Mercado Libre, respondé con IA y automatizá tu atención sin perder ventas." />
        <meta property="og:url" content="https://soporteml.com/" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(f => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <span>SoporteML</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Funciones</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">Precios</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-foreground transition-colors">Contacto</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full">
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/signup">Empezar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <motion.div className="max-w-4xl mx-auto text-center" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            Plataforma profesional para vendedores de Mercado Libre
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Respondé preguntas de MeLi{' '}
            <span className="text-gradient">en segundos, no en horas</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            SoporteML centraliza todas tus preguntas, sugiere respuestas con IA y puede responder automáticamente según tus reglas.
            Para vendedores que no quieren perder ventas por responder tarde.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/signup?next=%2Fsettings%3Fcheckout%3Dbase">
                Probar SoporteML <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo('contact')}>
              Agendar demo
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50">
              <Shield className="w-3.5 h-3.5" /> Conexión segura con API oficial
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50">
              <Users className="w-3.5 h-3.5" /> Multi-usuario y multi-empresa
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50">
              <Activity className="w-3.5 h-3.5" /> Métricas en tiempo real
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <AnimatedCounter end={10000} prefix="+" label="preguntas gestionadas" />
          <AnimatedCounter end={2} prefix="< " suffix=" min" label="tiempo de respuesta" />
          <AnimatedCounter end={95} suffix="%" label="precisión IA" />
          <AnimatedCounter end={80} suffix="%" label="ahorro de tiempo" />
        </div>
      </section>

      {/* Para quién es */}
      <section className="py-20 px-4">
        <motion.div className="max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            ¿SoporteML es para vos?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Si te identificás con alguno de estos perfiles, SoporteML te va a ahorrar horas de trabajo.
          </motion.p>
          <div className="grid sm:grid-cols-3 gap-6">
            {targetAudiences.map((t) => (
              <motion.div key={t.title} variants={fadeUp} className="glass-panel rounded-xl p-6 text-center">
                <div className="text-4xl mb-4">{t.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <motion.div className="max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            Todo lo que necesitás para escalar tu atención
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Un sistema completo para gestionar preguntas, equipos y múltiples empresas desde un solo lugar.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="glass-panel rounded-xl p-5 relative">
                <span className="absolute top-4 right-4 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {f.tag}
                </span>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Mockups */}
      <section className="py-20 px-4">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            Así se ve tu panel
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Bandeja unificada, sugerencias de IA y métricas en tiempo real.
          </motion.p>
          <motion.div variants={fadeUp}>
            <MockupTabs />
          </motion.div>
        </motion.div>
      </section>

      {/* Autopilot Highlight */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
                <Zap className="w-3.5 h-3.5" /> Feature destacada
              </span>
              <h2 className="text-3xl font-bold mb-4">
                Autopilot: respuestas automáticas con control total
              </h2>
              <p className="text-muted-foreground mb-6">
                Configurá la IA para que responda automáticamente fuera del horario laboral o cuando la confianza sea alta.
                Definí umbrales, categorías y reglas de exclusión. Vos ponés los límites.
              </p>
              <ul className="space-y-3">
                {[
                  'Respondé 24/7 sin estar online',
                  'Configurable por categoría y horario',
                  'Umbral de confianza ajustable (70-95%)',
                  'Reglas de exclusión personalizadas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Autopilot</span>
                  <div className="w-10 h-5 rounded-full bg-primary relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <span className="text-xs text-muted-foreground">Confianza mínima</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-muted">
                      <div className="w-4/5 h-full rounded-full bg-primary" />
                    </div>
                    <span className="text-sm font-medium">80%</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Categorías habilitadas</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Precio', 'Stock', 'Envío'].map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Horario autopilot</span>
                  <p className="text-sm mt-1">Fuera de horario laboral (20:00 - 09:00)</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12">
            Empezá en 3 pasos
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-[3.25rem] left-[16.67%] right-[16.67%] h-px border-t-2 border-dashed border-primary/30" />
            {steps.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} className="text-center relative">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold mb-4 relative z-10">
                  {i + 1}
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Differentiators */}
      <section className="py-20 px-4 bg-muted/30">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            ¿Por qué SoporteML?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            No es otro chatbot genérico. Es una plataforma diseñada desde cero para Mercado Libre.
          </motion.p>
          <div className="grid sm:grid-cols-2 gap-6">
            {differentiators.map((d) => (
              <motion.div key={d.title} variants={fadeUp} className="flex gap-4 glass-panel rounded-xl p-5">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            Planes claros, sin sorpresas
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Sin contratos. Cancelá cuando quieras. Facturación mensual en USD.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Plan Base */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 flex flex-col relative border-2 border-primary/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Recomendado
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">Base</h3>
                <p className="text-sm text-muted-foreground">Todo lo que necesitás para empezar</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">$29</span>
                <span className="text-muted-foreground text-sm ml-1">USD / mes</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'CRM de preguntas unificado',
                  'Copiloto IA (sugerencias)',
                  'Bandeja prioritaria',
                  'Catálogo de productos',
                  'Plantillas de respuesta',
                  'Métricas en tiempo real',
                  'Conexión con Mercado Libre',
                  'Hasta 3 usuarios',
                  'Soporte por email',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full" asChild>
                <Link to="/signup?next=%2Fsettings%3Fcheckout%3Dbase">Empezar ahora</Link>
              </Button>
            </motion.div>

            {/* Plan Pro */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  <Crown className="w-3 h-3" /> Próximamente
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">Pro</h3>
                <p className="text-sm text-muted-foreground">Para equipos que necesitan escalar</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">$59</span>
                <span className="text-muted-foreground text-sm ml-1">USD / mes</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Todo lo del plan Base',
                  'Usuarios ilimitados',
                  'Autopilot con guardrails',
                  'Reglas de exclusión avanzadas',
                  'Asignación y SLA por equipo',
                  'CRM de clientes y órdenes',
                  'Base de conocimiento global',
                  'Soporte prioritario',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full gap-2" onClick={() => scrollTo('contact')}>
                <Calendar className="w-4 h-4" />
                Reservar acceso
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <motion.div className="max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12">
            Preguntas frecuentes
          </motion.h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <motion.div key={faq.q} variants={fadeUp} className="glass-panel rounded-xl p-5">
                <h3 className="font-semibold mb-2 flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground ml-7">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 px-4">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl font-bold mb-4">¿Querés saber más?</h2>
              <p className="text-muted-foreground mb-6">
                Contanos sobre tu operación y te mostramos cómo SoporteML puede ayudarte a responder más rápido y no perder ventas.
              </p>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Demo personalizada de 15 minutos</span>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Te ayudamos con la configuración inicial</span>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Sin compromisos, cancelá cuando quieras</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-6">
              <ContactForm />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-primary" />
            </div>
            <span>© {new Date().getFullYear()} SoporteML</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-foreground transition-colors">Contacto</button>
            <Link to="/login" className="hover:text-foreground transition-colors">Acceder</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
