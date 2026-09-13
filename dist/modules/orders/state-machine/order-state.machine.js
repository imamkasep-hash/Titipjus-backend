"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStateMachine = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["SEARCHING_DRIVER"] = "SEARCHING_DRIVER";
    OrderStatus["ACCEPTED_BY_DRIVER"] = "ACCEPTED_BY_DRIVER";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
class OrderStateMachine {
    constructor() {
        this.transitions = [
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
    }
    async canTransition(from, to, context) {
        const transition = this.transitions.find((t) => t.from === from && t.to === to);
        if (!transition)
            return false;
        if (transition.validate) {
            return await transition.validate(context);
        }
        return true;
    }
    async transition(order, to, context) {
        const canProceed = await this.canTransition(order.status, to, context);
        if (!canProceed) {
            throw new Error(`Invalid transition from ${order.status} to ${to}`);
        }
        order.status = to;
        order.updated_at = new Date();
    }
}
exports.OrderStateMachine = OrderStateMachine;
//# sourceMappingURL=order-state.machine.js.map