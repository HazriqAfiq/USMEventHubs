
"use client";

import React from "react";
import { formatDistanceToNow } from 'date-fns';
import { Crown, Pin } from 'lucide-react';

interface Props {
  message: any;
  isOwn?: boolean;
  isEventOrganizer?: boolean;
  profile?: any;
  onTogglePin?: (id: string, current: boolean | undefined) => void;
}

export default function ChatMessage({ message, isOwn, isEventOrganizer, profile, onTogglePin }: Props) {
  const timeAgo = message.createdAt?.toDate ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : '';

  return (
    <div className={`flex items-end ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}> 
      {!isOwn && (
        <img src={profile?.photoURL || message.senderPhotoURL || '/images/default-avatar.svg'} alt={profile?.name || message.senderName || 'avatar'} className="h-10 w-10 rounded-full mr-3 object-cover" />
      )}
      <div className={`max-w-[82%] px-4 py-3 rounded-lg ${isOwn ? 'bg-violet-400 text-white rounded-tl-2xl rounded-br-lg rounded-tr-lg' : 'bg-neutral-800 text-gray-100 rounded-tr-2xl rounded-bl-lg rounded-br-lg'}`}>
        <div className="flex items-center gap-2">
          <div className={`text-sm font-semibold ${isOwn ? 'text-white' : ''}`}>{profile?.name || message.senderName || 'Unknown'}</div>
          {message.pinned && (
            <div className="ml-2 px-2 py-1 rounded-md bg-yellow-600 text-white text-xs font-medium flex items-center gap-1">
              <Pin className="h-3 w-3" /> Pinned
            </div>
          )}
          {isEventOrganizer && (
            <button onClick={() => onTogglePin?.(message.id, !!message.pinned)} className="ml-2 text-xs text-neutral-200 bg-transparent hover:opacity-80 px-2 py-1 rounded-md">
              {message.pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {isEventOrganizer && (
            <div className="ml-2 flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-purple-700 text-white font-medium">
              <Crown className="h-3 w-3" /> Organizer
            </div>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap mt-2">{message.text}</div>
        <div className={`text-xs mt-2 text-right ${isOwn ? 'text-white opacity-80' : 'text-gray-300'}`}>{timeAgo}</div>
      </div>

      {isOwn && (
        <img src={profile?.photoURL || message.senderPhotoURL || '/images/default-avatar.svg'} alt={profile?.name || message.senderName || 'avatar'} className="h-8 w-8 rounded-full ml-3 object-cover" />
      )}
    </div>
  );
}
