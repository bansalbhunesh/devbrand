import Razorpay from "razorpay";
import { env } from "@devbrand/config";

export class RazorpayService {
  private instance: Razorpay | null = null;

  getInstance(): Razorpay {
    if (this.instance) return this.instance;
    this.instance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
    return this.instance;
  }
}
