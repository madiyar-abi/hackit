"use client";

import { useMemo, useState } from "react";
import type { Freezer, Outlet, Rep, Visit } from "@/lib/types";
import { DEFAULT_CONFIG } from "@/lib/engine/config";
import { distanceM } from "@/lib/geo";
import { fmtDate, fmtMoney } from "@/lib/format";

type Tab = "route" | "visit" | "order";
type VisitStatusState = "done" | "missed" | "upcoming";

interface MobileAppProps {
  rep: Rep;
  date: string;
  visits: Visit[];
  outlets: Outlet[];
  freezers: Freezer[];
}

interface OrderItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

const DAIRY_SKUS: OrderItem[] = [
  { id: "sku-1", name: "Молоко 3,2% 1 л", category: "Молоко", price: 520 },
  { id: "sku-2", name: "Кефир 2,5% 1 л", category: "Кефир", price: 480 },
  { id: "sku-3", name: "Сметана 20% 400 г", category: "Сметана", price: 650 },
  { id: "sku-4", name: "Творог 9% 200 г", category: "Творог", price: 580 },
  { id: "sku-5", name: "Йогурт питьевой 270 г", category: "Йогурт", price: 390 },
  { id: "sku-6", name: "Мороженое пломбир 80 г", category: "Мороженое", price: 320 },
];

export function MobileApp({ rep, date, visits, outlets, freezers }: MobileAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("route");
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    visits[0]?.id ?? ""
  );

  // Status of each visit in the mobile app session (done / missed / upcoming)
  const [statusMap, setStatusMap] = useState<Record<string, VisitStatusState>>(() => {
    const map: Record<string, VisitStatusState> = {};
    visits.forEach((v, index) => {
      if (v.status === "missed") {
        map[v.id] = "missed";
      } else if (index === 0) {
        // First visit completed earlier in the morning
        map[v.id] = "done";
      } else {
        // Subsequent visits upcoming during the day
        map[v.id] = "upcoming";
      }
    });
    return map;
  });

  // GPS check-in state per visit
  const [gpsCheckins, setGpsCheckins] = useState<
    Record<string, { distance: number; isFar: boolean; time: string }>
  >({});

  // Freezer scan state per outlet
  const [scannedFreezers, setScannedFreezers] = useState<
    Record<string, { scanned: boolean; found: boolean; freezer?: Freezer }>
  >({});

  // Freezer photo state per outlet
  const [photos, setPhotos] = useState<Record<string, boolean>>({});

  // Order quantities: skuId -> number
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({
    "sku-1": 12,
    "sku-2": 6,
    "sku-3": 4,
  });

  // Order confirmation state
  const [orderSent, setOrderSent] = useState(false);

  // Lookups
  const outletMap = useMemo(
    () => new Map(outlets.map((o) => [o.id, o])),
    [outlets]
  );
  const freezerMap = useMemo(
    () => new Map(freezers.map((f) => [f.outletId, f])),
    [freezers]
  );

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) ?? visits[0];
  const selectedOutlet = selectedVisit ? outletMap.get(selectedVisit.outletId) : undefined;
  const selectedFreezer = selectedOutlet ? freezerMap.get(selectedOutlet.id) : undefined;

  // Handle GPS check-in
  const handleCheckIn = (simulateFar: boolean = false) => {
    if (!selectedVisit || !selectedOutlet) return;

    let checkLat: number;
    let checkLng: number;

    if (simulateFar) {
      // Simulate distant check-in (~1.2 km away)
      checkLat = selectedOutlet.lat + 0.011;
      checkLng = selectedOutlet.lng + 0.009;
    } else if (selectedVisit.gps) {
      checkLat = selectedVisit.gps.lat;
      checkLng = selectedVisit.gps.lng;
    } else {
      // Outlet coordinates + small 20-30m offset
      checkLat = selectedOutlet.lat + 0.00015;
      checkLng = selectedOutlet.lng + 0.00015;
    }

    const dist = Math.round(
      distanceM(selectedOutlet.lat, selectedOutlet.lng, checkLat, checkLng)
    );
    const isFar = dist > DEFAULT_CONFIG.gpsMaxDistanceM;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    setGpsCheckins((prev) => ({
      ...prev,
      [selectedVisit.id]: {
        distance: dist,
        isFar,
        time: `${hh}:${mm}`,
      },
    }));

    // Update status to done
    setStatusMap((prev) => ({
      ...prev,
      [selectedVisit.id]: "done",
    }));
  };

  // Handle Mark Missed
  const handleMarkMissed = () => {
    if (!selectedVisit) return;
    setStatusMap((prev) => ({
      ...prev,
      [selectedVisit.id]: "missed",
    }));
  };

  // Handle Reset Status
  const handleResetStatus = () => {
    if (!selectedVisit) return;
    setStatusMap((prev) => ({
      ...prev,
      [selectedVisit.id]: "upcoming",
    }));
    setGpsCheckins((prev) => {
      const next = { ...prev };
      delete next[selectedVisit.id];
      return next;
    });
  };

  // Handle QR scan
  const handleScanQR = () => {
    if (!selectedOutlet) return;
    setScannedFreezers((prev) => ({
      ...prev,
      [selectedOutlet.id]: {
        scanned: true,
        found: !!selectedFreezer,
        freezer: selectedFreezer,
      },
    }));
  };

  // Handle photo
  const handleTakePhoto = () => {
    if (!selectedOutlet) return;
    setPhotos((prev) => ({
      ...prev,
      [selectedOutlet.id]: true,
    }));
  };

  // Order math
  const orderTotal = useMemo(() => {
    return DAIRY_SKUS.reduce((sum, item) => {
      const qty = orderQuantities[item.id] || 0;
      return sum + item.price * qty;
    }, 0);
  }, [orderQuantities]);

  const orderTotalUnits = useMemo(() => {
    return Object.values(orderQuantities).reduce((a, b) => a + b, 0);
  }, [orderQuantities]);

  const updateQuantity = (skuId: string, delta: number) => {
    setOrderQuantities((prev) => {
      const cur = prev[skuId] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [skuId]: next };
    });
    setOrderSent(false);
  };

  return (
    <div className="relative mx-auto h-[780px] w-full max-w-[390px] rounded-[2.5rem] bg-ink p-3 shadow-2xl ring-1 ring-black/10 select-none">
      {/* Inner phone screen */}
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-milk text-ink">
        {/* Phone top status bar */}
        <div className="flex h-11 shrink-0 items-center justify-between bg-ink px-6 text-xs font-medium text-white">
          <span>09:41</span>
          {/* Speaker notch / Dynamic island */}
          <div className="h-4 w-24 rounded-full bg-black/60" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>5G</span>
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
            </svg>
            <div className="h-2.5 w-4 rounded-xs border border-white p-0.5">
              <div className="h-full w-full bg-white" />
            </div>
          </div>
        </div>

        {/* Header inside app */}
        <div className="border-b border-line bg-carton px-4 py-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {rep.district} · {fmtDate(date)}
              </p>
              <h2 className="font-display text-sm font-bold text-ink">
                {rep.name}
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-frost-soft px-2 py-0.5 text-[11px] font-semibold text-frost">
              ТП {rep.id.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Scrollable body content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {/* TAB 1: МАРШРУТ */}
          {activeTab === "route" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">
                  План маршрута на день
                </h3>
                <span className="text-xs text-muted">
                  {visits.length} {visits.length === 1 ? "точка" : "точки"}
                </span>
              </div>

              <div className="space-y-2.5">
                {visits.map((v) => {
                  const outlet = outletMap.get(v.outletId);
                  const status = statusMap[v.id] || "upcoming";
                  const isSelected = v.id === selectedVisitId;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVisitId(v.id);
                        setActiveTab("visit");
                      }}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-frost bg-carton shadow-sm ring-1 ring-frost"
                          : "border-line bg-carton hover:border-frost/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-ink">
                          <span className="text-frost">{v.plannedTime}</span>
                          <span className="text-muted">·</span>
                          <span>{outlet?.name ?? v.outletId}</span>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <p className="mt-1.5 text-xs text-muted line-clamp-1">
                        {outlet?.address ?? "Адрес не указан"}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted border-t border-line/60 pt-2">
                        <span>Тип: {outlet?.type ?? "—"}</span>
                        <span className="text-frost font-medium">
                          Открыть визит →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Informational tip */}
              <div className="rounded-lg border border-line bg-carton/60 p-3 text-xs text-muted leading-relaxed">
                <p className="font-medium text-ink">💡 Инструкция ТП:</p>
                <p className="mt-0.5">
                  Нажмите на точку, чтобы зафиксировать GPS-отметку визита,
                  проверить ларь по QR-коду и оформить заказ продукции.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ВИЗИТ */}
          {activeTab === "visit" && (
            <div className="space-y-4">
              {selectedOutlet && selectedVisit ? (
                <>
                  {/* Outlet details card */}
                  <div className="rounded-xl border border-line bg-carton p-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-muted uppercase">
                          {selectedVisit.plannedTime} · {selectedOutlet.type}
                        </span>
                        <h3 className="font-display text-base font-semibold text-ink leading-tight">
                          {selectedOutlet.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {selectedOutlet.address}
                        </p>
                      </div>
                      <StatusBadge
                        status={statusMap[selectedVisit.id] || "upcoming"}
                      />
                    </div>
                  </div>

                  {/* Section 1: GPS Check-in */}
                  <div className="rounded-xl border border-line bg-carton p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs font-semibold text-ink flex items-center gap-1.5">
                        <svg
                          className="h-4 w-4 text-frost"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Геолокация и отметка
                      </h4>
                      <span className="text-[11px] text-muted">
                        макс. {DEFAULT_CONFIG.gpsMaxDistanceM} м
                      </span>
                    </div>

                    {/* GPS feedback alert */}
                    {gpsCheckins[selectedVisit.id] ? (
                      <div
                        className={`rounded-lg p-3 text-xs leading-snug border ${
                          gpsCheckins[selectedVisit.id].isFar
                            ? "bg-critical-soft text-critical border-critical/30"
                            : "bg-ok-soft text-ok border-ok/30"
                        }`}
                      >
                        {gpsCheckins[selectedVisit.id].isFar ? (
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none">✕</span>
                            <div>
                              <p className="font-semibold">
                                Слишком далеко от точки:{" "}
                                {gpsCheckins[selectedVisit.id].distance} м —
                                отметка уйдёт супервайзеру
                              </p>
                              <p className="mt-0.5 text-[11px] opacity-90">
                                Время: {gpsCheckins[selectedVisit.id].time} ·
                                Превышен порог{" "}
                                {DEFAULT_CONFIG.gpsMaxDistanceM} м
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none">✓</span>
                            <div>
                              <p className="font-semibold">
                                В точке:{" "}
                                {gpsCheckins[selectedVisit.id].distance} м
                              </p>
                              <p className="mt-0.5 text-[11px] opacity-90">
                                Время фиксации:{" "}
                                {gpsCheckins[selectedVisit.id].time}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        Нажмите кнопку при прибытии в торговую точку для
                        GPS-фиксации визита.
                      </p>
                    )}

                    {/* Check-in buttons */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCheckIn(false)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-frost py-2.5 px-3 text-xs font-semibold text-white shadow-xs hover:bg-frost/90 active:scale-[0.99] transition-all"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Отметиться в точке (GPS)
                      </button>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCheckIn(true)}
                          className="flex-1 rounded-lg border border-line bg-milk py-1.5 px-2 text-[11px] text-muted hover:border-critical hover:text-critical transition-colors"
                          title="Проверить сценарий отклонения при отметке вне радиуса точки"
                        >
                          Имитировать отметку далеко (&gt;300 м)
                        </button>
                        {statusMap[selectedVisit.id] !== "missed" ? (
                          <button
                            type="button"
                            onClick={handleMarkMissed}
                            className="rounded-lg border border-line bg-milk py-1.5 px-2 text-[11px] text-muted hover:text-critical transition-colors"
                          >
                            Пропуск
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResetStatus}
                            className="rounded-lg border border-line bg-milk py-1.5 px-2 text-[11px] text-muted hover:text-ink transition-colors"
                          >
                            Сброс
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Ларь компании */}
                  <div className="rounded-xl border border-line bg-carton p-3.5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs font-semibold text-ink flex items-center gap-1.5">
                        <svg
                          className="h-4 w-4 text-frost"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        Ларь компании
                      </h4>
                      <span className="text-[11px] text-muted">
                        {selectedOutlet.freezerRequired
                          ? "Обязателен"
                          : "Не требуется"}
                      </span>
                    </div>

                    {/* QR Scan Result */}
                    {scannedFreezers[selectedOutlet.id]?.scanned && (
                      <div
                        className={`rounded-lg p-3 text-xs border ${
                          scannedFreezers[selectedOutlet.id].found
                            ? "bg-ok-soft text-ok border-ok/30"
                            : "bg-critical-soft text-critical border-critical/30"
                        }`}
                      >
                        {scannedFreezers[selectedOutlet.id].found ? (
                          <div>
                            <p className="font-semibold flex items-center gap-1">
                              <span>✓</span> Ларь найден:{" "}
                              {
                                scannedFreezers[selectedOutlet.id].freezer?.id
                              }{" "}
                              (
                              {
                                scannedFreezers[selectedOutlet.id].freezer
                                  ?.model
                              }
                              )
                            </p>
                            <p className="mt-1 text-[11px] opacity-90">
                              Установлен:{" "}
                              {
                                scannedFreezers[selectedOutlet.id].freezer
                                  ?.installedAt
                              }
                              {scannedFreezers[selectedOutlet.id].freezer
                                ?.lastAudit &&
                                ` · Выкладка: ${scannedFreezers[selectedOutlet.id].freezer?.lastAudit?.ourProductSharePct}%`}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5">
                            <span className="text-base leading-none">✕</span>
                            <div>
                              <p className="font-semibold">
                                Ларь не найден — будет создано отклонение
                              </p>
                              <p className="mt-0.5 text-[11px] opacity-90">
                                В реестре оборудования ларь отсутствует либо
                                не обнаружен.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* QR and Photo buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleScanQR}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-carton py-2 px-2 text-xs font-semibold text-ink shadow-2xs hover:bg-frost-soft hover:border-frost hover:text-frost transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                        Сканировать QR ларя
                      </button>

                      <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-carton py-2 px-2 text-xs font-semibold text-ink shadow-2xs hover:bg-frost-soft hover:border-frost hover:text-frost transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Сделать фото
                      </button>
                    </div>

                    {/* Photo thumbnail */}
                    {photos[selectedOutlet.id] && (
                      <div className="relative mt-2 overflow-hidden rounded-lg border border-line bg-milk p-3 text-center">
                        <div className="flex flex-col items-center justify-center py-2">
                          <div className="h-10 w-10 rounded-full bg-frost-soft text-frost flex items-center justify-center mb-1">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-ink">
                            Фото ларя (демо)
                          </span>
                          <span className="text-[10px] text-muted">
                            Камера: {fmtDate(date)} · Загружено
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick button to Go to Order */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("order")}
                    className="w-full flex items-center justify-between rounded-xl border border-line bg-carton p-3 text-xs font-semibold text-ink shadow-xs hover:border-frost hover:text-frost transition-colors"
                  >
                    <span>Перейти к оформлению заказа</span>
                    <span>→</span>
                  </button>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-muted">
                  Выберите точку в маршруте
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ЗАКАЗ */}
          {activeTab === "order" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Заказ продукции
                  </h3>
                  <p className="text-[11px] text-muted">
                    {selectedOutlet?.name ?? "Точка не выбрана"}
                  </p>
                </div>
                <span className="text-xs font-bold text-frost">
                  {fmtMoney(orderTotal)}
                </span>
              </div>

              {/* Order Sent Alert */}
              {orderSent && (
                <div className="rounded-xl border border-ok/30 bg-ok-soft p-3 text-xs text-ok">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">✓</span>
                    <div>
                      <p className="font-bold">Заказ отправлен (демо)</p>
                      <p className="text-[11px] opacity-90">
                        Сумма: {fmtMoney(orderTotal)} ({orderTotalUnits} шт.) в
                        1С
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SKU List */}
              <div className="space-y-2">
                {DAIRY_SKUS.map((sku) => {
                  const qty = orderQuantities[sku.id] || 0;
                  const itemTotal = sku.price * qty;

                  return (
                    <div
                      key={sku.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-carton p-2.5 shadow-2xs"
                    >
                      <div className="pr-2 flex-1">
                        <p className="text-xs font-semibold text-ink leading-tight">
                          {sku.name}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {fmtMoney(sku.price)} / шт.
                          {qty > 0 && (
                            <span className="ml-1 text-frost font-medium">
                              = {fmtMoney(itemTotal)}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(sku.id, -1)}
                          disabled={qty === 0}
                          className="h-7 w-7 rounded-lg border border-line bg-milk text-sm font-bold text-ink flex items-center justify-center hover:bg-line active:scale-95 disabled:opacity-30 disabled:hover:bg-milk transition-all"
                          aria-label={`Уменьшить ${sku.name}`}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-ink">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(sku.id, 1)}
                          className="h-7 w-7 rounded-lg border border-line bg-milk text-sm font-bold text-ink flex items-center justify-center hover:bg-line active:scale-95 transition-all"
                          aria-label={`Увеличить ${sku.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & Submit Button */}
              <div className="rounded-xl border border-line bg-carton p-3 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Всего товаров:</span>
                  <span className="font-semibold text-ink">
                    {orderTotalUnits} шт.
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-display font-bold border-t border-line/60 pt-2">
                  <span>Итого к оплате:</span>
                  <span className="text-frost">{fmtMoney(orderTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setOrderSent(true)}
                  disabled={orderTotalUnits === 0}
                  className="w-full rounded-lg bg-frost py-2.5 text-xs font-bold text-white shadow-xs hover:bg-frost/90 active:scale-[0.99] disabled:opacity-40 transition-all"
                >
                  Отправить заказ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-line bg-carton px-2 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab("route")}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              activeTab === "route" ? "text-frost font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className="mt-1 text-[10px]">Маршрут</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visit")}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              activeTab === "visit" ? "text-frost font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span className="mt-1 text-[10px]">Визит</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("order")}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              activeTab === "order" ? "text-frost font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="mt-1 text-[10px]">Заказ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VisitStatusState }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok border border-ok/20">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        выполнен
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-semibold text-critical border border-critical/20">
        <span className="h-1.5 w-1.5 rounded-full bg-critical" />
        пропущен
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-frost-soft px-2 py-0.5 text-[10px] font-semibold text-frost border border-frost/20">
      <span className="h-1.5 w-1.5 rounded-full bg-frost" />
      предстоит
    </span>
  );
}
