declare module "paynow" {
  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string): any;
    send(payment: any): Promise<{ success: boolean; error?: string; redirectUrl?: string; pollUrl?: string }>;
    pollTransaction(pollUrl: string): Promise<any>;
  }
}
