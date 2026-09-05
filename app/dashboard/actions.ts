"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  const studentId = readText(formData, "studentId");
  const startsAtValue = readText(formData, "startsAt");
  const notes = readText(formData, "notes");

  if (!isUuid(studentId)) {
    redirect("/dashboard?error=student");
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAtValue)) {
    redirect("/dashboard?error=start");
  }

  const startsAt = new Date(`${startsAtValue}:00.000Z`);

  if (Number.isNaN(startsAt.getTime())) {
    redirect("/dashboard?error=start");
  }

  if (notes.length > 2000) {
    redirect("/dashboard?error=sessionNotes");
  }

  const student = await prisma.appUser.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true },
  });

  if (!student) {
    redirect("/dashboard?error=student");
  }

  await prisma.tutoringSession.create({
    data: {
      studentId: student.id,
      createdById: currentUser.id,
      startsAt,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?created=1");
}
