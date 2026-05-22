import { prisma } from '@sealedbid/db';

prisma.tender.updateMany({ 
  where: { status: 'OPEN' }, 
  data: { submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } 
})
.then(console.log)
.catch(console.error)
.finally(() => prisma.$disconnect());
