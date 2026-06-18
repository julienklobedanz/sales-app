'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import {
  OnboardingShell,
  type OnboardingTransition,
} from './components/onboarding-shell'
import { WorkspaceStep, type WorkspaceStepValue } from './steps/workspace-step'
import { CrmConnectStep } from './steps/crm-connect-step'
import { TeamStep, type TeamInviteRow, createDefaultInviteRows, normalizeTeamInvitesOnBack } from './steps/team-step'
import { finalizeWorkspaceAndProfile, sendTeamInvites } from './wizard-actions'
import {
  ONBOARDING_BRAND_META,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_META,
} from './onboarding-steps'
import {
  guessCompanyFromEmail,
  joinFullName,
  splitFullName,
} from './onboarding-utils'
import { ROUTES } from '@/lib/routes'
import { humanizeTeamInviteEmailError } from '@/lib/email/team-invite-email'
import { COPY } from '@/lib/copy'

const TRANSITION_MS = 480
const COMPLETE_MS = 520

export function OnboardingWizard({
  inviteToken,
  inviteOrganizationName,
  initialFullName,
  userEmail,
  hubspotConfigured,
  hasOrganization,
}: {
  inviteToken: string | null
  inviteOrganizationName: string | null
  initialFullName: string
  userEmail: string
  hubspotConfigured: boolean
  hasOrganization: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInvite = Boolean(inviteToken && inviteOrganizationName)

  const nameParts = splitFullName(initialFullName)
  const guessedCompany = guessCompanyFromEmail(userEmail)

  const [step, setStep] = React.useState(hasOrganization ? 1 : 0)
  const [workspaceCompleted, setWorkspaceCompleted] = React.useState(hasOrganization)
  const [transition, setTransition] = React.useState<OnboardingTransition>('idle')
  const transitioningRef = React.useRef(false)

  const [workspace, setWorkspace] = React.useState<WorkspaceStepValue>({
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: userEmail,
    organizationName: inviteOrganizationName ?? guessedCompany,
  })

  const [invites, setInvites] = React.useState<TeamInviteRow[]>(() => createDefaultInviteRows())
  const [sending, setSending] = React.useState(false)
  const [savingWorkspace, setSavingWorkspace] = React.useState(false)

  const stepMeta = ONBOARDING_STEP_META[step] ?? ONBOARDING_STEP_META[0]
  const brandMeta = ONBOARDING_BRAND_META[step] ?? ONBOARDING_BRAND_META[0]

  React.useEffect(() => {
    const connected = searchParams.get('crm_connected')
    const provider = searchParams.get('crm_provider')
    if (connected === 'success' && provider === 'hubspot') {
      toast.success('HubSpot erfolgreich verbunden.')
      if (workspaceCompleted) setStep(1)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('crm_connected')
      params.delete('crm_provider')
      const query = params.toString()
      router.replace(query ? `${ROUTES.onboarding}?${query}` : ROUTES.onboarding, {
        scroll: false,
      })
    } else if (connected === 'error' && provider === 'hubspot') {
      toast.error('HubSpot-Verbindung fehlgeschlagen.')
      const params = new URLSearchParams(searchParams.toString())
      params.delete('crm_connected')
      params.delete('crm_provider')
      const query = params.toString()
      router.replace(query ? `${ROUTES.onboarding}?${query}` : ROUTES.onboarding, {
        scroll: false,
      })
    }
  }, [searchParams, router, workspaceCompleted])

  const runTransition = React.useCallback(
    (mode: 'forward' | 'complete', nextStep: number | null, after?: () => void) => {
      if (transitioningRef.current) return
      transitioningRef.current = true

      if (mode === 'forward') {
        setTransition('exit-left')
        window.setTimeout(() => {
          if (nextStep != null) setStep(nextStep)
          setTransition('enter-right')
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              setTransition('idle')
              transitioningRef.current = false
              after?.()
            })
          })
        }, TRANSITION_MS)
        return
      }

      setTransition('exit-up')
      window.setTimeout(() => {
        transitioningRef.current = false
        after?.()
      }, COMPLETE_MS)
    },
    []
  )

  function goToStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= ONBOARDING_STEP_COUNT) return
    if (nextStep > 0 && !workspaceCompleted) return
    if (nextStep === step) return

    if (step === 2 && nextStep < 2) {
      setInvites((current) => normalizeTeamInvitesOnBack(current))
    }

    runTransition('forward', nextStep)
  }

  const handleWorkspaceNext = async () => {
    setSavingWorkspace(true)
    const res = await finalizeWorkspaceAndProfile({
      inviteToken,
      organizationName: workspace.organizationName,
      logoDataUrl: null,
      role: isInvite ? null : 'admin',
      fullName: joinFullName(workspace.firstName, workspace.lastName),
      phone: '',
    })
    setSavingWorkspace(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setWorkspaceCompleted(true)
    runTransition('forward', 1)
  }

  const finishOnboarding = React.useCallback(
    (sendInvites: boolean) => {
      const complete = () => router.push(ROUTES.homeWelcome)

      if (!sendInvites) {
        runTransition('complete', null, complete)
        return
      }

      setSending(true)
      const valid = invites
        .map((x) => ({ ...x, email: x.email.trim() }))
        .filter((x) => x.email.length > 0)

      if (!valid.length) {
        setSending(false)
        runTransition('complete', null, complete)
        return
      }

      void sendTeamInvites(valid).then((res) => {
        setSending(false)
        if (!res.success) {
          toast.error(res.error)
          return
        }

        if (res.invited === 0) {
          runTransition('complete', null, complete)
          return
        }

        if (res.emailsSent === res.invited) {
          toast.success(
            res.emailsSent === 1
              ? '1 Einladung wurde per E-Mail versendet.'
              : `${res.emailsSent} Einladungen wurden per E-Mail versendet.`
          )
        } else if (res.emailsSent > 0) {
          toast.warning(
            `${res.emailsSent} von ${res.invited} Einladungen per E-Mail versendet.`,
            {
              description:
                'Die übrigen Einladungen sind gespeichert. Links können Sie unter Einstellungen → Team kopieren.',
              duration: 14_000,
            }
          )
        } else {
          const firstFailure = res.failures[0]
          toast.warning(COPY.settings.teamInviteSavedEmailFailed, {
            description: humanizeTeamInviteEmailError(firstFailure?.emailError),
            duration: 14_000,
            action: firstFailure
              ? {
                  label: COPY.settings.teamInviteCopyLink,
                  onClick: () => {
                    void navigator.clipboard.writeText(firstFailure.fallbackInviteLink)
                    toast.success(COPY.settings.teamInviteLinkCopied)
                  },
                }
              : undefined,
          })
        }

        runTransition('complete', null, complete)
      })
    },
    [invites, router, runTransition]
  )

  return (
    <OnboardingShell
      stepIndex={step}
      stepCount={ONBOARDING_STEP_COUNT}
      title={stepMeta.title}
      subtitle={stepMeta.subtitle}
      brandContent={{
        title: brandMeta.title,
        description: 'description' in brandMeta ? brandMeta.description : undefined,
        bullets: 'bullets' in brandMeta ? [...brandMeta.bullets] : undefined,
      }}
      transition={transition}
      onBack={step > 0 ? () => goToStep(step - 1) : undefined}
    >
      {step === 0 ? (
        <WorkspaceStep
          value={workspace}
          onChange={setWorkspace}
          onNext={handleWorkspaceNext}
          disabled={savingWorkspace}
          isInvite={isInvite}
        />
      ) : null}

      {step === 1 ? (
        <CrmConnectStep
          hubspotConfigured={hubspotConfigured}
          onSkip={() => runTransition('forward', 2)}
        />
      ) : null}

      {step === 2 ? (
        <TeamStep
          invites={invites}
          onChange={setInvites}
          onSkip={() => finishOnboarding(false)}
          onFinish={() => finishOnboarding(true)}
          sending={sending}
        />
      ) : null}
    </OnboardingShell>
  )
}
