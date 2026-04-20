import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

async function checkUser() {
  try {
    const email = "demo@amplifyhub.ai";
    const password = "Demo@123456";
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword },
      create: {
        email,
        name: "Demo User",
        password: hashedPassword,
        role: "USER",
      },
    });
    
    console.log("User updated/created:", { id: user.id, email: user.email });
    
    // Test comparison
    const isValid = await bcrypt.compare(password, user.password!);
    console.log("Password comparison test:", isValid);

  } catch (error) {
    console.error("Error checking/updating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
