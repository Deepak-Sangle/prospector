import type { AllMiddlewareArgs, BlockButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { prisma } from '../../db/client.ts';
import { PLATFORM_LABEL } from '../../integrations/slugs.ts';
import { REPLY_INPUT_ACTION, REPLY_INPUT_BLOCK } from '../../slack/blocks.ts';
import { sendReply } from '../../slack/send-reply.ts';
import { formatError } from '../../util/error.ts';
import { resolveInstallKey } from '../../util/slack.ts';

/**
 * Handle the "Send reply" button on a lead card. Reads the (possibly edited)
 * reply text out of the message's input block and posts it back to the source
 * platform via the clicking user's connected account. Prompts the user to
 * connect the platform when no account is linked yet.
 */
export async function handleSendReply({
  ack,
  body,
  client,
  logger,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>): Promise<void> {
  await ack();

  try {
    const resultId = body.actions.at(0)?.value;
    const channelId = body.channel?.id;
    const userId = body.user.id;
    if (resultId == null || channelId == null) return;

    const slackInstallId = resolveInstallKey({
      teamId: body.team?.id,
      enterpriseId: body.enterprise?.id,
      isEnterpriseInstall: body.is_enterprise_install,
    });
    if (slackInstallId == null) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: 'Could not determine your workspace.',
      });
      return;
    }

    // The edited reply text lives in the message's input block state.
    const editedText = body.state?.values?.[REPLY_INPUT_BLOCK]?.[REPLY_INPUT_ACTION]?.value ?? '';
    if (editedText.trim().length === 0) {
      await client.chat.postEphemeral({ channel: channelId, user: userId, text: 'The reply is empty — nothing sent.' });
      return;
    }

    const result = await prisma.monitorResult.findUnique({ where: { id: resultId } });
    if (result == null) {
      await client.chat.postEphemeral({ channel: channelId, user: userId, text: 'That lead no longer exists.' });
      return;
    }

    const outcome = await sendReply({
      slackInstallId,
      slackUserId: userId,
      platform: result.platform,
      externalId: result.externalId,
      url: result.url,
      text: editedText,
    });

    if (outcome.type === 'no_account') {
      const label = PLATFORM_LABEL[outcome.platform];
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: `You haven't connected your ${label} account yet. DM me "connect ${outcome.platform}" and I'll send you an authorization link.`,
      });
      return;
    }
    if (outcome.type === 'error') {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: `:warning: Couldn't send the reply: ${outcome.error}`,
      });
      return;
    }

    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `:white_check_mark: Reply posted to ${PLATFORM_LABEL[result.platform]}.`,
    });
  } catch (e) {
    logger.error(`Failed to send reply: ${formatError(e)}`);
  }
}
