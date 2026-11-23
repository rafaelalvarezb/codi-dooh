import type { CSSProperties, ReactNode } from "react";
import { CobtenLogo, CobtenSymbol } from "@/components/brand/CobtenLogo";
import { ImageSlot } from "./ImageSlot";
import { LeadForm } from "./LeadForm";
import {
  IconArrow,
  IconCash,
  IconCheck,
  IconLive,
  IconPhone,
  IconPlus,
  IconRelay,
  IconScreen,
  IconTablet,
  IconWifi,
} from "./icons";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] ${className}`}>{children}</div>;
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`cb-eyebrow ${dark ? "text-white/55" : "text-[var(--cb-muted)]"}`}>
      <span className="size-1.5 rounded-full bg-[var(--cb-go)]" />
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- marquee

const TICKER = [
  "Cobra con CoDi",
  "Sin efectivo",
  "Sin cajero",
  "La pluma se abre sola",
  "Con la app de su banco",
  "Tu pantalla también gana",
];

export function TickerBand() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {TICKER.map((t) => (
        <li key={t} className="flex items-center">
          <span className="px-7 text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.03em] whitespace-nowrap">{t}</span>
          <span className="text-[18px] text-[var(--cb-go-bright)]">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="cb-marquee-wrap overflow-hidden border-y border-white/8 bg-[var(--cb-night)] py-6 text-white">
      <div className="cb-marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- benefits

const FEED = [
  { ticket: "Boleto 0431", amount: "$35.00", ago: "ahora" },
  { ticket: "Boleto 0430", amount: "$52.00", ago: "hace 1 min" },
  { ticket: "Boleto 0429", amount: "$18.00", ago: "hace 3 min" },
  { ticket: "Boleto 0428", amount: "$35.00", ago: "hace 6 min" },
];

export function Benefits() {
  return (
    <section id="estacionamientos" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <Container>
        <div className="max-w-3xl" data-reveal>
          <Eyebrow>Para estacionamientos</Eyebrow>
          <h2 className="cb-h2 mt-5">Tu salida cobra sola.</h2>
          <p className="cb-lead mt-5 max-w-2xl text-[var(--cb-ink-2)]">
            Sin casetas con fila, sin cambio y sin cortes de caja. Cada boleto se paga con CoDi y cada pago queda
            registrado.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <article
            className="relative overflow-hidden rounded-[var(--cb-radius)] bg-[var(--cb-card)] p-7 sm:p-9 lg:col-span-4"
            data-reveal
          >
            <div className="grid gap-8 sm:grid-cols-[1fr_1.1fr] sm:items-center">
              <div>
                <IconLive className="size-7 text-[var(--cb-go)]" />
                <h3 className="mt-6 text-[26px] leading-tight font-semibold tracking-[-0.03em]">Cada cobro, en tiempo real</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[var(--cb-muted)]">
                  Ves cada pago en el momento en que entra: boleto, monto y hora. Desde tu celular o tu computadora.
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--cb-bg)] p-3" aria-hidden>
                <p className="flex items-center gap-2 px-2 pt-1 pb-3 text-[12px] font-medium text-[var(--cb-muted)]">
                  <span className="cb-live-dot size-1.5 rounded-full bg-[#0f8f45]" />
                  Cobros de hoy · ejemplo
                </p>
                <ul className="space-y-2">
                  {FEED.map((f, i) => (
                    <li
                      key={f.ticket}
                      className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 text-[14px] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                      data-reveal
                      style={d(200 + i * 140)}
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-[var(--cb-go-soft)] text-[#0f8f45]">
                        <IconCheck className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{f.ticket}</span>
                        <span className="block text-[12px] text-[var(--cb-muted)]">CoDi · {f.ago}</span>
                      </span>
                      <span className="font-medium tabular-nums">{f.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article
            className="relative flex flex-col overflow-hidden rounded-[var(--cb-radius)] bg-[var(--cb-night)] p-7 text-white sm:p-9 lg:col-span-2"
            data-reveal
            style={d(80)}
          >
            <svg viewBox="0 0 200 90" className="h-24 w-auto self-start" aria-hidden>
              <rect x="6" y="40" width="18" height="50" rx="4" fill="#4a4a52" />
              <circle cx="15" cy="50" r="4" className="cb-mini-light" />
              <g className="cb-mini-arm">
                <rect x="10" y="43" width="180" height="8" rx="4" fill="#fff" />
                <rect x="58" y="43" width="16" height="8" fill="#d12f35" />
                <rect x="106" y="43" width="16" height="8" fill="#d12f35" />
                <rect x="154" y="43" width="16" height="8" fill="#d12f35" />
              </g>
            </svg>
            <h3 className="mt-auto pt-10 text-[26px] leading-tight font-semibold tracking-[-0.03em]">La pluma abre sola</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-white/60">
              Cuando el pago entra, el kiosco le avisa a tu pluma y se levanta. Nadie tiene que apretar un botón.
            </p>
          </article>

          <SmallCard icon={<IconCash className="size-7" />} title="Sin cajero ni efectivo" delay={0}>
            Menos filas en la salida y nada de dinero en la caseta al final del día.
          </SmallCard>
          <SmallCard icon={<IconPhone className="size-7" />} title="Con la app de su banco" delay={80}>
            Tus clientes no descargan nada: pagan con CoDi desde la app del banco que ya usan.
          </SmallCard>
          <a
            href="#pantalla"
            className="group relative flex flex-col overflow-hidden rounded-[var(--cb-radius)] bg-[var(--cb-go)] p-7 text-white sm:p-9 lg:col-span-2"
            data-reveal
            style={d(160)}
          >
            <IconScreen className="size-7" />
            <h3 className="mt-6 text-[26px] leading-tight font-semibold tracking-[-0.03em]">Y tu pantalla también gana</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-white/80">
              Entre cobro y cobro pasa anuncios de marcas. Tú te quedas con el 70%.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium">
              Ver cómo
              <IconArrow className="size-4 transition group-hover:translate-x-1" />
            </span>
          </a>
        </div>
      </Container>
    </section>
  );
}

function SmallCard({ icon, title, children, delay }: { icon: ReactNode; title: string; children: ReactNode; delay: number }) {
  return (
    <article className="flex flex-col rounded-[var(--cb-radius)] bg-[var(--cb-card)] p-7 sm:p-9 lg:col-span-2" data-reveal style={d(delay)}>
      <span className="text-[var(--cb-ink)]">{icon}</span>
      <h3 className="mt-6 text-[26px] leading-tight font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-3 text-[16px] leading-relaxed text-[var(--cb-muted)]">{children}</p>
    </article>
  );
}

// ---------------------------------------------------------------- how it works

const STEPS = [
  {
    n: "01",
    title: "Escanea",
    body: "Tu cliente abre la app de su banco, entra a CoDi y escanea el QR que aparece en el kiosco.",
    image: "paso-escanea",
  },
  {
    n: "02",
    title: "Confirma",
    body: "Ve el monto exacto de su boleto y confirma el pago. Sin tarjeta y sin efectivo.",
    image: "paso-confirma",
  },
  {
    n: "03",
    title: "Sale",
    body: "El pago llega al instante, la pluma se levanta y el kiosco le dice: ya puedes salir.",
    image: "paso-sal",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between" data-reveal>
          <div className="max-w-2xl">
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="cb-h2 mt-5">Tres pasos. Cero filas.</h2>
          </div>
          <p className="cb-lead max-w-md text-[var(--cb-ink-2)]">
            Lo que vive tu cliente en la salida, de principio a fin, en menos de lo que tarda en bajar la ventana.
          </p>
        </div>
        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="rounded-[var(--cb-radius)] bg-[var(--cb-card)] p-3" data-reveal style={d(i * 90)}>
              <ImageSlot name={s.image} className="rounded-[20px]" sizes="(min-width: 768px) 33vw, 100vw" />
              <div className="px-4 pt-6 pb-5">
                <p className="font-mono text-[13px] text-[var(--cb-muted)]">{s.n}</p>
                <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">{s.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-[var(--cb-muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- screen income

const MONTHS = [
  { m: "Jul", v: 0.38 },
  { m: "Ago", v: 0.46 },
  { m: "Sep", v: 0.52 },
  { m: "Oct", v: 0.61 },
  { m: "Nov", v: 0.74 },
  { m: "Dic", v: 0.86 },
];

export function ScreenIncome() {
  return (
    <section id="pantalla" className="cb-grain relative scroll-mt-24 overflow-hidden bg-[var(--cb-night)] px-4 py-24 text-white sm:px-6 sm:py-32">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_40%_at_80%_20%,rgba(79,191,126,0.16),transparent_70%),radial-gradient(40%_40%_at_10%_90%,rgba(43,80,255,0.12),transparent_70%)]"
      />
      <Container className="relative">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div data-reveal>
            <Eyebrow dark>Ingresos extra</Eyebrow>
            <h2 className="cb-h2 mt-5">Tu pantalla también gana.</h2>
            <p className="cb-lead mt-5 max-w-xl text-white/65">
              Mientras nadie está pagando, el kiosco pasa anuncios de marcas. Tú recibes el 70% de lo que pagan, cada
              mes, en tu cuenta.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
              {[
                { k: "70%", v: "de cada anuncio es para ti" },
                { k: "Día 5", v: "te pagamos cada mes" },
                { k: "Tú", v: "decides si aceptas anuncios" },
              ].map((x) => (
                <div key={x.k}>
                  <dt className="text-[clamp(26px,3vw,40px)] font-semibold tracking-[-0.04em]">{x.k}</dt>
                  <dd className="mt-1 text-[14px] leading-snug text-white/55">{x.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative" data-reveal style={d(120)}>
            <div className="rounded-[var(--cb-radius)] bg-white p-6 text-[var(--cb-ink)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium">Ingresos por anuncios</p>
                <span className="rounded-full bg-[var(--cb-bg)] px-2.5 py-1 font-mono text-[11px] tracking-[0.06em] text-[var(--cb-muted)] uppercase">
                  Ejemplo
                </span>
              </div>
              <p className="mt-6 text-[13px] text-[var(--cb-muted)]">Próximo pago · 5 de enero</p>
              <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.045em] tabular-nums">
                $4,830<span className="text-[24px] text-[var(--cb-muted)]">.00</span>
              </p>
              <p className="mt-2 text-[13px] text-[var(--cb-muted)]">A tu CLABE •••• 7899</p>

              <div className="mt-8 flex h-40 items-end gap-3" role="img" aria-label="Ejemplo: ingresos por mes, de julio a diciembre, creciendo">
                {MONTHS.map((x, i) => (
                  <div key={x.m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className={`w-full rounded-t-[8px] rounded-b-[3px] ${i === MONTHS.length - 1 ? "bg-[var(--cb-go)]" : "bg-[#dfe7e2]"}`}
                      style={{ height: `${x.v * 100}%` }}
                    />
                    <span className="text-[12px] text-[var(--cb-muted)]">{x.m}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 divide-y divide-[var(--cb-line)] border-t border-[var(--cb-line)] text-[14px]">
                <div className="flex justify-between py-3">
                  <span className="text-[var(--cb-muted)]">Pagaron las marcas</span>
                  <span className="tabular-nums">$6,900.00</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[var(--cb-muted)]">Tu parte (70%)</span>
                  <span className="font-medium tabular-nums">$4,830.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16" data-reveal>
          <ImageSlot name="kiosco-anuncio" tone="dark" className="rounded-[var(--cb-radius)]" sizes="100vw" />
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- advertisers

/** Seconds on a 60 s strip: when the ad played and when payments happened. */
const PLAYS = [
  [2, 14],
  [24, 36],
  [46, 58],
];
const PAYMENTS = [9, 19, 31, 41, 50];

export function Advertisers() {
  const during = (t: number) => PLAYS.some(([a, b]) => t >= a && t <= b);
  return (
    <section id="anunciantes" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div data-reveal>
            <ImageSlot name="marca-audiencia" className="rounded-[var(--cb-radius)]" />
          </div>
          <div>
            <div data-reveal>
              <Eyebrow>Para marcas</Eyebrow>
              <h2 className="cb-h2 mt-5">Anúnciate donde la gente paga.</h2>
              <p className="cb-lead mt-5 text-[var(--cb-ink-2)]">
                Tu video corre en el kiosco justo cuando alguien saca su celular. Y te decimos cuántas personas pagaron
                mientras pasaba tu anuncio.
              </p>
            </div>

            <div className="mt-8 rounded-[var(--cb-radius)] bg-[var(--cb-card)] p-6 sm:p-7" data-reveal style={d(100)}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[15px] font-medium">Pagos durante tu anuncio</p>
                <p className="text-[32px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                  {PAYMENTS.filter(during).length}
                  <span className="ml-1 text-[14px] font-normal tracking-normal text-[var(--cb-muted)]">de {PAYMENTS.length}</span>
                </p>
              </div>
              <div className="relative mt-6 h-14" role="img" aria-label="Ejemplo de un minuto: tu anuncio pasó 3 veces y 3 de los 5 pagos ocurrieron mientras pasaba">
                <div className="absolute inset-x-0 top-[22px] h-3 rounded-full bg-[var(--cb-bg)]" />
                {PLAYS.map(([a, b]) => (
                  <div
                    key={a}
                    className="absolute top-[22px] h-3 rounded-full bg-[var(--cb-ink)]"
                    style={{ left: `${(a / 60) * 100}%`, width: `${((b - a) / 60) * 100}%` }}
                  />
                ))}
                {PAYMENTS.map((t) => (
                  <span
                    key={t}
                    className={`absolute top-[17px] size-[22px] -translate-x-1/2 rounded-full border-[3px] border-white ${
                      during(t) ? "bg-[#0f8f45]" : "bg-[#c4c4ca]"
                    }`}
                    style={{ left: `${(t / 60) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--cb-muted)]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-5 rounded-full bg-[var(--cb-ink)]" />
                  Tu anuncio al aire
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#0f8f45]" />
                  Pago mientras pasaba
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#c4c4ca]" />
                  Otro pago
                </span>
              </div>
            </div>

            <ul className="mt-8 space-y-3 text-[16px]" data-reveal style={d(160)}>
              {[
                "Sube tu video y míralo tal como se verá en el kiosco.",
                "Elige pantallas y fechas; el precio lo ves antes de publicar.",
                "Publica y en menos de un minuto ya está al aire.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <IconCheck className="mt-0.5 size-5 shrink-0 text-[var(--cb-go)]" />
                  <span className="text-[var(--cb-ink-2)]">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3" data-reveal style={d(200)}>
              <a
                href="/registro"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--cb-ink)] px-6 text-[15px] font-medium text-white transition hover:opacity-90"
              >
                Crear campaña
                <IconArrow className="size-4" />
              </a>
              <a
                href="/entrar"
                className="inline-flex h-12 items-center rounded-full border border-[var(--cb-line)] bg-white px-6 text-[15px] font-medium transition hover:border-[var(--cb-ink)]"
              >
                Ya tengo cuenta
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- hardware

export function Hardware() {
  const items = [
    {
      icon: <IconTablet className="size-6" />,
      title: "Tableta horizontal",
      body: "El cobro CoDi a la derecha y los anuncios a la izquierda, siempre encendida.",
    },
    {
      icon: <IconRelay className="size-6" />,
      title: "Relevador para la pluma",
      body: "Se conecta a tu pluma para levantarla en cuanto entra el pago.",
    },
    {
      icon: <IconWifi className="size-6" />,
      title: "Wi-Fi o datos",
      body: "Si se va la señal, los anuncios siguen corriendo con lo último que descargó.",
    },
  ];
  return (
    <section id="equipo" className="scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
      <Container>
        <div className="overflow-hidden rounded-[36px] bg-[var(--cb-card)] p-3 sm:p-4">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div data-reveal>
              <ImageSlot name="kiosco-instalado" className="rounded-[26px]" />
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="px-4 pt-6 pb-2 sm:px-6 sm:pt-8" data-reveal>
                <Eyebrow>El equipo</Eyebrow>
                <h2 className="cb-h2 mt-5">Todo lo que va en tu salida.</h2>
              </div>
              <ul className="grid gap-1 px-2 sm:px-4">
                {items.map((it, i) => (
                  <li key={it.title} className="flex gap-4 rounded-[20px] p-4" data-reveal style={d(i * 80)}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--cb-bg)]">{it.icon}</span>
                    <span>
                      <span className="block text-[18px] font-semibold tracking-[-0.02em]">{it.title}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-[var(--cb-muted)]">{it.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto" data-reveal>
                <ImageSlot name="detalle-hardware" className="rounded-[26px]" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- FAQ

const FAQ = [
  {
    q: "¿Qué es CoDi?",
    a: "Es el sistema de cobros digitales de Banco de México. La persona escanea un código QR desde la app de su banco y el dinero se transfiere al momento.",
  },
  {
    q: "¿Mis clientes tienen que descargar algo?",
    a: "No. Pagan desde la app del banco que ya tienen, en la opción de CoDi o de pagar con QR. Ojo: la cámara normal del celular no lee códigos CoDi.",
  },
  {
    q: "¿Qué bancos funcionan?",
    a: "Cualquier banco que tenga CoDi en su app. Normalmente está en Transferir, como CoDi o Pagar con QR.",
  },
  {
    q: "¿Funciona con mi pluma actual?",
    a: "En la demo revisamos tu pluma y tu caseta. El kiosco usa un relevador que le da la señal de abrir cuando entra el pago.",
  },
  {
    q: "¿Qué pasa si se va el internet?",
    a: "Los anuncios siguen corriendo con lo último que se descargó. Para cobrar con CoDi sí se necesita conexión; mientras vuelve, el kiosco avisa que CoDi no está disponible.",
  },
  {
    q: "¿Cómo se pagan los anuncios?",
    a: "Las marcas contratan espacios en tu pantalla. Tú recibes el 70% de lo que pagan; te depositamos a tu CLABE el día 5 de cada mes. Tú decides si tu pantalla acepta anuncios.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Depende de cuántas salidas y cajones tengas. Agenda una demo y te damos una propuesta para tu estacionamiento.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div data-reveal>
            <Eyebrow>Preguntas</Eyebrow>
            <h2 className="cb-h2 mt-5">Lo que siempre nos preguntan.</h2>
            <p className="cb-lead mt-5 text-[var(--cb-ink-2)]">
              ¿Otra duda?{" "}
              <a href="#demo" className="underline decoration-[var(--cb-line)] underline-offset-4 hover:decoration-[var(--cb-ink)]">
                Escríbenos
              </a>{" "}
              y te respondemos.
            </p>
          </div>
          <div className="divide-y divide-[var(--cb-line)] rounded-[var(--cb-radius)] bg-[var(--cb-card)] px-6 sm:px-8" data-reveal style={d(80)}>
            {FAQ.map((f) => (
              <details key={f.q} className="cb-faq group py-1">
                <summary className="flex items-center justify-between gap-6 py-5 text-[18px] font-medium tracking-[-0.02em]">
                  {f.q}
                  <span className="cb-faq-plus grid size-8 shrink-0 place-items-center rounded-full bg-[var(--cb-bg)]">
                    <IconPlus className="size-4" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[16px] leading-relaxed text-[var(--cb-muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- final CTA

export function DemoCta() {
  return (
    <section id="demo" className="cb-grain relative scroll-mt-20 overflow-hidden bg-[var(--cb-night)] px-4 py-24 text-white sm:px-6 sm:py-32">
      <div aria-hidden className="absolute inset-0 opacity-50">
        <ImageSlot name="ciudad-noche" fill placeholder={false} sizes="100vw" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--cb-night)_0%,rgba(8,8,10,0.75)_40%,var(--cb-night)_100%),radial-gradient(50%_50%_at_20%_60%,rgba(79,191,126,0.2),transparent_70%)]"
      />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div data-reveal>
            <CobtenSymbol tone="white" className="h-16 w-auto" />
            <h2 className="cb-h2 mt-10">Que tu salida cobre sola.</h2>
            <p className="cb-lead mt-5 max-w-md text-white/65">
              Déjanos tus datos y te mostramos cobten funcionando, con un pago real.
            </p>
            <ul className="mt-8 space-y-3 text-[16px] text-white/80">
              {["Revisamos tu salida y tu pluma", "Te damos una propuesta para tus cajones", "Sin compromiso"].map((t) => (
                <li key={t} className="flex gap-3">
                  <IconCheck className="mt-0.5 size-5 shrink-0 text-[var(--cb-go-bright)]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[32px] bg-white p-6 text-[var(--cb-ink)] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:p-9" data-reveal style={d(100)}>
            <p className="text-[24px] font-semibold tracking-[-0.03em]">Agenda una demo</p>
            <p className="mt-1 mb-7 text-[15px] text-[var(--cb-muted)]">Te escribimos en menos de 24 horas.</p>
            <LeadForm />
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- footer

export function Footer() {
  const year = 2026;
  const cols = [
    {
      title: "Producto",
      links: [
        { href: "#como-funciona", label: "Cómo funciona" },
        { href: "#estacionamientos", label: "Estacionamientos" },
        { href: "#anunciantes", label: "Anunciantes" },
        { href: "#preguntas", label: "Preguntas" },
      ],
    },
    {
      title: "Cuenta",
      links: [
        { href: "/entrar", label: "Entrar" },
        { href: "/registro", label: "Crear cuenta" },
        { href: "#demo", label: "Agenda una demo" },
      ],
    },
    { title: "Legal", links: [{ href: "/sitio/privacidad", label: "Aviso de privacidad" }] },
  ];
  return (
    <footer className="overflow-hidden px-4 pt-20 sm:px-6">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <span className="text-[26px]">
              <CobtenLogo />
            </span>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-[var(--cb-muted)]">
              Cobros CoDi y publicidad en pantalla para estacionamientos.
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-[13px] font-medium text-[var(--cb-ink)]">{c.title}</p>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-[15px] text-[var(--cb-muted)] transition hover:text-[var(--cb-ink)]">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-[var(--cb-line)] py-6 text-[13px] text-[var(--cb-muted)] sm:flex-row sm:justify-between">
          <p>© {year} cobten. Hecho en México.</p>
          <p>CoDi es una plataforma de Banco de México.</p>
        </div>
      </Container>
      <p
        aria-hidden
        className="pointer-events-none mx-auto -mb-[0.1em] max-w-[1200px] text-center text-[clamp(96px,24vw,330px)] leading-none font-semibold tracking-[-0.07em] text-[#e2e3e7] select-none"
      >
        cobten
      </p>
    </footer>
  );
}
