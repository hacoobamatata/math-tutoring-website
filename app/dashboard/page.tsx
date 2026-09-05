import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createTutoringSession, saveStudentProfile } from "./actions";

const errorMessages = {
  name: "Enter a preferred name between 1 and 80 characters.",
  grade: "Choose a grade level from 1 through 12, or leave it blank.",
  timezone: "Enter a valid time zone, such as America/Detroit.",
  goals: "Keep your learning goal under 1,000 characters.",
  forbidden: "You do not have permission to create tutoring sessions.",
  student: "Choose an existing student account.",
  start: "Enter a valid session start date and time.",
  sessionNotes: "Keep session notes under 2,000 characters.",
} as const;

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
    created?: string | string[];
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
      select: { id: true, role: true, studentProfile: true },
    }),
    searchParams,
  ]);

  if (appUser?.role === "TUTOR" || appUser?.role === "ADMIN") {
    const isAdmin = appUser.role === "ADMIN";
    const [students, sessions] = await Promise.all([
      prisma.appUser.findMany({
        where: { role: "STUDENT" },
        select: {
          id: true,
          studentProfile: {
            select: { preferredName: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tutoringSession.findMany({
        where: { createdById: appUser.id },
        select: {
          id: true,
          startsAt: true,
          notes: true,
          student: {
            select: {
              studentProfile: {
                select: { preferredName: true },
              },
            },
          },
        },
        orderBy: { startsAt: "asc" },
      }),
    ]);
    const errorCode = typeof query.error === "string" ? query.error : undefined;
    const errorMessage =
      errorCode && errorCode in errorMessages
        ? errorMessages[errorCode as keyof typeof errorMessages]
        : undefined;

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">
              {isAdmin ? "Tutor/admin dashboard" : "Tutor dashboard"}
            </h1>
            <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              {appUser.role}
            </span>
          </div>
          <p className="mt-4 text-slate-300">
            {isAdmin
              ? "You have tutor and administrator access."
              : "You have tutor access."}
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-200"
            >
              {errorMessage}
            </p>
          )}

          {query.created === "1" && (
            <p
              role="status"
              className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
            >
              Tutoring session created.
            </p>
          )}

          <section className="mt-10 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Create a session</h2>

            {students.length === 0 ? (
              <p className="mt-4 text-slate-400">
                No student profiles exist yet. A student will appear here after
                completing onboarding.
              </p>
            ) : (
              <form action={createTutoringSession} className="mt-6 space-y-6">
                <div>
                  <label htmlFor="studentId" className="block font-medium">
                    Student
                  </label>
                  <select
                    id="studentId"
                    name="studentId"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  >
                    <option value="" disabled>
                      Choose a student
                    </option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.studentProfile?.preferredName ?? "Student"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="startsAt" className="block font-medium">
                    Start time (UTC)
                  </label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    required
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    Times use UTC for this initial scheduling milestone.
                  </p>
                </div>

                <div>
                  <label htmlFor="sessionNotes" className="block font-medium">
                    Notes <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="sessionNotes"
                    name="notes"
                    rows={4}
                    maxLength={2000}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
                >
                  Create session
                </button>
              </form>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Sessions you created</h2>
            {sessions.length === 0 ? (
              <p className="mt-4 text-slate-400">No sessions created yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                  >
                    <p className="font-semibold">
                      {session.student.studentProfile?.preferredName ??
                        "Student"}
                    </p>
                    <p className="mt-1 text-slate-300">
                      {session.startsAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </p>
                    {session.notes && (
                      <p className="mt-3 whitespace-pre-wrap text-slate-400">
                        {session.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    );
  }

  const profile = appUser?.studentProfile;
  const errorCode = typeof query.error === "string" ? query.error : undefined;
  const errorMessage =
    errorCode && errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages]
      : undefined;
  const wasSaved = query.saved === "1";
  const sessions = appUser
    ? await prisma.tutoringSession.findMany({
        where: { studentId: appUser.id },
        select: { id: true, startsAt: true, notes: true },
        orderBy: { startsAt: "asc" },
      })
    : [];

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

        <section className="mt-12 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-semibold">Your tutoring sessions</h2>
          {sessions.length === 0 ? (
            <p className="mt-4 text-slate-400">
              You do not have any tutoring sessions yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                >
                  <p className="font-semibold">
                    {session.startsAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: profile?.timeZone ?? "UTC",
                    })}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {profile?.timeZone ?? "UTC"}
                  </p>
                  {session.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-slate-300">
                      {session.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
