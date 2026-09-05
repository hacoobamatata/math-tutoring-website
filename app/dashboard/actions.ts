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
