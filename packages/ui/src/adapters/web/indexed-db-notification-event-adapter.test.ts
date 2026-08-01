import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBNotificationEventAdapter } from "./indexed-db-notification-event-adapter";

const { mockDb, generateIdMock } = vi.hoisted(() => ({
  mockDb: {
    notificationEvents: {
      toArray: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
  },
  generateIdMock: vi.fn(),
}));

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: generateIdMock,
}));

describe("IndexedDBNotificationEventAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateIdMock.mockReturnValue("event-1");
    mockDb.notificationEvents.toArray.mockResolvedValue([]);
  });

  it("enqueues recurring fields with pending defaults", async () => {
    const event =
      await new IndexedDBNotificationEventAdapter().enqueueNotificationEvent({
        eventType: "credit_card_payment_due",
        title: "Payment due",
        body: "Card payment is due",
        triggeredAt: "2026-08-10T02:00:00.000Z",
        deliveryMode: "daily_until_source_change",
        sourceTable: "accounts",
        sourceRowId: "card-1",
        sourceVersion: 3,
      });

    expect(mockDb.notificationEvents.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-1",
        priority: "normal",
        status: "pending",
        attemptCount: 0,
        sourceVersion: 3,
      }),
    );
    expect(event.deliveryMode).toBe("daily_until_source_change");
  });

  it("updates status while retaining recurring metadata", async () => {
    mockDb.notificationEvents.get.mockResolvedValue({
      id: "event-1",
      eventType: "credit_card_payment_due",
      title: "Payment due",
      body: "Card payment is due",
      priority: "high",
      status: "pending",
      triggeredAt: "2026-08-10T02:00:00.000Z",
      attemptCount: 0,
      deliveryMode: "daily_until_source_change",
      sourceVersion: 3,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      syncVersion: 2,
      syncedAt: 100,
    });

    const event =
      await new IndexedDBNotificationEventAdapter().updateNotificationEventStatus(
        "event-1",
        {
          status: "failed",
          lastError: "network",
          attemptCount: 1,
        },
      );

    expect(event).toMatchObject({
      status: "failed",
      sourceVersion: 3,
      syncVersion: 3,
      syncedAt: null,
    });
  });
});
