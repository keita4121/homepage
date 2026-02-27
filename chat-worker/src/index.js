export default {
  async fetch(request, env) {
    // CORS
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    try {
      const { name, email, message } = await request.json();

      if (!name || !email) {
        return Response.json({ error: 'name and email are required' }, { status: 400, headers: corsHeaders });
      }

      if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) {
        return Response.json({ error: 'Worker is not configured' }, { status: 500, headers: corsHeaders });
      }

      // 1. Slack Connect招待を送信
      const inviteRes = await fetch('https://slack.com/api/conversations.inviteShared', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: env.SLACK_CHANNEL_ID,
          emails: [email],
          external_limited: false,
        }),
      });

      const inviteData = await inviteRes.json();

      if (!inviteRes.ok || !inviteData.ok) {
        console.error('Slack invite failed:', inviteData.error);
        const statusMap = {
          already_in_team: 409,
          already_invited: 409,
          invalid_email: 400,
          channel_not_found: 404,
          method_not_supported_for_channel_type: 422,
          email_domain_not_allowed: 403,
          restricted_action: 403,
          missing_scope: 500,
          invalid_auth: 500,
          not_allowed_token_type: 500,
        };
        const detail = inviteData.error || `http_${inviteRes.status}`;
        return Response.json(
          { error: 'Slack invite failed', detail },
          { status: statusMap[detail] || 502, headers: corsHeaders },
        );
      }

      // 2. チャンネルに訪問者情報を通知
      if (message) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: env.SLACK_CHANNEL_ID,
            text: `*新しいチャット相談*\n>*お名前:* ${name}\n>*メール:* ${email}\n>*相談内容:* ${message || '(未記入)'}`,
          }),
        });
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    } catch (err) {
      console.error('Worker error:', err);
      return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders });
    }
  },
};
