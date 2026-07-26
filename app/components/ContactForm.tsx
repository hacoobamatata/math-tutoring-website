"use client";

import { FormEvent, useState } from "react";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [responseMessage, setResponseMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("submitting");
    setResponseMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const requestBody = {
      name: formData.get("name"),
      email: formData.get("email"),
      studentLevel: formData.get("studentLevel"),
      goals: formData.get("goals"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The request could not be sent.");
      }

      setStatus("success");
      setResponseMessage(
        data.message ?? "Your lesson request was sent successfully.",
      );

      form.reset();
    } catch (error) {
      setStatus("error");

      setResponseMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-slate-200"
        >
          Name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500"
          placeholder="Parent or student name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-200"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="studentLevel"
          className="block text-sm font-semibold text-slate-200"
        >
          Student level
        </label>

        <select
          id="studentLevel"
          name="studentLevel"
          required
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500"
        >
          <option value="" disabled>
            Select a level
          </option>
          <option value="Middle school">Middle school</option>
          <option value="High school">High school</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="goals"
          className="block text-sm font-semibold text-slate-200"
        >
          What would you like help with?
        </label>

        <select
          id="goals"
          name="goals"
          required
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500"
        >
          <option value="" disabled>
            Select a goal
          </option>
          <option value="Competition math">Competition math</option>
          <option value="AMC and AIME preparation">
            AMC / AIME preparation
          </option>
          <option value="School mathematics">School mathematics</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-semibold text-slate-200"
        >
          Additional details
        </label>

        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={5000}
          className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500"
          placeholder="Current experience, goals, preferred lesson times, or any questions..."
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting"
          ? "Sending..."
          : "Send Lesson Request"}
      </button>

      {responseMessage && (
        <p
          role="status"
          className={
            status === "success" ? "text-green-400" : "text-red-400"
          }
        >
          {responseMessage}
        </p>
      )}
    </form>
  );
}