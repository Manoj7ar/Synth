import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ensureSarahDemoSoapNoteForClinician } from '../src/lib/demo/sarah-soap-note'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const clinicianPassword = await bcrypt.hash('synth2025', 10)
  const clinician = await prisma.user.upsert({
    where: { email: 'admin@synth.health' },
    update: {},
    create: {
      email: 'admin@synth.health',
      passwordHash: clinicianPassword,
      role: 'clinician',
      name: 'Dr. Sarah Chen'
    }
  })
  console.log('Created clinician:', clinician.email)

  await ensureSarahDemoSoapNoteForClinician(prisma, clinician.id)
  console.log('Ensured Sarah demo SOAP note for clinician walkthrough')

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
