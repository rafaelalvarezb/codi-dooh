import { beforeEach, describe, expect, it } from "vitest";
import { useTestDb } from "@/test/db";
import {
  getPayment,
  listPayments,
  markPaid,
  markPending,
  normalizePaidAt,
  paymentStats,
} from "@/lib/payment-store";
import { getMachine, listMachines, touchMachine } from "@/lib/machines";

beforeEach(async () => {
  await useTestDb();
});

describe("payment-store (DB)", () => {
  it("records pending then paid, keeping machine and checkout window", async () => {
    await markPending("qr_1", { machineId: "scr_a", concept: "Boleto", amount: 0.01 });
    const pending = await getPayment("qr_1");
    expect(pending?.status).toBe("PENDING");
    expect(pending?.amount).toBe(0.01);

    await markPaid("qr_1", { transactionId: "tx_1" });
    const paid = await getPayment("qr_1");
    expect(paid?.status).toBe("PAID");
    expect(paid?.machineId).toBe("scr_a");
    expect(paid?.amount).toBe(0.01);
    expect(paid?.transactionId).toBe("tx_1");
    expect(paid!.datePaid!).toBeGreaterThanOrEqual(paid!.createdAt!);
  });

  it("keeps the first paid time when webhook and polling both confirm", async () => {
    await markPending("qr_2", { machineId: "parking", amount: 0.01 });
    const first = Date.now() - 5_000;
    await markPaid("qr_2", { datePaid: first });
    await markPaid("qr_2", { datePaid: Date.now() });
    expect((await getPayment("qr_2"))?.datePaid).toBe(first);
  });

  it("creates a row for an unknown QR confirmed by webhook", async () => {
    await markPaid("qr_unknown", { amount: 0.01 });
    expect((await getPayment("qr_unknown"))?.status).toBe("PAID");
  });

  it("aggregates paid stats and filters by machine", async () => {
    await markPending("a", { machineId: "m1", amount: 10 });
    await markPaid("a", {});
    await markPending("b", { machineId: "m2", amount: 5 });
    await markPaid("b", {});
    await markPending("c", { machineId: "m1", amount: 99 });

    const all = await paymentStats();
    expect(all.todayCount).toBe(2);
    expect(all.todayAmount).toBe(15);

    const m1 = await paymentStats({ machineIds: ["m1"] });
    expect(m1.totalCount).toBe(1);
    expect(m1.totalAmount).toBe(10);

    expect(await paymentStats({ machineIds: [] })).toMatchObject({ totalCount: 0 });
    expect((await listPayments(10)).length).toBe(3);
    expect((await listPayments(10, { machineIds: ["m2"] })).map((p) => p.qrId)).toEqual(["b"]);
  });
});

describe("normalizePaidAt", () => {
  const now = Date.UTC(2026, 10, 21, 12);
  it("accepts milliseconds and seconds", () => {
    expect(normalizePaidAt(now - 1000, now).getTime()).toBe(now - 1000);
    expect(normalizePaidAt((now - 2000) / 1000, now).getTime()).toBe(now - 2000);
  });
  it("falls back to now for missing or implausible values", () => {
    expect(normalizePaidAt(undefined, now).getTime()).toBe(now);
    expect(normalizePaidAt(now - 3 * 86_400_000, now).getTime()).toBe(now);
  });
});

describe("machines (DB)", () => {
  it("seeds legacy kiosks and tracks last seen", async () => {
    const machines = await listMachines();
    expect(machines.map((m) => m.id)).toEqual(["bathroom", "parking", "laundry"]);
    expect(machines[1].kioskPath).toBe("/?profile=parking&session=1");
    expect(machines[1].status).toBe("unknown");

    await touchMachine("parking");
    expect((await getMachine("parking"))?.status).toBe("online");

    await touchMachine("does-not-exist");
    expect(await getMachine("does-not-exist")).toBeUndefined();
  });
});
