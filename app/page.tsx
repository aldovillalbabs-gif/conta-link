import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "ContaLink — Tu despacho contable en piloto automático",
  description:
    "Sube facturas, la IA las clasifica y exporta directo a CONTPAQi o Aspel. Tus clientes suben sus documentos solos.",
};

const problemCards = [
  {
    title: "Capturas facturas a mano",
    description:
      "Hora tras hora tecleando datos que ya existen en el XML",
  },
  {
    title: "Persigues a tus clientes",
    description:
      "WhatsApp tras WhatsApp pidiendo facturas que nunca llegan a tiempo",
  },
  {
    title: "Formatos incompatibles",
    description:
      "Armando Excel manualmente para importar a CONTPAQi o Aspel",
  },
];

const steps = [
  {
    number: "01",
    title: "Tu cliente sube sus facturas",
    description:
      "Le mandas un link. Él sube XML, PDF o fotos desde su celular.",
  },
  {
    number: "02",
    title: "La IA clasifica sola",
    description:
      "ContaLink lee cada factura y sugiere la cuenta contable automáticamente.",
  },
  {
    number: "03",
    title: "Exportas en un clic",
    description:
      "Genera el archivo exacto para CONTPAQi, Aspel o SAP. Listo para importar.",
  },
];

const features = [
  {
    title: "Lee XML, PDF e imágenes",
    description:
      "Sube cualquier formato de factura y ContaLink extrae los datos automáticamente.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "IA que aprende tu criterio",
    description:
      "Sugiere cuentas contables del catálogo SAT según proveedor y concepto.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 1 1-8 0v-1H7a3 3 0 1 1 0-6h1V7a4 4 0 0 1 4-4Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    title: "Portal del cliente con link único",
    description:
      "Cada cliente tiene su portal para subir facturas sin depender de ti.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M10 13a5 5 0 0 1 7.07 0l1.41 1.41a5 5 0 0 1-7.07 7.07l-.71-.71"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07l.71-.71"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Exporta a CONTPAQi y Aspel",
    description:
      "Genera archivos listos para importar en tu sistema contable favorito.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Notificaciones al instante",
    description:
      "Recibe avisos cuando tus clientes suben nuevas facturas al portal.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M15 17H9a3 3 0 0 1-3-3V9a6 6 0 1 1 12 0v5a3 3 0 0 1-3 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Reportes PDF por cliente",
    description:
      "Descarga reportes mensuales organizados por cliente en segundos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M8 13h8M8 17h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    features: ["Hasta 3 clientes", "50 facturas/mes"],
    popular: false,
  },
  {
    name: "Profesional",
    price: "$249 MXN",
    period: "/mes",
    features: [
      "Clientes ilimitados",
      "Facturas ilimitadas",
      "Soporte por email",
    ],
    popular: true,
  },
  {
    name: "Despacho",
    price: "$499 MXN",
    period: "/mes",
    features: [
      "Todo lo anterior",
      "Múltiples contadores",
      "Vista admin",
      "Soporte prioritario",
    ],
    popular: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] text-zinc-900"
          >
            CONTALINK
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Registrarse gratis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-zinc-100 px-6 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <div className="landing-animate mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Tu despacho contable en piloto automático
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Sube facturas, la IA las clasifica y exporta directo a CONTPAQi o
              Aspel. Tus clientes suben sus documentos solos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/registro"
                className="w-full rounded-lg bg-zinc-900 px-8 py-4 text-base font-medium text-white transition-colors hover:bg-zinc-800 sm:w-auto"
              >
                Empieza gratis — sin tarjeta de crédito
              </Link>
              <Link
                href="#como-funciona"
                className="w-full rounded-lg border border-zinc-300 px-8 py-4 text-base font-medium text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto"
              >
                Ver demo
              </Link>
            </div>
            <p className="mt-10 text-sm text-zinc-500 sm:text-base">
              ✓ XML, PDF e imágenes &nbsp;&nbsp;✓ IA que clasifica sola
              &nbsp;&nbsp;✓ Exporta a CONTPAQi y Aspel
            </p>
          </div>
        </section>

        {/* Problema */}
        <section className="bg-[#F4F4F5] px-6 py-20 sm:px-8 sm:py-28">
          <div className="landing-animate mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              ¿Cuántas horas pierdes cada mes en esto?
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {problemCards.map((card) => (
                <div
                  key={card.title}
                  className="landing-animate rounded-2xl border border-zinc-200/60 bg-white p-8 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-zinc-600">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          className="scroll-mt-24 bg-white px-6 py-20 sm:px-8 sm:py-28"
        >
          <div className="landing-animate mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Así de simple
            </h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="landing-animate text-center md:text-left">
                  <span className="text-5xl font-bold text-zinc-900">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-zinc-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Características */}
        <section className="bg-[#F4F4F5] px-6 py-20 sm:px-8 sm:py-28">
          <div className="landing-animate mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Todo lo que necesita tu despacho
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="landing-animate rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    {feature.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios */}
        <section className="bg-white px-6 py-20 sm:px-8 sm:py-28">
          <div className="landing-animate mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Precios simples y transparentes
            </h2>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`landing-animate relative flex flex-col rounded-2xl border p-8 ${
                    plan.popular
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-xl"
                      : "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span
                        className={
                          plan.popular ? "text-zinc-300" : "text-zinc-500"
                        }
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul
                    className={`mt-6 flex-1 space-y-3 text-sm ${
                      plan.popular ? "text-zinc-300" : "text-zinc-600"
                    }`}
                  >
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span aria-hidden>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/registro"
                    className={`mt-8 block rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                      plan.popular
                        ? "bg-white text-zinc-900 hover:bg-zinc-100"
                        : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                  >
                    Empezar
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-zinc-900 px-6 py-20 sm:px-8 sm:py-28">
          <div className="landing-animate mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Empieza hoy. Tu primer cliente es gratis.
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Sin tarjeta de crédito. Sin instalaciones. Listo en 5 minutos.
            </p>
            <Link
              href="/registro"
              className="mt-10 inline-block rounded-lg bg-white px-8 py-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </section>

        {/* Contacto */}
        <section
          id="contacto"
          className="scroll-mt-24 border-t border-zinc-100 bg-white px-6 py-20 sm:px-8 sm:py-28"
        >
          <div className="landing-animate mx-auto max-w-xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Contáctanos
            </h2>
            <p className="mt-4 text-center text-zinc-600">
              ¿Tienes dudas? Escríbenos y te respondemos pronto.
            </p>
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-zinc-900 px-6 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-zinc-500">
            CONTALINK — Automatiza tu proceso contable
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/login"
              className="text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Registrarse
            </Link>
            <a
              href="#contacto"
              className="text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Contacto
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
