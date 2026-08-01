-- Privacy-safe event-chat reactions returned through the trusted message read model.

create or replace function ruckus_private.get_event_messages(
  target_event_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  safe_page_size integer := greatest(1, least(coalesce(page_size, 30), 100));
  result jsonb;
begin
  if not ruckus_private.can_access_event_chat(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_CHAT_ACCESS_DENIED';
  end if;

  with page as (
    select
      message.id,
      message.event_id,
      message.sender_id,
      message.kind,
      case when message.removed_at is null then message.body else 'Message removed' end as body,
      message.reply_to_id,
      message.client_id,
      message.removed_at,
      message.created_at,
      case
        when message.sender_id is null then 'Ruckus'
        when sender.deletion_requested_at is not null then 'Deleted user'
        else sender.display_name
      end as sender_name,
      case
        when message.sender_id is null or sender.deletion_requested_at is not null then null
        else sender.avatar_path
      end as sender_avatar_path,
      case when message.removed_at is not null then '[]'::jsonb else coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'reaction', grouped.reaction,
            'count', grouped.reaction_count,
            'reactedByMe', grouped.reacted_by_me
          ) order by grouped.reaction
        )
        from (
          select
            reaction.reaction,
            count(*) as reaction_count,
            bool_or(reaction.profile_id = actor_id) as reacted_by_me
          from public.event_message_reactions as reaction
          where reaction.message_id = message.id
          group by reaction.reaction
        ) as grouped
      ), '[]'::jsonb) end as reactions
    from public.event_messages as message
    left join public.profiles as sender on sender.id = message.sender_id
    where message.event_id = target_event_id
      and (
        message.sender_id is null
        or not public.is_blocked_between(actor_id, message.sender_id)
      )
      and (
        before_created_at is null
        or (message.created_at, message.id) < (before_created_at, before_id)
      )
    order by message.created_at desc, message.id desc
    limit safe_page_size
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'eventId', event_id,
      'senderId', sender_id,
      'senderName', sender_name,
      'senderAvatarPath', sender_avatar_path,
      'kind', kind,
      'body', body,
      'replyToId', reply_to_id,
      'clientId', client_id,
      'removedAt', removed_at,
      'createdAt', created_at,
      'reactions', reactions
    ) order by created_at desc, id desc
  ), '[]'::jsonb) into result from page;

  return result;
end;
$$;

create or replace function ruckus_private.set_event_message_reaction(
  target_message_id uuid,
  reaction_value text,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  message_record public.event_messages%rowtype;
begin
  select * into message_record
  from public.event_messages
  where id = target_message_id;

  if actor_id is null
    or message_record.id is null
    or message_record.removed_at is not null
    or message_record.kind = 'system'
    or not ruckus_private.can_access_event_chat(message_record.event_id, actor_id)
  then
    raise exception using errcode = '42501', message = 'EVENT_REACTION_NOT_ALLOWED';
  end if;
  if reaction_value not in ('👍', '❤️', '😂', '🎉', '❗') then
    raise exception using errcode = '22023', message = 'INVALID_EVENT_REACTION';
  end if;

  if enabled then
    insert into public.event_message_reactions (message_id, profile_id, reaction)
    values (target_message_id, actor_id, reaction_value)
    on conflict (message_id, profile_id, reaction) do nothing;
  else
    delete from public.event_message_reactions
    where message_id = target_message_id
      and profile_id = actor_id
      and reaction = reaction_value;
  end if;
end;
$$;

create or replace function public.set_event_message_reaction(
  target_message_id uuid,
  reaction_value text,
  enabled boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.set_event_message_reaction(
    target_message_id,
    reaction_value,
    enabled
  );
$$;

revoke all on function ruckus_private.set_event_message_reaction(uuid, text, boolean)
from public, anon;
grant execute on function ruckus_private.set_event_message_reaction(uuid, text, boolean)
to authenticated;
revoke all on function public.set_event_message_reaction(uuid, text, boolean)
from public, anon;
grant execute on function public.set_event_message_reaction(uuid, text, boolean)
to authenticated;
