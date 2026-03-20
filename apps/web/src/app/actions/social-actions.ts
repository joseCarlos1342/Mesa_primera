"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetch Leaderboard Data
 */
export async function getLeaderboard(period: string, category: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_period: period,
    p_category: category,
  });

  if (error) {
    console.error("Error fetching leaderboard", error);
    return [];
  }
  return data;
}


/**
 * Search users by name, username or phone
 */
export async function searchUsers(query: string) {
  if (!query || query.length < 3) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, level, phone")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .neq("id", user.id)
    .limit(10);

  if (error) {
    console.error("Error searching users", error);
    return [];
  }
  return data;
}

/**
 * Fetch all friendships (includes pending requests received/sent and accepted friends)
 */
export async function getFriendships() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { friends: [], pendingIncoming: [], pendingOutgoing: [] };

  // Note: Friendship records are in friendships table. We must check both user_id = me OR friend_id = me.
  const { data, error } = await supabase
    .from("friendships")
    .select(`
      id,
      status,
      user_id,
      friend_id,
      user:profiles!user_id(id, username, avatar_url, level),
      friend:profiles!friend_id(id, username, avatar_url, level),
      nickname_for_friend,
      nickname_for_user
    `)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) {
    console.error("Error fetching friendships", error);
    return { friends: [], pendingIncoming: [], pendingOutgoing: [] };
  }

  const friends: any[] = [];
  const pendingIncoming: any[] = [];
  const pendingOutgoing: any[] = [];

  data.forEach((f) => {
    const isInitiator = f.user_id === user.id;
    const profile = isInitiator ? f.friend : f.user;

    if (f.status === "accepted") {
      friends.push({ 
        friendshipId: f.id, 
        profile, 
        nickname: isInitiator ? f.nickname_for_friend : f.nickname_for_user
      });
    } else if (f.status === "pending") {
      if (isInitiator) {
        pendingOutgoing.push({ friendshipId: f.id, profile });
      } else {
        pendingIncoming.push({ friendshipId: f.id, profile });
      }
    }
  });

  return { friends, pendingIncoming, pendingOutgoing };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(friendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (user.id === friendId) return { error: "No puedes amigarte a ti mismo" };

  // Insert friendship. If there's a unique constraint error, they might be already friends.
  const { error } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: friendId,
    status: "pending",
  });

  revalidatePath("/friends");

  if (!error) {
    // Create notification for receiver
    const senderName = user.user_metadata?.username || user.email?.split('@')[0] || "Alguien";
    await createNotification(friendId, "friend_request", "Solicitud de Amistad", `${senderName} quiere ser tu amigo.`, { senderId: user.id });
  }

  return { success: !error };
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Only the receiver (friend_id) can accept
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("friend_id", user.id);

  if (error) {
    console.error("Error accepting friend request", error);
    return { error: "Error al aceptar." };
  }

  revalidatePath("/friends");

  // Get original initiator to notify them
  const { data: friendship } = await supabase
    .from("friendships")
    .select("user_id")
    .eq("id", friendshipId)
    .single();

  if (friendship) {
    const myName = user.user_metadata?.username || user.email?.split('@')[0] || "Alguien";
    await createNotification(friendship.user_id, "friend_accepted", "Solicitud Aceptada", `${myName} ha aceptado tu solicitud de amistad.`, { friendId: user.id });
  }

  return { success: true };
}

/**
 * Decline/Cancel a friend request, or remove friend
 */
export async function removeFriendship(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // User must be either user_id or friend_id part of this friendship
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) {
    console.error("Error removing friendship", error);
    return { error: "Error al eliminar." };
  }

  revalidatePath("/friends");
  return { success: true };
}

/**
 * NOTIFICATIONS
 */
async function createNotification(userId: string, type: string, title: string, body: string, data?: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      body,
      data
    });
  if (error) console.error("Error creating notification", error);
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data;
}

export async function markNotificationAsRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  
  revalidatePath("/");
  return { success: !error };
}

export async function deleteNotification(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  revalidatePath("/");
  return { success: !error };
}

/**
 * DIRECT MESSAGING
 */
export async function sendDirectMessage(receiverId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content
    })
    .select()
    .single();

  if (error) return { error: "Error al enviar mensaje" };

  // Create notification for receiver
  const myName = user.user_metadata?.username || user.email?.split('@')[0] || "Alguien";
  await createNotification(receiverId, 'direct_message', 'Mensaje Nuevo', `${myName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`, { senderId: user.id });

  return { success: true, message: data };
}

export async function getDirectMessages(otherUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching DMs", error);
    return [];
  }
  return data;
}

/**
 * Update friend nickname
 */
export async function updateFriendNickname(friendshipId: string, nickname: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Check if current user is user_id or friend_id in this row
  const { data: friendship } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("id", friendshipId)
    .single();

  if (!friendship) return { error: "Amistad no encontrada" };

  const isInitiator = friendship.user_id === user.id;
  const updateData = isInitiator 
    ? { nickname_for_friend: nickname } 
    : { nickname_for_user: nickname };

  const { error } = await supabase
    .from("friendships")
    .update(updateData)
    .eq("id", friendshipId)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`); // Security check

  if (error) return { error: "Error al actualizar apodo" };
  
  revalidatePath("/friends");
  return { success: true };
}

/**
 * Invite friend to play
 */
export async function inviteToPlay(friendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Get current user's profile for the notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const senderName = profile?.username || "Un amigo";

  // Create a notification for the friend
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: friendId,
      type: "game_invite",
      title: "🎮 ¡Invitación a Jugar!",
      body: `${senderName} te ha invitado a una mesa. ¡Únete ahora!`,
      data: { senderId: user.id }
    });

  if (error) return { error: "Error al enviar invitación" };
  return { success: true };
}
