import { ENV } from "../config/env.js";
import { resend } from "../config/resend.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  lastName: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const sendEmailSafe = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> => {
  if (!resend) {
    console.warn(
      `[Email] RESEND_API_KEY is not configured. Skipping "${subject}" email to ${to}.`,
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: ENV.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(
        `[Email] Resend failed to send "${subject}" to ${to}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `[Email] Unexpected error sending "${subject}" to ${to}:`,
      error,
    );
  }
};

interface BookingEmailParams {
  to: string;
  firstName: string;
  eventName: string;
  startTime: Date | null;
  location: string | null;
  seatsBooked: number;
  totalPrice: number;
  bookingId: string;
}

const bookingDetailsHtml = (p: BookingEmailParams): string => `
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Event</strong></td><td>${escapeHtml(p.eventName)}</td></tr>
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Date</strong></td><td>${p.startTime ? escapeHtml(p.startTime.toUTCString()) : "TBA"}</td></tr>
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Location</strong></td><td>${p.location ? escapeHtml(p.location) : "TBA"}</td></tr>
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Seats</strong></td><td>${p.seatsBooked}</td></tr>
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Total</strong></td><td>${p.totalPrice}</td></tr>
    <tr><td style="padding: 4px 16px 4px 0;"><strong>Booking ID</strong></td><td>${escapeHtml(p.bookingId)}</td></tr>
  </table>
`;

export const sendBookingConfirmationEmail = async (
  params: BookingEmailParams,
): Promise<void> => {
  await sendEmailSafe({
    to: params.to,
    subject: `Booking confirmed: ${params.eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Your booking is confirmed, ${escapeHtml(params.firstName)}!</h2>
        <p>Here are your ticket details:</p>
        ${bookingDetailsHtml(params)}
        <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">— Event &amp; Ticket Booking Team</p>
      </div>
    `,
  });
};

export const sendBookingCancellationEmail = async (
  params: BookingEmailParams,
): Promise<void> => {
  await sendEmailSafe({
    to: params.to,
    subject: `Booking canceled: ${params.eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Your booking has been canceled, ${escapeHtml(params.firstName)}</h2>
        <p>The following reservation was canceled and your seats were released:</p>
        ${bookingDetailsHtml(params)}
        <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">— Event &amp; Ticket Booking Team</p>
      </div>
    `,
  });
};

export const sendWelcomeEmail = async ({
  to,
  firstName,
  lastName,
}: WelcomeEmailParams): Promise<void> => {
  const fullName = escapeHtml(`${firstName} ${lastName}`.trim());

  await sendEmailSafe({
    to,
    subject: "Welcome to Event & Ticket Booking Platform!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Welcome, ${fullName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now discover live events, reserve tickets, and manage your bookings anytime.</p>
        <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
          — Event &amp; Ticket Booking Team
        </p>
      </div>
    `,
  });
};
