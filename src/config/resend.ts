import { Resend } from "resend";
import { ENV } from "./env.js";

export const resend = ENV.RESEND_API_KEY
  ? new Resend(ENV.RESEND_API_KEY)
  : null;
