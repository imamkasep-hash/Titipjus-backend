import { BadRequestException } from '@nestjs/common';

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  SEARCHING_DRIVER = 'SEARCHING_DRIVER',
  ACCEPTED_BY_DRIVER = 'ACCEPTED_BY_DRIVER',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Peta transisi status yang valid.
 * Key = status sekarang, Value = array status yang boleh jadi berikutnya.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.SEARCHING_DRIVER,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SEARCHING_DRIVER]: [
    OrderStatus.ACCEPTED_BY_DRIVER,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ACCEPTED_BY_DRIVER]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.COMPLETED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export class OrderStateMachine {
  /**
   * Cek apakah transisi dari currentStatus ke newStatus valid.
   */
  static canTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const allowed = TRANSITIONS[currentStatus] ?? [];
    return allowed.includes(newStatus);
  }

  /**
   * Validasi transisi, throw error kalau tidak valid.
   */
  static validateTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Transisi status tidak valid: ${currentStatus} → ${newStatus}. ` +
          `Status yang diizinkan: ${(TRANSITIONS[currentStatus] ?? []).join(', ') || 'tidak ada'}`,
      );
    }
  }

  /**
   * Cek apakah status adalah status final (tidak bisa berubah lagi).
   */
  static isFinal(status: OrderStatus): boolean {
    return (
      status === OrderStatus.COMPLETED ||
      status === OrderStatus.CANCELLED
    );
  }

  /**
   * Ambil daftar status yang boleh jadi berikutnya.
   */
  static getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return TRANSITIONS[currentStatus] ?? [];
  }
}
