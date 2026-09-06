import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  bookAvailabilitySlot,
  cancelBookedTutoringSession,
  createAvailabilitySlot,
  createTutoringSession,
  deleteAvailabilitySlot,
  deleteTutoringSession,
  saveStudentProfile,
  updateAvailabilitySlot,
  updateTutoringSession,
} from "./actions";

const staffTimeZone = "America/Detroit";
const staffDateTimeInputFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: staffTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatStaffDateTimeInput(date: Date) {
  const parts = new Map(
    staffDateTimeInputFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}T${parts.get("hour")}:${parts.get("minute")}`;
}

const errorMessages = {
  name: "Enter a preferred name between 1 and 80 characters.",
  grade: "Choose a grade level from 1 through 12, or leave it blank.",
  timezone: "Enter a valid time zone, such as America/Detroit.",
  goals: "Keep your learning goal under 1,000 characters.",
  forbidden: "You do not have permission to create tutoring sessions.",
  student: "Choose an existing student account.",
  start:
    "Enter a valid America/Detroit session time. Times skipped during the daylight-saving transition are not valid.",
  sessionNotes: "Keep session notes under 2,000 characters.",
  session: "That session was not found or was created by another staff user.",
  slotTime:
    "Enter valid future America/Detroit times with an end after the start. Times skipped during the daylight-saving transition are not valid.",
  slotConflict:
    "That time conflicts with another availability slot or tutoring session on your schedule.",
  slot:
    "That availability slot was not found, is booked, or belongs to another staff user.",
  slotUnavailable: "That availability slot is no longer open.",
  studentOnly:
    "Only a student account can book availability or cancel a booked session.",
  cancellation:
    "That session cannot be cancelled because it was not found, is not yours, is not upcoming, or was not booked from availability.",
} as const;

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
    created?: string | string[];
    updated?: string | string[];
    deleted?: string | string[];
    slotCreated?: string | string[];
    slotUpdated?: string | string[];
    slotDeleted?: string | string[];
    booked?: string | string[];
    cancelled?: string | string[];
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
    const [students, sessions, availabilitySlots] = await Promise.all([
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
          studentId: true,
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
      prisma.availabilitySlot.findMany({
        where: { createdById: appUser.id },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          booking: {
            select: {
              student: {
                select: {
                  studentProfile: {
                    select: { preferredName: true },
                  },
                },
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
    const successMessage =
      query.slotCreated === "1"
        ? "Availability slot created."
        : query.slotUpdated === "1"
          ? "Availability slot updated."
          : query.slotDeleted === "1"
            ? "Availability slot deleted."
            : query.created === "1"
              ? "Tutoring session created."
              : query.updated === "1"
                ? "Tutoring session updated."
                : query.deleted === "1"
                  ? "Tutoring session deleted."
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

          {successMessage && (
            <p
              role="status"
              className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
            >
              {successMessage}
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
                    Start time (America/Detroit)
                  </label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    required
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    This time automatically follows Detroit&apos;s EST/EDT
                    daylight-saving rules.
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

          <section className="mt-10 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">
              Create an availability slot
            </h2>
            <form action={createAvailabilitySlot} className="mt-6 space-y-6">
              <div>
                <label htmlFor="slotStartsAt" className="block font-medium">
                  Start time (America/Detroit)
                </label>
                <input
                  id="slotStartsAt"
                  name="slotStartsAt"
                  type="datetime-local"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label htmlFor="slotEndsAt" className="block font-medium">
                  End time (America/Detroit)
                </label>
                <input
                  id="slotEndsAt"
                  name="slotEndsAt"
                  type="datetime-local"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </div>

              <p className="text-sm text-slate-400">
                These times automatically follow Detroit&apos;s EST/EDT
                daylight-saving rules.
              </p>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
              >
                Create slot
              </button>
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">
              Availability slots you created
            </h2>
            {availabilitySlots.length === 0 ? (
              <p className="mt-4 text-slate-400">
                No availability slots created yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {availabilitySlots.map((slot) => (
                  <li
                    key={slot.id}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">
                        {slot.startsAt.toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: staffTimeZone,
                          timeZoneName: "short",
                        })}
                        {" – "}
                        {slot.endsAt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: staffTimeZone,
                          timeZoneName: "short",
                        })}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          slot.booking
                            ? "bg-slate-700 text-slate-200"
                            : "bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {slot.booking ? "Booked" : "Open"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {staffTimeZone}
                      {slot.booking
                        ? ` · Booked by ${slot.booking.student.studentProfile?.preferredName ?? "Student"}`
                        : ""}
                    </p>

                    {slot.booking ? (
                      <p className="mt-4 text-sm text-slate-400">
                        Booked slots are read-only.
                      </p>
                    ) : (
                      <>
                        <form
                          action={updateAvailabilitySlot}
                          className="mt-5 space-y-4 border-t border-slate-800 pt-5"
                        >
                          <input
                            type="hidden"
                            name="slotId"
                            value={slot.id}
                          />

                          <div>
                            <label
                              htmlFor={`slot-start-${slot.id}`}
                              className="block font-medium"
                            >
                              Start time (America/Detroit)
                            </label>
                            <input
                              id={`slot-start-${slot.id}`}
                              name="slotStartsAt"
                              type="datetime-local"
                              required
                              defaultValue={formatStaffDateTimeInput(
                                slot.startsAt,
                              )}
                              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`slot-end-${slot.id}`}
                              className="block font-medium"
                            >
                              End time (America/Detroit)
                            </label>
                            <input
                              id={`slot-end-${slot.id}`}
                              name="slotEndsAt"
                              type="datetime-local"
                              required
                              defaultValue={formatStaffDateTimeInput(
                                slot.endsAt,
                              )}
                              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                            />
                          </div>

                          <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-500"
                          >
                            Save slot
                          </button>
                        </form>

                        <form
                          action={deleteAvailabilitySlot}
                          className="mt-4 border-t border-slate-800 pt-4"
                        >
                          <input
                            type="hidden"
                            name="slotId"
                            value={slot.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-red-800 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-950"
                          >
                            Delete slot
                          </button>
                        </form>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Sessions you created</h2>
            {sessions.length === 0 ? (
              <p className="mt-4 text-slate-400">No sessions created yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {sessions.map((session) => {
                  const studentIsEligible = students.some(
                    (student) => student.id === session.studentId,
                  );

                  return (
                    <li
                      key={session.id}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-5"
                    >
                      <p className="font-semibold">
                        {session.student.studentProfile?.preferredName ??
                          "Student"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Created session · editable in America/Detroit
                      </p>

                      <form
                        action={updateTutoringSession}
                        className="mt-5 space-y-4"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />

                        <div>
                          <label
                            htmlFor={`student-${session.id}`}
                            className="block font-medium"
                          >
                            Student
                          </label>
                          <select
                            id={`student-${session.id}`}
                            name="studentId"
                            required
                            defaultValue={session.studentId}
                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                          >
                            {!studentIsEligible && (
                              <option value={session.studentId} disabled>
                                Current student is no longer eligible
                              </option>
                            )}
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.studentProfile?.preferredName ??
                                  "Student"}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`starts-at-${session.id}`}
                            className="block font-medium"
                          >
                            Start time (America/Detroit)
                          </label>
                          <input
                            id={`starts-at-${session.id}`}
                            name="startsAt"
                            type="datetime-local"
                            required
                            defaultValue={formatStaffDateTimeInput(
                              session.startsAt,
                            )}
                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`notes-${session.id}`}
                            className="block font-medium"
                          >
                            Notes
                          </label>
                          <textarea
                            id={`notes-${session.id}`}
                            name="notes"
                            rows={4}
                            maxLength={2000}
                            defaultValue={session.notes ?? ""}
                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={students.length === 0}
                          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save changes
                        </button>
                      </form>

                      <form
                        action={deleteTutoringSession}
                        className="mt-4 border-t border-slate-800 pt-4"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-800 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-950"
                        >
                          Delete session
                        </button>
                      </form>
                    </li>
                  );
                })}
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
  const wasBooked = query.booked === "1";
  const wasCancelled = query.cancelled === "1";
  const now = new Date();
  const [sessions, availabilitySlots] = await Promise.all([
    appUser
      ? prisma.tutoringSession.findMany({
          where: { studentId: appUser.id },
          select: {
            id: true,
            availabilitySlotId: true,
            startsAt: true,
            notes: true,
          },
          orderBy: { startsAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.availabilitySlot.findMany({
      where: {
        startsAt: { gt: now },
        booking: { is: null },
        createdBy: {
          is: { role: { in: ["TUTOR", "ADMIN"] } },
        },
      },
      select: { id: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

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

        {wasBooked && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
          >
            Your tutoring session has been booked.
          </p>
        )}

        {wasCancelled && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
          >
            Your tutoring session has been cancelled and the slot is open
            again.
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
          <h2 className="text-2xl font-semibold">Open availability</h2>
          {!appUser && (
            <p className="mt-4 text-slate-400">
              Save your student profile before booking a slot.
            </p>
          )}
          {availabilitySlots.length === 0 ? (
            <p className="mt-4 text-slate-400">
              There are no open future slots right now.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {availabilitySlots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
                >
                  <div>
                    <p className="font-semibold">
                      {slot.startsAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: profile?.timeZone ?? "UTC",
                      })}
                      {" – "}
                      {slot.endsAt.toLocaleTimeString("en-US", {
                        timeStyle: "short",
                        timeZone: profile?.timeZone ?? "UTC",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {profile?.timeZone ?? "UTC"}
                    </p>
                  </div>
                  <form action={bookAvailabilitySlot}>
                    <input type="hidden" name="slotId" value={slot.id} />
                    <button
                      type="submit"
                      disabled={!appUser}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Book slot
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

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
                  {session.availabilitySlotId && session.startsAt > now && (
                    <form
                      action={cancelBookedTutoringSession}
                      className="mt-4 border-t border-slate-800 pt-4"
                    >
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-800 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-950"
                      >
                        Cancel session
                      </button>
                    </form>
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
