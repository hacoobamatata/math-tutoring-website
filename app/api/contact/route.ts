import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type ContactRequest = {
  name?: unknown;
  email?: unknown;
  studentLevel?: unknown;
  goals?: unknown;
  message?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactRequest;

    const { name, email, studentLevel, goals, message } = body;

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(studentLevel) ||
      !isNonEmptyString(goals) ||
      !isNonEmptyString(message)
    ) {
      return NextResponse.json(
        { error: "Please complete every field." },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "The message is too long." },
        { status: 400 },
      );
    }

    const contactEmail = process.env.CONTACT_EMAIL;

    if (!contactEmail) {
      console.error("CONTACT_EMAIL is not configured.");

      return NextResponse.json(
        { error: "The contact form is not configured." },
        { status: 500 },
      );
    }

    const { error } = await resend.emails.send({
      from: "Jacob Xu Math <contact@jacobxumath.com>",
      to: contactEmail,
      replyTo: email,
      subject: `New tutoring request from ${name}`,
      html: `
        <h1>New Tutoring Request</h1>

        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Student level:</strong> ${escapeHtml(studentLevel)}</p>
        <p><strong>Goals:</strong> ${escapeHtml(goals)}</p>

        <h2>Message</h2>
        <p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        { error: "The email could not be sent." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Your lesson request was sent successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      { error: "Something went wrong while processing the request." },
      { status: 500 },
    );
  }
}