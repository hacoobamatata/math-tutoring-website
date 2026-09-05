"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const STAFF_TIME_ZONE = "America/Detroit";
const staffDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STAFF_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getStaffLocalDateTime(date: Date): LocalDateTime {
  const parts = new Map(
    staffDateTimeFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(parts.get("year")),
    month: Number(parts.get("month")),
    day: Number(parts.get("day")),
    hour: Number(parts.get("hour")),
    minute: Number(parts.get("minute")),
  };
}

function matchesLocalDateTime(left: LocalDateTime, right: LocalDateTime) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function readStaffDateTime(
  formData: FormData,
  name: string,
  errorCode: string,
) {
  const value = readText(formData, name);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    redirect(`/dashboard?error=${errorCode}`);
  }

  const localDateTime = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const wallClockMilliseconds = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    localDateTime.hour,
    localDateTime.minute,
  );
  const normalized = new Date(wallClockMilliseconds);

  if (
    normalized.getUTCFullYear() !== localDateTime.year ||
    normalized.getUTCMonth() + 1 !== localDateTime.month ||
    normalized.getUTCDate() !== localDateTime.day ||
    normalized.getUTCHours() !== localDateTime.hour ||
    normalized.getUTCMinutes() !== localDateTime.minute
  ) {
    redirect(`/dashboard?error=${errorCode}`);
  }

  const possibleOffsets = new Set<number>();

  for (const hoursFromWallClock of [-36, -24, -12, 0, 12, 24, 36]) {
    const instant = new Date(
      wallClockMilliseconds + hoursFromWallClock * 60 * 60 * 1000,
    );
    const local = getStaffLocalDateTime(instant);
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
    );

    possibleOffsets.add(localAsUtc - instant.getTime());
  }

  const matchingInstants = [...possibleOffsets]
    .map((offset) => new Date(wallClockMilliseconds - offset))
    .filter((instant) =>
      matchesLocalDateTime(getStaffLocalDateTime(instant), localDateTime),
    )
    .sort((left, right) => left.getTime() - right.getTime());

  if (matchingInstants.length === 0) {
    redirect(`/dashboard?error=${errorCode}`);
  }

  // During the repeated fall-back hour, use the earlier occurrence.
  return matchingInstants[0];
}

function hasPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function requireStaffUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.appUser.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  });

  if (
    !currentUser ||
    (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN")
  ) {
    redirect("/dashboard?error=forbidden");
  }

  return currentUser;
}

function readSessionInput(formData: FormData) {
  const studentId = readText(formData, "studentId");
  const startsAt = readStaffDateTime(formData, "startsAt", "start");
  const notes = readText(formData, "notes");

  if (!isUuid(studentId)) {
    redirect("/dashboard?error=student");
  }

  if (notes.length > 2000) {
    redirect("/dashboard?error=sessionNotes");
  }

  return { studentId, startsAt, notes: notes || null };
}

function readAvailabilitySlotInput(formData: FormData) {
  const startsAt = readStaffDateTime(
    formData,
    "slotStartsAt",
    "slotTime",
  );
  const endsAt = readStaffDateTime(formData, "slotEndsAt", "slotTime");

  if (startsAt <= new Date() || endsAt <= startsAt) {
    redirect("/dashboard?error=slotTime");
  }

  return { startsAt, endsAt };
}

export async function saveStudentProfile(formData: FormData) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const preferredName = readText(formData, "preferredName");
  const gradeLevelValue = readText(formData, "gradeLevel");
  const timeZone = readText(formData, "timeZone");
  const goals = readText(formData, "goals");
  const gradeLevel = gradeLevelValue === "" ? null : Number(gradeLevelValue);

  if (preferredName.length === 0 || preferredName.length > 80) {
    redirect("/dashboard?error=name");
  }

  if (
    gradeLevel !== null &&
    (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12)
  ) {
    redirect("/dashboard?error=grade");
  }

  if (
    timeZone.length === 0 ||
    timeZone.length > 100 ||
    !isValidTimeZone(timeZone)
  ) {
    redirect("/dashboard?error=timezone");
  }

  if (goals.length > 1000) {
    redirect("/dashboard?error=goals");
  }

  const existingUser = await prisma.appUser.findUnique({
    where: { clerkUserId },
    select: { role: true },
  });

  if (existingUser && existingUser.role !== "STUDENT") {
    redirect("/dashboard");
  }

  const profile = {
    preferredName,
    gradeLevel,
    timeZone,
    goals: goals || null,
  };

  await prisma.appUser.upsert({
    where: { clerkUserId },
    update: {
      studentProfile: {
        upsert: {
          create: profile,
          update: profile,
        },
      },
    },
    create: {
      clerkUserId,
      studentProfile: {
        create: profile,
      },
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?saved=1");
}

export async function createTutoringSession(formData: FormData) {
  const currentUser = await requireStaffUser();
  const sessionInput = readSessionInput(formData);

  const student = await prisma.appUser.findFirst({
    where: { id: sessionInput.studentId, role: "STUDENT" },
    select: { id: true },
  });

  if (!student) {
    redirect("/dashboard?error=student");
  }

  await prisma.tutoringSession.create({
    data: {
      studentId: student.id,
      createdById: currentUser.id,
      startsAt: sessionInput.startsAt,
      notes: sessionInput.notes,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?created=1");
}

export async function createAvailabilitySlot(formData: FormData) {
  const currentUser = await requireStaffUser();
  const { startsAt, endsAt } = readAvailabilitySlotInput(formData);

  let created = false;

  try {
    created = await prisma.$transaction(
      async (transaction) => {
        const [overlappingSlot, sessionDuringSlot] = await Promise.all([
          transaction.availabilitySlot.findFirst({
            where: {
              createdById: currentUser.id,
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
            select: { id: true },
          }),
          transaction.tutoringSession.findFirst({
            where: {
              createdById: currentUser.id,
              startsAt: { gte: startsAt, lt: endsAt },
            },
            select: { id: true },
          }),
        ]);

        if (overlappingSlot || sessionDuringSlot) {
          return false;
        }

        await transaction.availabilitySlot.create({
          data: {
            createdById: currentUser.id,
            startsAt,
            endsAt,
          },
        });

        return true;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (!hasPrismaErrorCode(error, "P2034")) {
      throw error;
    }
  }

  if (!created) {
    redirect("/dashboard?error=slotConflict");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?slotCreated=1");
}

export async function updateAvailabilitySlot(formData: FormData) {
  const currentUser = await requireStaffUser();
  const slotId = readText(formData, "slotId");

  if (!isUuid(slotId)) {
    redirect("/dashboard?error=slot");
  }

  const { startsAt, endsAt } = readAvailabilitySlotInput(formData);
  let result: "updated" | "conflict" | "unavailable" = "unavailable";

  try {
    result = await prisma.$transaction(
      async (transaction) => {
        const slot = await transaction.availabilitySlot.findFirst({
          where: {
            id: slotId,
            createdById: currentUser.id,
            booking: { is: null },
          },
          select: { id: true },
        });

        if (!slot) {
          return "unavailable" as const;
        }

        const [overlappingSlot, sessionDuringSlot] = await Promise.all([
          transaction.availabilitySlot.findFirst({
            where: {
              id: { not: slot.id },
              createdById: currentUser.id,
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
            select: { id: true },
          }),
          transaction.tutoringSession.findFirst({
            where: {
              createdById: currentUser.id,
              startsAt: { gte: startsAt, lt: endsAt },
            },
            select: { id: true },
          }),
        ]);

        if (overlappingSlot || sessionDuringSlot) {
          return "conflict" as const;
        }

        const update = await transaction.availabilitySlot.updateMany({
          where: {
            id: slot.id,
            createdById: currentUser.id,
            booking: { is: null },
          },
          data: { startsAt, endsAt },
        });

        return update.count === 1 ? "updated" : "unavailable";
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (!hasPrismaErrorCode(error, "P2034")) {
      throw error;
    }

    result = "conflict";
  }

  if (result === "unavailable") {
    redirect("/dashboard?error=slot");
  }

  if (result === "conflict") {
    redirect("/dashboard?error=slotConflict");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?slotUpdated=1");
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const currentUser = await requireStaffUser();
  const slotId = readText(formData, "slotId");

  if (!isUuid(slotId)) {
    redirect("/dashboard?error=slot");
  }

  let deleted = false;

  try {
    deleted = await prisma.$transaction(
      async (transaction) => {
        const slot = await transaction.availabilitySlot.findFirst({
          where: {
            id: slotId,
            createdById: currentUser.id,
            booking: { is: null },
          },
          select: { id: true },
        });

        if (!slot) {
          return false;
        }

        const result = await transaction.availabilitySlot.deleteMany({
          where: {
            id: slot.id,
            createdById: currentUser.id,
            booking: { is: null },
          },
        });

        return result.count === 1;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (!hasPrismaErrorCode(error, "P2034")) {
      throw error;
    }
  }

  if (!deleted) {
    redirect("/dashboard?error=slot");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?slotDeleted=1");
}

export async function bookAvailabilitySlot(formData: FormData) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.appUser.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  });

  if (!currentUser || currentUser.role !== "STUDENT") {
    redirect("/dashboard?error=studentOnly");
  }

  const slotId = readText(formData, "slotId");

  if (!isUuid(slotId)) {
    redirect("/dashboard?error=slotUnavailable");
  }

  let booked = false;

  try {
    booked = await prisma.$transaction(
      async (transaction) => {
        const slot = await transaction.availabilitySlot.findFirst({
          where: {
            id: slotId,
            startsAt: { gt: new Date() },
            booking: { is: null },
            createdBy: {
              is: { role: { in: ["TUTOR", "ADMIN"] } },
            },
          },
          select: {
            id: true,
            createdById: true,
            startsAt: true,
            endsAt: true,
          },
        });

        if (!slot) {
          return false;
        }

        const [overlappingSlot, sessionDuringSlot] = await Promise.all([
          transaction.availabilitySlot.findFirst({
            where: {
              id: { not: slot.id },
              createdById: slot.createdById,
              startsAt: { lt: slot.endsAt },
              endsAt: { gt: slot.startsAt },
            },
            select: { id: true },
          }),
          transaction.tutoringSession.findFirst({
            where: {
              createdById: slot.createdById,
              startsAt: { gte: slot.startsAt, lt: slot.endsAt },
            },
            select: { id: true },
          }),
        ]);

        if (overlappingSlot || sessionDuringSlot) {
          return false;
        }

        await transaction.tutoringSession.create({
          data: {
            studentId: currentUser.id,
            createdById: slot.createdById,
            availabilitySlotId: slot.id,
            startsAt: slot.startsAt,
          },
        });

        return true;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      !hasPrismaErrorCode(error, "P2002") &&
      !hasPrismaErrorCode(error, "P2034")
    ) {
      throw error;
    }
  }

  if (!booked) {
    redirect("/dashboard?error=slotUnavailable");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?booked=1");
}

export async function updateTutoringSession(formData: FormData) {
  const currentUser = await requireStaffUser();
  const sessionId = readText(formData, "sessionId");

  if (!isUuid(sessionId)) {
    redirect("/dashboard?error=session");
  }

  const sessionInput = readSessionInput(formData);
  const [session, student] = await Promise.all([
    prisma.tutoringSession.findFirst({
      where: { id: sessionId, createdById: currentUser.id },
      select: { id: true },
    }),
    prisma.appUser.findFirst({
      where: { id: sessionInput.studentId, role: "STUDENT" },
      select: { id: true },
    }),
  ]);

  if (!session) {
    redirect("/dashboard?error=session");
  }

  if (!student) {
    redirect("/dashboard?error=student");
  }

  const result = await prisma.tutoringSession.updateMany({
    where: { id: session.id, createdById: currentUser.id },
    data: {
      studentId: student.id,
      startsAt: sessionInput.startsAt,
      notes: sessionInput.notes,
    },
  });

  if (result.count !== 1) {
    redirect("/dashboard?error=session");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?updated=1");
}

export async function deleteTutoringSession(formData: FormData) {
  const currentUser = await requireStaffUser();
  const sessionId = readText(formData, "sessionId");

  if (!isUuid(sessionId)) {
    redirect("/dashboard?error=session");
  }

  const session = await prisma.tutoringSession.findFirst({
    where: { id: sessionId, createdById: currentUser.id },
    select: { id: true },
  });

  if (!session) {
    redirect("/dashboard?error=session");
  }

  const result = await prisma.tutoringSession.deleteMany({
    where: { id: session.id, createdById: currentUser.id },
  });

  if (result.count !== 1) {
    redirect("/dashboard?error=session");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}
