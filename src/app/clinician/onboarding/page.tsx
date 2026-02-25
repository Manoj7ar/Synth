import { redirect } from 'next/navigation'
import { ClinicianOnboardingForm } from '@/components/clinician/ClinicianOnboardingForm'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ClinicianOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>
}) {
  const { user } = await requireClinicianPage({ requireOnboarding: false })
  const resolvedSearchParams = await searchParams
  const isEditMode = asSingle(resolvedSearchParams.edit) === '1'

  if (user.onboardingComplete && !isEditMode) {
    redirect('/clinician')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 10%, rgba(255,255,255,.7), transparent 46%), radial-gradient(circle at 82% 86%, rgba(238,224,197,.72), transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,.72), transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='%2368573f' fill-opacity='0.35'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='168' cy='18' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='154' cy='144' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 md:px-6">
        <div className="w-full max-w-3xl rounded-3xl border border-[#eadfcd] bg-white/75 p-6 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Synth / {isEditMode ? 'Profile' : 'Onboarding'}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">
              {isEditMode ? 'Update your clinician profile' : 'Set up your clinician profile'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              {isEditMode
                ? 'Keep your name, specialty, and practice details current so they appear correctly across workflows and generated documents.'
                : 'Answer a few quick questions so Synth can personalize the workspace and use your real clinician details in documentation outputs.'}
            </p>
          </div>

          <ClinicianOnboardingForm
            initialName={user.name ?? ''}
            initialPracticeName={user.practiceName ?? ''}
            initialSpecialty={user.specialty ?? ''}
            isEditMode={isEditMode}
          />
        </div>
      </main>
    </div>
  )
}

