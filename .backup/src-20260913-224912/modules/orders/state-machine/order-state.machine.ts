// src/modules/orders/state-machine/order-state.machine.ts
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

interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  validate?: (context: any) => boolean | Promise<boolean>;
}

export class OrderStateMachine {
  private transitions: Transition[] = [
    {
      from: OrderStatus.PENDING_PAYMENT,
      to: OrderStatus.PAID,
      validate: (ctx) => ctx.paymentVerified === true,
    },
    {
      from: OrderStatus.PAID,
      to: OrderStatus.SEARCHING_DRIVER,
      validate: (ctx) => ctx.merchantIsOpen === true,
    },
    {
      from: OrderStatus.SEARCHING_DRIVER,
      to: OrderStatus.ACCEPTED_BY_DRIVER,
      validate: (ctx) => ctx.driverValid === true,
    },
    {
      from: OrderStatus.ACCEPTED_BY_DRIVER,
      to: OrderStatus.PREPARING,
      validate: (ctx) => ctx.isMerchantOwner === true,
    },
    {
      from: OrderStatus.PREPARING,
      to: OrderStatus.READY_FOR_PICKUP,
      validate: (ctx) => ctx.isMerchantOwner === true,
    },
    {
      from: OrderStatus.READY_FOR_PICKUP,
      to: OrderStatus.PICKED_UP,
      validate: (ctx) => ctx.driverNearMerchant === true,
    },
    {
      from: OrderStatus.PICKED_UP,
      to: OrderStatus.COMPLETED,
      validate: (ctx) => ctx.driverNearConsumer === true,
    },
  ];

  async canTransition(from: OrderStatus, to: OrderStatus, context: any): Promise<boolean> {
    const transition = this.transitions.find(
      (t) => t.from === from && t.to === to
    );
    
    if (!transition) return false;
    if (transition.validate) {
      return await transition.validate(context);
    }
    return true;
  }

  async transition(order: any, to: OrderStatus, context: any): Promise<void> {
    const canProceed = await this.canTransition(order.status, to, context);
    
    if (!canProceed) {
      throw new Error(
        `Invalid transition from ${order.status} to ${to}`
      );
    }
    
    order.status = to;
    order.updated_at = new Date();
  }
}
