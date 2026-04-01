"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Stepper } from "./steps/stepper"
import { WorkspaceStep, type WorkspaceStepValue } from "./steps/workspace-step"
import { ReferenceStep, type ExtractedReferencePreview } from "./steps/reference-step"
import { TeamStep, type TeamInviteRow } from "./steps/team-step"
import { extractReferencePreview, finalizeWorkspaceAndProfile, sendTeamInvites } from "./wizard-actions"
import { ROUTES } from "@/lib/routes"

export function OnboardingWizard({
  inviteToken,
  inviteOrganizationName,
}: {
  inviteToken: string | null
  inviteOrganizationName: string | null
}) {
  const router = useRouter()
  const isInvite = Boolean(inviteToken && inviteOrganizationName)

  const steps = ["Arbeitsbereich", "Erste Referenz", "Team"]
  const [step, setStep] = React.useState(0)

  const [workspace, setWorkspace] = React.useState<WorkspaceStepValue>({
    organizationName: inviteOrganizationName ?? "",
    logoDataUrl: null,
    role: "account_manager",
  })

  const [referencePreview, setReferencePreview] = React.useState<ExtractedReferencePreview | null>(null)
  const [extracting, setExtracting] = React.useState(false)

  const [invites, setInvites] = React.useState<TeamInviteRow[]>([
    { email: "", role: "account_manager" },
  ])
  const [sending, setSending] = React.useState(false)

  const [savingWorkspace, setSavingWorkspace] = React.useState(false)

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1))

  const handleWorkspaceNext = async () => {
    setSavingWorkspace(true)
    const res = await finalizeWorkspaceAndProfile({
      inviteToken,
      organizationName: workspace.organizationName,
      logoDataUrl: workspace.logoDataUrl,
      role: isInvite ? null : workspace.role,
    })
    setSavingWorkspace(false)
    if (!res.success) {
      alert(res.error)
      return
    }
    next()
  }

  const handleExtract = async (file: File) => {
    setExtracting(true)
    const res = await extractReferencePreview(file)
    setExtracting(false)
    if (!res.success) {
      alert(res.error)
      return
    }
    setReferencePreview(res.preview)
  }

  const handleTeamFinish = async () => {
    setSending(true)
    const valid = invites
      .map((x) => ({ ...x, email: x.email.trim() }))
      .filter((x) => x.email.length > 0)
      .slice(0, 3)

    if (valid.length) {
      const res = await sendTeamInvites(valid)
      if (!res.success) {
        setSending(false)
        alert(res.error)
        return
      }
    }

    setSending(false)
    router.push(ROUTES.home)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl">Onboarding</CardTitle>
          <Stepper steps={steps} current={step} />
        </CardHeader>
        <CardContent>
          {step === 0 ? (
            <WorkspaceStep
              value={workspace}
              onChange={setWorkspace}
              onNext={handleWorkspaceNext}
              disabled={savingWorkspace}
              isInvite={isInvite}
              inviteOrganizationName={inviteOrganizationName}
            />
          ) : null}

          {step === 1 ? (
            <ReferenceStep
              preview={referencePreview}
              extracting={extracting}
              onExtract={handleExtract}
              onSkip={next}
              onNext={next}
            />
          ) : null}

          {step === 2 ? (
            <TeamStep
              invites={invites}
              onChange={setInvites}
              onSkip={() => router.push(ROUTES.home)}
              onFinish={handleTeamFinish}
              sending={sending}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

