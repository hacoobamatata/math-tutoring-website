import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveStudentProfile } from "./actions";

const errorMessages = {
  name: "Enter a preferred name between 1 and 80 characters.",
  grade: "Choose a grade level from 1 through 12, or leave it blank.",
  timezone: "Enter a valid time zone, such as America/Detroit.",
  goals: "Keep your learning goal under 1,000 characters.",
} as const;

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const [appUser, query] = await Promise.all([
    prisma.appUser.findUnique({
      where: { clerkUserId },
      select: { studentProfile: true },
    }),
    searchParams,
  ]);
  const profile = appUser?.studentProfile;
  const errorCode = typeof query.error === "string" ? query.error : undefined;
  const errorMessage =
    errorCode && errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages]
      : undefined;
  const wasSaved = query.saved === "1";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-4xl font-bold">Student profile</h1>
        <p className="mt-4 text-slate-300">
          {profile
            ? "Your profile is saved. You can update it at any time."
            : "Tell us a little about yourself to finish setting up your account."}
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-200"
          >
            {errorMessage}
          </p>
        )}

        {wasSaved && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
          >
            Your profile has been saved.
          </p>
        )}

        <form action={saveStudentProfile} className="mt-8 space-y-6">
          <div>
            <label htmlFor="preferredName" className="block font-medium">
              Preferred name
            </label>
            <input
              id="preferredName"
              name="preferredName"
              type="text"
              required
              maxLength={80}
              defaultValue={profile?.preferredName ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label htmlFor="gradeLevel" className="block font-medium">
              Grade level
            </label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              defaultValue={profile?.gradeLevel?.toString() ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            >
              <option value="">Prefer not to say</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label htmlFor="timeZone" className="block font-medium">
              Time zone
            </label>
            <input
              id="timeZone"
              name="timeZone"
              type="text"
              required
              maxLength={100}
              placeholder="America/Detroit"
              defaultValue={profile?.timeZone ?? "America/Detroit"}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label htmlFor="goals" className="block font-medium">
              Learning goal <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="goals"
              name="goals"
              rows={5}
              maxLength={1000}
              defaultValue={profile?.goals ?? ""}
              placeholder="For example: prepare for MathCounts or improve proof-writing skills."
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
          >
            {profile ? "Update profile" : "Save profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
