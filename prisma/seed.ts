import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "file:./dev.db";

  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
  }

  return new PrismaClient();
}

const prisma = createPrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { phone: "+1000000001" },
    update: {},
    create: {
      name: "Admin",
      phone: "+1000000001",
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { phone: "+1000000002" },
    update: {},
    create: {
      name: "John Customer",
      phone: "+1000000002",
      role: "customer",
    },
  });

  const categories = [
    { name: "Burgers", slug: "burgers", description: "Juicy grilled burgers", sortOrder: 1 },
    { name: "Pizza", slug: "pizza", description: "Wood-fired artisan pizzas", sortOrder: 2 },
    { name: "Pasta", slug: "pasta", description: "Fresh homemade pasta", sortOrder: 3 },
    { name: "Salads", slug: "salads", description: "Fresh garden salads", sortOrder: 4 },
    { name: "Drinks", slug: "drinks", description: "Refreshing beverages", sortOrder: 5 },
    { name: "Desserts", slug: "desserts", description: "Sweet treats", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const burgerCategory = await prisma.category.findUnique({ where: { slug: "burgers" } });
  const pizzaCategory = await prisma.category.findUnique({ where: { slug: "pizza" } });
  const pastaCategory = await prisma.category.findUnique({ where: { slug: "pasta" } });
  const saladCategory = await prisma.category.findUnique({ where: { slug: "salads" } });
  const drinksCategory = await prisma.category.findUnique({ where: { slug: "drinks" } });
  const dessertsCategory = await prisma.category.findUnique({ where: { slug: "desserts" } });

  const menuItems = [
    { name: "Classic Burger", slug: "classic-burger", description: "Beef patty, lettuce, tomato, cheese, special sauce", price: 9.99, isFeatured: true, categoryId: burgerCategory!.id },
    { name: "Bacon Cheeseburger", slug: "bacon-cheeseburger", description: "Beef patty, crispy bacon, cheddar cheese, pickles", price: 11.99, isFeatured: true, categoryId: burgerCategory!.id },
    { name: "Mushroom Swiss Burger", slug: "mushroom-swiss", description: "Beef patty, sauteed mushrooms, Swiss cheese, garlic aioli", price: 12.49, categoryId: burgerCategory!.id },
    { name: "Veggie Burger", slug: "veggie-burger", description: "Plant-based patty, avocado, sprouts, vegan mayo", price: 10.99, categoryId: burgerCategory!.id },
    { name: "Margherita Pizza", slug: "margherita-pizza", description: "San Marzano tomatoes, fresh mozzarella, basil", price: 13.99, isFeatured: true, categoryId: pizzaCategory!.id },
    { name: "Pepperoni Pizza", slug: "pepperoni-pizza", description: "Classic pepperoni, mozzarella, marinara sauce", price: 14.99, categoryId: pizzaCategory!.id },
    { name: "BBQ Chicken Pizza", slug: "bbq-chicken-pizza", description: "Grilled chicken, BBQ sauce, red onion, cilantro", price: 15.99, categoryId: pizzaCategory!.id },
    { name: "Four Cheese Pizza", slug: "four-cheese-pizza", description: "Mozzarella, parmesan, gorgonzola, fontina", price: 15.49, categoryId: pizzaCategory!.id },
    { name: "Spaghetti Bolognese", slug: "spaghetti-bolognese", description: "House-made pasta, slow-cooked beef ragu, parmesan", price: 12.99, categoryId: pastaCategory!.id },
    { name: "Fettuccine Alfredo", slug: "fettuccine-alfredo", description: "Creamy parmesan sauce, garlic bread on side", price: 11.99, categoryId: pastaCategory!.id },
    { name: "Penne Arrabbiata", slug: "penne-arrabbiata", description: "Spicy tomato sauce, garlic, fresh chili", price: 11.49, categoryId: pastaCategory!.id },
    { name: "Caesar Salad", slug: "caesar-salad", description: "Romaine lettuce, croutons, parmesan, caesar dressing", price: 8.99, categoryId: saladCategory!.id },
    { name: "Greek Salad", slug: "greek-salad", description: "Cucumber, tomato, olives, feta, red onion, olive oil", price: 9.49, categoryId: saladCategory!.id },
    { name: "Cola", slug: "cola", description: "Classic cola soda", price: 2.49, categoryId: drinksCategory!.id },
    { name: "Fresh Lemonade", slug: "fresh-lemonade", description: "Freshly squeezed lemonade", price: 3.99, isFeatured: true, categoryId: drinksCategory!.id },
    { name: "Iced Tea", slug: "iced-tea", description: "Brewed iced tea, sweet or unsweetened", price: 2.99, categoryId: drinksCategory!.id },
    { name: "Chocolate Cake", slug: "chocolate-cake", description: "Rich chocolate layer cake with ganache", price: 6.99, isFeatured: true, categoryId: dessertsCategory!.id },
    { name: "Tiramisu", slug: "tiramisu", description: "Classic Italian tiramisu", price: 7.49, categoryId: dessertsCategory!.id },
    { name: "Cheesecake", slug: "cheesecake", description: "New York style cheesecake with berry compote", price: 6.49, categoryId: dessertsCategory!.id },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: {},
      create: item,
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
