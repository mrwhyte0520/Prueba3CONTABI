export type PlanNotifyPayload = {
  to: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  method: string;
  purchasedAt: string;
};

export async function notifyPlanPurchase(payload: PlanNotifyPayload) {
  try {
    const url = (import.meta as any).env?.VITE_NOTIFY_WEBHOOK_URL || '';
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}
