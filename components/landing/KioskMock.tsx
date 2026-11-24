/**
 * The kiosk at the parking exit, drawn in HTML at the real 1280×800 layout
 * (units are cqw of the stage: 1cqw = 12.8 logical px). Right column follows
 * design/SPEC.md "contraste": night block with the QR, white zone below.
 */
export function KioskMock({ qrSvg }: { qrSvg: string }) {
  return (
    <div className="cb-kiosk-screen">
      <div className="cb-ad">
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        <p className="absolute top-[2.4cqw] left-[2.5cqw] font-mono text-[0.85cqw] tracking-[0.12em] text-white/70 uppercase">
          Anuncio · 0:06
        </p>
        <div className="absolute right-[2.5cqw] bottom-[4.4cqw] left-[2.5cqw]">
          <p className="text-[1cqw] font-medium tracking-[0.02em] text-white/75">Tu marca aquí</p>
          <p className="mt-[0.6cqw] max-w-[22ch] text-[3.6cqw] leading-[1.02] font-semibold tracking-[-0.04em] text-white">
            Frente a quien está pagando.
          </p>
        </div>
        <div className="cb-ad-bar" />
      </div>

      <div className="relative bg-white text-[#0A0A0B]">
        <div className="cb-panel-wait flex flex-col">
          <div className="flex flex-col items-center bg-[#0A0A0B] px-[2.5cqw] pt-[2cqw] pb-[1.8cqw] text-white">
            <div className="flex items-center gap-[0.8cqw]">
              <span className="grid size-[3cqw] place-items-center rounded-[0.8cqw] bg-white text-[0.95cqw] font-bold tracking-[-0.04em] text-[#0A0A0B] ring-1 ring-white/20">
                CoDi
              </span>
              <span className="text-left leading-tight">
                <span className="block text-[1.4cqw] font-medium">Paga con CoDi</span>
                <span className="block text-[0.95cqw] text-[#A1A1A8]">Banco de México</span>
              </span>
            </div>
            <p className="mt-[1.3cqw] text-[0.95cqw] text-[#A1A1A8]">Boleto de estacionamiento</p>
            <p className="text-[3.3cqw] leading-none font-medium tracking-[-0.03em]">
              $35.00 <span className="font-mono text-[0.9cqw] tracking-normal text-[#A1A1A8]">MXN</span>
            </p>
            <div className="cb-qr-card mt-[1.3cqw] size-[17.5cqw] rounded-[1.25cqw] bg-white p-[0.9cqw]">
              <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
          </div>
          <div className="flex flex-1 flex-col px-[2.2cqw] pt-[1.4cqw] pb-[1.3cqw]">
            <p className="text-[1.4cqw] font-medium tracking-[-0.02em]">Solo con la app de tu banco</p>
            <div className="mt-[0.8cqw] grid grid-cols-2 gap-[0.6cqw] text-[0.85cqw]">
              <span className="rounded-full bg-[#E5F5EB] px-[0.9cqw] py-[0.5cqw] text-[#0F8F45]">App del banco: sí</span>
              <span className="rounded-full bg-[#FCEBEB] px-[0.9cqw] py-[0.5cqw] text-[#D12F35]">Cámara: no</span>
            </div>
            <div className="mt-auto flex items-center justify-between text-[0.85cqw] text-[#6B6B73]">
              <span className="flex items-center gap-[0.6cqw]">
                <span className="cb-pulse-dot size-[0.6cqw] rounded-full bg-[#2B50FF]" />
                Esperando pago
              </span>
              <span className="font-mono">Vence en 4:32</span>
            </div>
          </div>
        </div>

        <div className="cb-panel-done flex flex-col items-center justify-center px-[2.5cqw] text-center">
          <span className="grid size-[6.9cqw] place-items-center rounded-full bg-[#E5F5EB]">
            <svg viewBox="0 0 24 24" className="size-[3.4cqw] text-[#0F8F45]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <p className="mt-[1.6cqw] text-[2.35cqw] font-medium tracking-[-0.03em]">Pago recibido</p>
          <p className="mt-[0.4cqw] text-[1.2cqw] text-[#6B6B73]">Ya puedes salir</p>
          <div className="mt-[2cqw] w-full rounded-[1.25cqw] bg-[#F4F4F5] px-[1.6cqw] py-[1.2cqw] text-left text-[0.95cqw]">
            <div className="flex justify-between">
              <span className="text-[#6B6B73]">Boleto</span>
              <span className="font-medium">$35.00 MXN</span>
            </div>
            <div className="mt-[0.6cqw] flex justify-between">
              <span className="text-[#6B6B73]">Método</span>
              <span>CoDi</span>
            </div>
            <div className="mt-[0.6cqw] flex justify-between">
              <span className="text-[#6B6B73]">Hora</span>
              <span className="font-mono">12:41</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[0.45cqw] bg-[#E5F5EB]">
            <div className="cb-done-bar h-full bg-[#0F8F45]" />
          </div>
        </div>
      </div>
    </div>
  );
}
