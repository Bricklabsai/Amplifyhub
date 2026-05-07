import { PrismaClient, Platform, PostStatus, CampaignStatus } from "../src/generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Plans
  const basicPlan = await prisma.plan.upsert({
    where: { name: "Basic" },
    update: {
      price: 0,
      description: "Free forever for individuals",
      postsPerMonth: 10,
      platforms: 2,
      aiTextLimit: 20,
      aiImageLimit: 5,
    },
    create: {
      name: "Basic",
      price: 0,
      description: "Free forever for individuals",
      features: [
        "2 social accounts",
        "10 posts/month",
        "20 AI text generations",
        "5 AI image generations",
        "Basic analytics",
      ],
      postsPerMonth: 10,
      platforms: 2,
      aiCredits: 0,
      aiTextLimit: 20,
      aiImageLimit: 5,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: "Pro" },
    update: {
      price: 29.99,
      description: "Perfect for growing brands",
      postsPerMonth: 100,
      platforms: 10,
      aiTextLimit: 200,
      aiImageLimit: 50,
    },
    create: {
      name: "Pro",
      price: 29.99,
      description: "Perfect for growing brands",
      features: [
        "10 social accounts",
        "100 posts/month",
        "200 AI text generations",
        "50 AI image generations",
        "Advanced analytics",
        "Priority support",
      ],
      postsPerMonth: 100,
      platforms: 10,
      aiCredits: 0,
      aiTextLimit: 200,
      aiImageLimit: 50,
    },
  });

  const corporatePlan = await prisma.plan.upsert({
    where: { name: "Corporate" },
    update: {
      price: 99.99,
      postsPerMonth: 999999,
      platforms: 999999,
      aiTextLimit: 999999,
      aiImageLimit: 999999,
    },
    create: {
      name: "Corporate",
      price: 99.99,
      description: "Enterprise-grade for large organizations",
      features: [
        "Unlimited social accounts",
        "Unlimited posts",
        "Unlimited AI text generations",
        "Unlimited AI image generations",
        "Full analytics suite",
        "White-label options",
        "API access",
        "Dedicated account manager",
        "24/7 priority support",
      ],
      postsPerMonth: 999999,
      platforms: 999999,
      aiCredits: 999999,
      aiTextLimit: 999999,
      aiImageLimit: 999999,
    },
  });

  console.log("✅ Plans created");

  // Create Admin User
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@amplifyhub.ai" },
    update: {},
    create: {
      email: "admin@amplifyhub.ai",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // Admin subscription
  await prisma.subscription.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      planId: corporatePlan.id,
      status: "ACTIVE",
    },
  });

  // Create Demo User
  const demoPassword = await bcrypt.hash("Demo@123456", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@amplifyhub.ai" },
    update: {},
    create: {
      email: "demo@amplifyhub.ai",
      name: "Demo User",
      password: demoPassword,
      role: "USER",
      emailVerified: new Date(),
    },
  });

  // Demo subscription
  await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      planId: corporatePlan.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ Users created");

  // Create Social Accounts for demo user
  const platforms: Platform[] = ["FACEBOOK", "INSTAGRAM", "TWITTER", "LINKEDIN", "YOUTUBE"];
  const followerCounts = [12500, 8900, 5400, 3200, 22000];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    await prisma.socialAccount.upsert({
      where: { userId_platform: { userId: demoUser.id, platform } },
      update: {},
      create: {
        userId: demoUser.id,
        platform,
        accountName: `demo_amplifyhub`,
        followers: followerCounts[i],
        isActive: true,
      },
    });
  }

  console.log("✅ Social accounts created");

  // Create sample posts
  const postContents = [
    "🚀 Excited to share our latest product update! Check out the new features that will transform your workflow. #productivity #innovation",
    "💡 Did you know? 73% of marketers say social media has been 'somewhat effective' or 'very effective' for their business. Are you leveraging it? #marketing",
    "🎯 Our team worked hard on this campaign and the results speak for themselves. 3x engagement, 2x conversions! #success #growth",
    "📊 Analytics update: This month we saw a 45% increase in organic reach. Here's what we changed... #analytics #socialmedia",
    "🌟 Customer spotlight: How @TechStartup used AmplifyHub to grow their following by 200% in 3 months! #casestudy",
  ];

  const statuses: PostStatus[] = ["PUBLISHED", "PUBLISHED", "SCHEDULED", "DRAFT", "PUBLISHED"];

  for (let i = 0; i < postContents.length; i++) {
    await prisma.post.create({
      data: {
        userId: demoUser.id,
        content: postContents[i],
        status: statuses[i],
        publishedAt: statuses[i] === "PUBLISHED" ? new Date(Date.now() - i * 86400000) : null,
        scheduledAt: statuses[i] === "SCHEDULED" ? new Date(Date.now() + 86400000) : null,
      },
    });
  }

  console.log("✅ Posts created");

  // Create Campaigns
  await prisma.campaign.createMany({
    data: [
      {
        userId: demoUser.id,
        name: "Q1 Product Launch",
        description: "Campaign for our Q1 product launch across all platforms",
        status: "ACTIVE",
        platforms: ["FACEBOOK", "INSTAGRAM", "TWITTER"],
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
        budget: 5000,
      },
      {
        userId: demoUser.id,
        name: "Summer Awareness Drive",
        description: "Brand awareness campaign for summer season",
        status: "DRAFT",
        platforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE"],
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-08-31"),
        budget: 3000,
      },
    ],
  });

  console.log("✅ Campaigns created");

  // Create Audience Groups
  const group1 = await prisma.audienceGroup.create({
    data: {
      userId: demoUser.id,
      name: "Newsletter Subscribers",
      description: "Main newsletter subscriber list",
      tags: ["newsletter", "subscribers"],
    },
  });

  const group2 = await prisma.audienceGroup.create({
    data: {
      userId: demoUser.id,
      name: "Premium Customers",
      description: "High-value customer segment",
      tags: ["premium", "vip"],
    },
  });

  // Create Contacts
  const contactData = [
    { email: "alice@example.com", firstName: "Alice", lastName: "Johnson", company: "TechCorp" },
    { email: "bob@example.com", firstName: "Bob", lastName: "Smith", company: "StartupXYZ" },
    { email: "carol@example.com", firstName: "Carol", lastName: "Davis", company: "MediaGroup" },
    { email: "dave@example.com", firstName: "Dave", lastName: "Wilson", company: "Enterprise Inc" },
    { email: "eve@example.com", firstName: "Eve", lastName: "Brown", company: "Creative Agency" },
  ];

  for (const c of contactData) {
    const contact = await prisma.contact.create({ data: c });
    await prisma.contactGroup.create({
      data: { contactId: contact.id, groupId: group1.id },
    });
  }

  console.log("✅ Contacts created");

  // Create Analytics data (last 30 days)
  const analyticsData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    analyticsData.push({
      userId: demoUser.id,
      date,
      followers: 45000 + Math.floor(Math.random() * 500),
      reach: 12000 + Math.floor(Math.random() * 3000),
      impressions: 25000 + Math.floor(Math.random() * 5000),
      engagement: 3.5 + Math.random() * 2,
      clicks: 800 + Math.floor(Math.random() * 400),
      shares: 120 + Math.floor(Math.random() * 80),
      likes: 1500 + Math.floor(Math.random() * 500),
      comments: 200 + Math.floor(Math.random() * 100),
    });
  }

  await prisma.analytics.createMany({ data: analyticsData });

  console.log("✅ Analytics data created");

  // Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        title: "Welcome to AmplifyHub!",
        message: "Get started by connecting your social accounts.",
        type: "info",
        read: false,
      },
      {
        userId: demoUser.id,
        title: "Post Published",
        message: "Your post 'Q1 Product Launch' was published successfully.",
        type: "success",
        read: false,
      },
      {
        userId: demoUser.id,
        title: "Campaign Started",
        message: "Your Q1 Product Launch campaign is now active.",
        type: "success",
        read: true,
      },
      {
        userId: demoUser.id,
        title: "AI Credits Running Low",
        message: "You have 15 AI credits remaining. Consider upgrading your plan.",
        type: "warning",
        read: false,
      },
    ],
  });

  console.log("✅ Notifications created");

  console.log("\n🎉 Seeding complete!");
  console.log("📧 Admin: admin@amplifyhub.ai / Admin@123456");
  console.log("📧 Demo:  demo@amplifyhub.ai  / Demo@123456");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });