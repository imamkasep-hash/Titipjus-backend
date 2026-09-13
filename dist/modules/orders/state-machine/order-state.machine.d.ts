export declare enum OrderStatus {
    PENDING_PAYMENT = "PENDING_PAYMENT",
    PAID = "PAID",
    SEARCHING_DRIVER = "SEARCHING_DRIVER",
    ACCEPTED_BY_DRIVER = "ACCEPTED_BY_DRIVER",
    PREPARING = "PREPARING",
    READY_FOR_PICKUP = "READY_FOR_PICKUP",
    PICKED_UP = "PICKED_UP",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class OrderStateMachine {
    private transitions;
    canTransition(from: OrderStatus, to: OrderStatus, context: any): Promise<boolean>;
    transition(order: any, to: OrderStatus, context: any): Promise<void>;
}
