import QRCode from "qrcode";
import { Card } from "@/components/app/Page";
import { CopyButton, RotateTokenButton } from "@/components/host/ScreenActions";
import { kioskPath, screenToken } from "@/lib/screen-token";
import { requestOrigin } from "@/lib/origin";

/** Kiosk URL with its secret token, as text and as a QR to open it on the tablet. */
export async function KioskLinkCard({
  screen,
}: {
  screen: { id: string; profile: string; tokenVersion: number | null; tokenRotatedAt: Date | null };
}) {
  if (screen.tokenVersion == null) {
    return (
      <Card className="px-5 py-5 text-[length:var(--cd-body)] text-[var(--cd-muted)]">
        Esta pantalla todavía no tiene link de kiosco. Usa “Cambiar token” para generarlo.
        <div className="mt-3">
          <RotateTokenButton screenId={screen.id} />
        </div>
      </Card>
    );
  }
  const url = `${await requestOrigin()}${kioskPath(screen, screenToken(screen.id, screen.tokenVersion))}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0A0A0B", light: "#FFFFFF" } });

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
        <div
          role="img"
          aria-label="Código QR con el link del kiosco"
          className="mx-auto aspect-square w-[180px] rounded-[var(--cd-radius-sm)] bg-white p-3 ring-1 ring-[var(--cd-line)] [&>svg]:h-full [&>svg]:w-full"
          // QR markup generated on the server from our own URL.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0">
          <h3 className="text-[length:var(--cd-body)] font-medium">Link del kiosco</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[length:var(--cd-small)] text-[var(--cd-ink-2)]">
            <li>En la tableta del kiosco, escanea este código con la cámara o abre el link.</li>
            <li>Deja la página abierta en pantalla completa. Se actualiza sola cada minuto.</li>
          </ol>
          <p className="mt-3 rounded-[var(--cd-radius-sm)] bg-[var(--cd-surface)] px-3 py-2 font-mono text-[12px] break-all text-[var(--cd-ink-2)]">
            {url}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <CopyButton value={url} />
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-[var(--cd-radius-sm)] px-3 text-[length:var(--cd-small)] font-medium text-[var(--cd-ink-2)] hover:bg-[var(--cd-surface)]">
              Abrir kiosco
            </a>
          </div>
          <p className="mt-4 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
            El link incluye una clave secreta que confirma qué anuncios pasaron en esta pantalla. No lo compartas.
            {screen.tokenRotatedAt
              ? ` Última vez que se cambió: ${screen.tokenRotatedAt.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" })}.`
              : null}
          </p>
          <div className="mt-3">
            <RotateTokenButton screenId={screen.id} />
          </div>
        </div>
      </div>
    </Card>
  );
}
