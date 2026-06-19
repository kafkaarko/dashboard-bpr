const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
  // Create a new user with a post
  const user = await prisma.user.create({
    data:{
        name:"kafka arko",
        email:"kafka@bpr.com",
        password: await bcrypt.hash("kafka1234",10)
    }
  })
   
  console.log("Created user:", user);

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