/**
 * Resolve the stable Slack install key: the enterprise ID for org-wide
 * Enterprise Grid installs, otherwise the team ID. Matches
 * Organization.slackInstallId / SlackInstallation.slackInstallId.
 */
export function resolveInstallKey({
  teamId,
  enterpriseId,
  isEnterpriseInstall,
}: {
  teamId: string | null | undefined;
  enterpriseId: string | null | undefined;
  isEnterpriseInstall: boolean | undefined;
}): string | null {
  return (isEnterpriseInstall ? enterpriseId : teamId) ?? null;
}
