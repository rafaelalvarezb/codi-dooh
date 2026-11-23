/**
 * A generic bank app (no real bank's look). Units are cqw of the phone width.
 * Three screens stacked; the hero's data-stage picks the visible one.
 */
export function PhoneMock({ qrSvg }: { qrSvg: string }) {
  return (
    <div className="cb-phone-body">
      <div className="cb-phone-screen">
        <div className="cb-phone-island" />
        <StatusBar />

        {/* 1 · Camera aimed at the kiosk QR */}
        <div className="cb-ps cb-ps-scan bg-[#0d0f0e] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_45%,#2a2f2c,#0b0c0c)]" />
          <div className="relative px-[8cqw] pt-[24cqw] text-center">
            <p className="text-[4cqw] text-white/60">Transferir</p>
            <p className="mt-[1.5cqw] text-[6.6cqw] leading-tight font-semibold tracking-[-0.03em]">
              Escanea el código QR CoDi
            </p>
          </div>
          <div className="relative mx-auto mt-[10cqw] size-[68cqw]">
            <div className="absolute inset-[9cqw] rotate-[-2deg] rounded-[3cqw] bg-white p-[3cqw] opacity-95 blur-[0.15cqw]">
              <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <Corners />
            <div className="cb-scanline" />
          </div>
          <p className="relative mt-[10cqw] px-[10cqw] text-center text-[4cqw] text-white/55">
            Apunta a la pantalla del kiosco
          </p>
        </div>

        {/* 2 · Confirm the amount */}
        <div className="cb-ps cb-ps-confirm bg-[#F6F6F7]">
          <div className="px-[7cqw] pt-[24cqw]">
            <p className="text-[4cqw] text-[#6B6B73]">Pago CoDi</p>
            <p className="mt-[1cqw] text-[7cqw] font-semibold tracking-[-0.03em]">Confirma tu pago</p>
            <p className="mt-[8cqw] text-center text-[14cqw] leading-none font-semibold tracking-[-0.05em]">
              $35<span className="text-[8cqw] text-[#6B6B73]">.00</span>
            </p>
            <p className="mt-[2cqw] text-center font-mono text-[3.4cqw] text-[#6B6B73]">MXN</p>
            <div className="mt-[9cqw] divide-y divide-[#E6E6E9] rounded-[5cqw] bg-white px-[5cqw] text-[3.8cqw]">
              <Row label="Para" value="Estacionamiento Plaza" />
              <Row label="Concepto" value="Boleto 0427" />
              <Row label="Desde" value="Cuenta •••• 2841" />
            </div>
          </div>
          <div className="absolute inset-x-[7cqw] bottom-[9cqw]">
            <div className="cb-pay-btn grid h-[14cqw] place-items-center rounded-[7cqw] bg-[#0A0A0B] text-[4.6cqw] font-medium text-white">
              Pagar $35.00
            </div>
          </div>
        </div>

        {/* 3 · Paid: the moment that matters */}
        <div className="cb-ps cb-ps-done bg-white">
          <div className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(80%_60%_at_50%_30%,#e4f3ea,transparent_70%)]" />
          <div className="relative flex flex-col items-center px-[8cqw] pt-[34cqw] text-center">
            <svg viewBox="0 0 64 64" className="size-[30cqw]" aria-hidden>
              <circle className="cb-check-ring origin-center" cx="32" cy="32" r="30" fill="#0F8F45" />
              <path
                className="cb-check-path"
                d="M20 33l8 8 16-17"
                fill="none"
                stroke="#fff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-[8cqw] text-[9cqw] leading-none font-semibold tracking-[-0.045em]">Pago recibido</p>
            <p className="mt-[3.5cqw] text-[5.2cqw] leading-snug text-[#3A3A40]">
              Ya puedes salir del estacionamiento
            </p>
          </div>
          <div className="absolute inset-x-[7cqw] bottom-[9cqw] rounded-[5cqw] bg-[#F4F4F5] px-[5cqw] py-[3cqw] text-[3.6cqw]">
            <Row label="Monto" value="$35.00 MXN" />
            <Row label="Referencia" value="CD 8F3K2M" mono />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-[14cqw] items-center justify-between px-[9cqw] text-[3.6cqw] font-semibold mix-blend-difference text-white">
      <span>12:41</span>
      <span className="flex items-center gap-[1.4cqw]">
        <span className="flex items-end gap-[0.5cqw]">
          {[1.6, 2.4, 3.2, 4].map((h) => (
            <span key={h} className="w-[0.9cqw] rounded-[0.3cqw] bg-current" style={{ height: `${h}cqw` }} />
          ))}
        </span>
        <span className="h-[3.4cqw] w-[6.4cqw] rounded-[1cqw] border-[0.4cqw] border-current p-[0.4cqw]">
          <span className="block h-full w-3/4 rounded-[0.4cqw] bg-current" />
        </span>
      </span>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[3cqw] py-[3cqw]">
      <span className="text-[#6B6B73]">{label}</span>
      <span className={`truncate font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Corners() {
  const c = "absolute size-[12cqw] border-white";
  return (
    <>
      <span className={`${c} top-0 left-0 rounded-tl-[5cqw] border-t-[1.2cqw] border-l-[1.2cqw]`} />
      <span className={`${c} top-0 right-0 rounded-tr-[5cqw] border-t-[1.2cqw] border-r-[1.2cqw]`} />
      <span className={`${c} bottom-0 left-0 rounded-bl-[5cqw] border-b-[1.2cqw] border-l-[1.2cqw]`} />
      <span className={`${c} right-0 bottom-0 rounded-br-[5cqw] border-r-[1.2cqw] border-b-[1.2cqw]`} />
    </>
  );
}
